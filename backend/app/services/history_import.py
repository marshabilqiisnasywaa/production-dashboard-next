from datetime import date, datetime
import re
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DmGroup, Employee, HistoricalEntry, HistoryImportBatch, Line
from app.schemas_history_import import HistoryImportIn
from app.schemas import PapercardKpiDayOut, StandupKpiDayOut


def normalize_identity(value: str | None, dm: bool = False) -> str:
    text = " ".join((value or "").split()).casefold()
    match = re.fullmatch(r"(?:dm\s*)?0*(\d+)", text) if dm else None
    return f"dm {int(match.group(1))}" if match else text


def prepare_import(db: Session, payload: HistoryImportIn):
    today = datetime.now(ZoneInfo("Asia/Jakarta")).date()
    if payload.from_date > payload.to_date or payload.to_date >= today:
        raise HTTPException(400, "Pilih periode historis yang berakhir sebelum hari ini.")
    if (payload.to_date - payload.from_date).days > 365:
        raise HTTPException(400, "Maksimal rentang impor satu tahun per proses.")
    lines = {line.id: line for line in db.scalars(select(Line))}
    by_code = {line.code.strip().upper(): line for line in lines.values()}
    groups = {group.id: group.name for group in db.scalars(select(DmGroup))}
    names = {employee.name.strip().casefold() for employee in db.scalars(select(Employee))}
    existing = {
        (entry.kind, entry.line_id, entry.date, entry.shift): entry
        for entry in db.scalars(select(HistoricalEntry).where(
            HistoricalEntry.date >= payload.from_date,
            HistoricalEntry.date <= payload.to_date,
            HistoricalEntry.shift == payload.shift,
        ))
    }
    errors, warnings, prepared = [], [], []
    seen = {}
    identities = {}
    identity_conflicts = {}
    identity_conflict_fields = {}
    duplicates = 0
    for row in payload.rows:
        label = f"{row.source_sheet} baris {row.source_row}, {row.date}"
        if not payload.from_date <= row.date <= payload.to_date:
            errors.append(f"{label}: tanggal di luar periode pilihan.")
            continue
        code = row.line.strip().upper()
        if re.fullmatch(r"0+|[-–—]", code):
            errors.append(f"{label}: kode line {code} adalah penanda template, bukan line yang dapat dipetakan.")
            continue
        mapped = payload.mappings.get(code)
        line = lines.get(mapped) if mapped is not None else by_code.get(code)
        if line is None:
            errors.append(f"{label}: line {code} belum dipetakan ke master line.")
            continue
        key = (row.kind, line.id, row.date, payload.shift)
        identity_key = (line.id, row.date, payload.shift)
        identity = (normalize_identity(row.leader), normalize_identity(row.dm, dm=True))
        previous = identities.setdefault(identity_key, (identity, row))
        if previous[0] != identity:
            earlier = previous[1]
            differences = []
            if previous[0][0] != identity[0]:
                differences.append(f"leader '{row.leader}' berbeda dari '{earlier.leader}'")
            if previous[0][1] != identity[1]:
                differences.append(f"DM '{row.dm or 'kosong'}' berbeda dari '{earlier.dm or 'kosong'}'")
            conflict = f"{label}, line sumber {code} → {line.code}: {'; '.join(differences)} pada {earlier.source_sheet} baris {earlier.source_row}."
            if payload.identity_policy == "strict":
                errors.append(conflict + " Koreksi sumber atau pilih simpan identitas per sheet.")
                continue
            warnings.append(conflict + " Kedua identitas sumber dipertahankan; penempatan belum diverifikasi.")
            identity_conflicts.setdefault(identity_key, []).append(conflict)
            fields = identity_conflict_fields.setdefault(identity_key, set())
            if previous[0][0] != identity[0]:
                fields.add("leader")
            if previous[0][1] != identity[1]:
                fields.add("dm")
        data = {
            "scores": row.scores,
            "statuses": [item.model_dump(mode="json") for item in row.statuses],
            "importPeriod": {"from": payload.from_date.isoformat(), "to": payload.to_date.isoformat()},
        }
        if row.kind.endswith("_kpi"):
            limits = (8, 20, 8) if row.kind == "papercard_kpi" else (10, 20, 10)
            excess = [f"komponen {index + 1}: {score:g} > {limit}" for index, (score, limit) in enumerate(zip(row.scores, limits)) if score > limit]
            if excess:
                review = f"{label}, {line.code}: {'; '.join(excess)}. Nilai sumber diarsipkan, tetapi tidak dihitung dalam KPI sampai diverifikasi."
                data["scoreReview"] = [review]
                warnings.append(review)
        signature = (row.leader.strip(), data)
        if key in seen:
            if seen[key] != signature:
                errors.append(f"{label}: data bentrok untuk jenis, line, tanggal, dan shift yang sama.")
            else:
                duplicates += 1
            continue
        seen[key] = signature
        if row.leader.strip().casefold() not in names:
            warnings.append(f"{row.source_sheet}, {line.code}: leader {row.leader} disimpan sebagai nama historis; akun tidak dibuat otomatis.")
        if row.dm and row.dm.strip().casefold() != groups.get(line.dm_group_id, "").strip().casefold():
            warnings.append(f"{line.code}: DM Excel {row.dm} berbeda atau belum terhubung pada master line; label Excel dipertahankan.")
        if any(item.status is None for item in row.statuses):
            warnings.append(f"{label}: status kosong disimpan sebagai tidak diketahui.")
        if row.kind == "papercard_kpi" and row.scores[1] > 14:
            warnings.append(f"{label}: poin temuan melebihi bobot sistem saat ini; nilai Excel dipertahankan.")
        prepared.append((row, line, data, existing.get(key)))
    for row, line, data, _ in prepared:
        conflicts = identity_conflicts.get((line.id, row.date, payload.shift))
        if conflicts:
            data["mappingReview"] = conflicts
            data["mappingReviewFields"] = sorted(identity_conflict_fields[(line.id, row.date, payload.shift)])
    return prepared, errors, list(dict.fromkeys(warnings)), duplicates


def preview_import(db: Session, payload: HistoryImportIn) -> dict:
    prepared, errors, warnings, duplicates = prepare_import(db, payload)
    existing = sum(entry is not None for _, _, _, entry in prepared)
    return {
        "valid": len(prepared), "added": len(prepared) - existing,
        "existing": existing, "duplicates": duplicates,
        "errors": errors, "warnings": warnings,
    }


def commit_import(db: Session, payload: HistoryImportIn, username: str) -> dict:
    prepared, errors, _, duplicates = prepare_import(db, payload)
    if errors:
        raise HTTPException(400, errors[0])
    if not prepared:
        raise HTTPException(400, "Tidak ada data valid untuk disimpan.")
    batch = HistoryImportBatch(file_name=payload.file_name, imported_by=username, added=0, updated=0, skipped=duplicates)
    db.add(batch)
    db.flush()
    for row, line, data, entry in prepared:
        if entry is not None and payload.mode == "skip":
            batch.skipped += 1
            continue
        if entry is None:
            entry = HistoricalEntry(kind=row.kind, line_id=line.id, date=row.date, shift=payload.shift)
            db.add(entry)
            batch.added += 1
        else:
            batch.updated += 1
        entry.batch_id = batch.id
        entry.leader_name = row.leader.strip()
        entry.source_line = row.line.strip().upper()
        entry.source_dm = row.dm
        entry.source_sheet = row.source_sheet
        entry.source_row = row.source_row
        entry.data = data
    db.commit()
    return {"batchId": batch.id, "added": batch.added, "updated": batch.updated, "skipped": batch.skipped}


def historical_rows(db: Session, line_id: int, start: date, end: date, kind: str, shift: str):
    return list(db.scalars(select(HistoricalEntry).where(
        HistoricalEntry.line_id == line_id, HistoricalEntry.date >= start,
        HistoricalEntry.date <= end, HistoricalEntry.kind == kind, HistoricalEntry.shift == shift,
    ).order_by(HistoricalEntry.date)))


def merge_kpi(db: Session, line_id: int, start: date, end: date, shift: str, kind: str, days: list, today: date):
    papercard = kind == "papercard_kpi"
    schema = PapercardKpiDayOut if papercard else StandupKpiDayOut
    merged = {day.date: schema.model_validate(day).model_dump() for day in days}
    entries = list(db.scalars(select(HistoricalEntry).where(
        HistoricalEntry.line_id == line_id, HistoricalEntry.date >= start,
        HistoricalEntry.date <= end, HistoricalEntry.shift == shift,
    )))
    coverage = {
        (entry.data["importPeriod"]["from"], entry.data["importPeriod"]["to"])
        for entry in entries if entry.data.get("importPeriod")
    }
    live_dates = set()
    for day, current in list(merged.items()):
        has_live = any(check["submitted"] for check in current["checks"]) if papercard else any(
            meeting["held"] or meeting["present"] > 0 for meeting in current["meetings"]
        )
        if has_live:
            live_dates.add(day)
        elif any(first <= day.isoformat() <= last for first, last in coverage):
            del merged[day]
    detail_kind = "papercard_status" if papercard else "attendance"
    detail_entries = {entry.date: entry for entry in entries if entry.kind == detail_kind}
    statuses = {day: entry.data.get("statuses", []) for day, entry in detail_entries.items()}
    for entry in entries:
        if entry.kind != kind:
            continue
        if entry.date in live_dates:
            continue
        current = merged.get(entry.date)
        if current:
            has_live = any(check["submitted"] for check in current["checks"]) if papercard else any(
                meeting["held"] or meeting["present"] > 0 for meeting in current["meetings"]
            )
            if has_live:
                continue
        if entry.data.get("scoreReview"):
            if papercard:
                merged.pop(entry.date, None)
            else:
                merged[entry.date] = {
                    "date": entry.date, "final": entry.date < today, "source": "excel",
                    "leader_name": entry.leader_name, "attendance": None, "content": None,
                    "close_loop": None, "total": None, "meetings": [],
                    "problems": None, "problems_closed": None,
                    "historical_statuses": statuses.get(entry.date, []),
                    "score_note": " ".join(entry.data["scoreReview"]),
                    "source_scores": entry.data["scores"],
                }
            continue
        scores = entry.data["scores"]
        row = {
            "date": entry.date, "final": entry.date < today, "source": "excel",
            "leader_name": entry.leader_name, "total": sum(scores),
        }
        if papercard:
            row.update(on_time=scores[0], registered=scores[1], closed=scores[2], checks=[], historical_statuses=statuses.get(entry.date, []))
        else:
            row.update(attendance=scores[0], content=scores[1], close_loop=scores[2], meetings=[], problems=None, problems_closed=None, historical_statuses=statuses.get(entry.date, []))
        merged[entry.date] = row
    if not papercard:
        for day, entry in detail_entries.items():
            if day in merged or day in live_dates:
                continue
            merged[day] = {
                "date": day, "final": day < today, "source": "excel",
                "leader_name": entry.leader_name, "attendance": None, "content": None,
                "close_loop": None, "total": None, "meetings": [],
                "problems": None, "problems_closed": None,
                "historical_statuses": statuses[day],
                "score_note": "Attendance tersedia, tetapi rekap poin Standup Meeting tidak tersedia untuk tanggal dan line ini.",
            }
    result = [merged[day] for day in sorted(merged)]
    final = [row for row in result if row["final"] and row["total"] is not None]
    fields = ["on_time", "registered", "closed", "total"] if papercard else ["attendance", "content", "close_loop", "total"]
    average = {"days": len(final), **{field: round(sum(row[field] for row in final) / len(final), 2) for field in fields}} if final else None
    return result, average
