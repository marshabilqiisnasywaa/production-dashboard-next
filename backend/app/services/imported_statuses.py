from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import HistoricalEntry, Line, ScorecardArchive


def list_imported_statuses(db: Session, start: date, end: date, kind: str, line: str | None = None):
    result = []
    archived_keys = set()
    seen = set()
    archives = db.scalars(select(ScorecardArchive).where(
        ScorecardArchive.month.between(start.replace(day=1), end.replace(day=1)),
    ).order_by(ScorecardArchive.id))
    for archive in archives:
        for index, row in enumerate(archive.data.get("details", [])):
            if row["kind"] != kind or not start.isoformat() <= row["date"] <= end.isoformat():
                continue
            if line and row["line"].casefold() != line.strip().casefold():
                continue
            scope = row.get("scope", "leader")
            identity = (kind, scope, row["date"], row["line"].casefold(), row["leader"].strip().casefold())
            key = (*identity, row.get("dm"), row["source_sheet"], row["source_row"])
            if key in seen:
                continue
            seen.add(key)
            archived_keys.add(identity)
            result.append({
                "id": f"archive:{archive.id}:{index}", "kind": kind, "scope": scope,
                "date": row["date"], "line": row["line"], "leader": row["leader"], "dm": row.get("dm"),
                "shift": archive.data.get("shift"), "sourceSheet": row["source_sheet"], "sourceRow": row["source_row"],
                "sourceFile": archive.data.get("fileName"), "data": {"scores": [], "statuses": row.get("statuses", [])},
            })
    query = select(HistoricalEntry, Line.code).join(Line, Line.id == HistoricalEntry.line_id).where(
        HistoricalEntry.kind == kind, HistoricalEntry.date.between(start, end),
    )
    for entry, code in db.execute(query):
        if line and code.casefold() != line.strip().casefold():
            continue
        identity = (kind, "leader", entry.date.isoformat(), code.casefold(), entry.leader_name.strip().casefold())
        if identity in archived_keys:
            continue
        result.append({
            "id": entry.id, "kind": kind, "scope": "leader", "date": entry.date.isoformat(),
            "line": code, "leader": entry.leader_name, "dm": entry.source_dm, "shift": entry.shift,
            "sourceSheet": entry.source_sheet, "sourceRow": entry.source_row, "data": entry.data,
        })
    return sorted(result, key=lambda row: (row["date"], row["line"], row["leader"], str(row["id"])), reverse=True)
