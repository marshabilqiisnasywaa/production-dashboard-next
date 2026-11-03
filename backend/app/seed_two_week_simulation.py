import argparse
import json
from collections import Counter
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from sqlalchemy import select, text

from app.db.session import SessionLocal, engine
from app.models import (
    DmMeetingAttendance, DmMeetingSession, DmMeetingSummary, Employee,
    LeaderAssignment, Line, PapercardSubmission, PapercardTemplate,
)
from app.services.joint_meetings import build_roster
from app.services.papercard_kpi import line_kpi, working_days
from app.services.standup_kpi import line_standup


JAKARTA = ZoneInfo("Asia/Jakarta")
SHIFT = "Shift 1"
MARKER = "[SIMULASI 2 MINGGU]"
MODELS = (PapercardSubmission, DmMeetingSession, DmMeetingAttendance, DmMeetingSummary)


def at(day, value):
    return datetime.combine(day, time.fromisoformat(value), tzinfo=JAKARTA)


def answers_for(template, finding):
    answers = []
    for category in template.template_data.get("categories", []):
        groups = category.get("groups") or [{"items": category.get("items", [])}]
        for group in groups:
            for item in group.get("items", []):
                rules = [rule for rule in (item.get("rule") or "").splitlines() if rule]
                per_rule = item.get("answerMode") != "item" and item.get("answerType") != "text" and rules
                for index, rule in enumerate(rules if per_rule else [None]):
                    ng = finding and not any(a["status"] == "NG" for a in answers) and item.get("answerType") != "text"
                    answers.append({
                        "itemId": f"{item['id']}#{index}" if per_rule else str(item["id"]),
                        "number": item.get("number"),
                        "title": f"{item.get('title', '')}: {rule}" if per_rule else item.get("title", ""),
                        "itemTitle": item.get("title", ""), "ruleText": rule, "rules": rules,
                        "groupTitle": group.get("title"), "categoryName": category.get("name"),
                        "status": "NG" if ng else "OK",
                        "textValue": "Pemeriksaan simulasi selesai" if item.get("answerType") == "text" else "",
                        "cause": f"{MARKER} Penyimpangan ditemukan saat pemeriksaan awal." if ng else "",
                        "solution": "Lakukan penyetelan dan verifikasi ulang sesuai SOP." if ng else "",
                    })
    return answers


def fingerprint(db, model, ids=None):
    query = select(model.__table__).order_by(model.id)
    if ids is not None:
        query = query.where(model.id.in_(ids))
    return {row["id"]: json.dumps(dict(row), default=str, sort_keys=True) for row in db.execute(query).mappings()}


def populate(db, start, end):
    counts = Counter()
    ids = {model.__tablename__: [] for model in MODELS}
    scenarios = Counter()
    gaps = set()
    days = list(working_days(db, start, end))
    employees = {e.id: e for e in db.scalars(select(Employee).where(Employee.is_active.is_(True)))}
    lines = list(db.scalars(select(Line).order_by(Line.id)))
    existing_cards = set(db.execute(select(PapercardSubmission.line_id, PapercardSubmission.date, PapercardSubmission.department)
        .where(PapercardSubmission.shift == SHIFT, PapercardSubmission.date.between(start, end))).all())
    existing_meetings = set(db.execute(select(DmMeetingSession.line_id, DmMeetingSession.date, DmMeetingSession.session_number)
        .where(DmMeetingSession.shift == SHIFT, DmMeetingSession.date.between(start, end))).all())

    def add(row):
        db.add(row)
        db.flush()
        counts[row.__tablename__] += 1
        ids[row.__tablename__].append(row.id)

    for line_index, line in enumerate(lines):
        roster = build_roster(db, [line.id])
        leader_id = db.scalar(select(LeaderAssignment.employee_id).where(
            LeaderAssignment.line_id == line.id, LeaderAssignment.kind == "line_leader",
            LeaderAssignment.ended_at.is_(None)))
        if leader_id not in employees or not roster:
            gaps.add(f"{line.code}: tidak ada leader aktif atau roster")
            continue
        members = {}
        for member in roster:
            employee = employees[member["employee_id"]]
            members.setdefault(employee.dept, employee)
        templates = list(db.scalars(select(PapercardTemplate).where(PapercardTemplate.line_id == line.id).order_by(PapercardTemplate.department)))
        for day_index, day in enumerate(days):
            variant = (day_index + line_index * 3) % 8
            for department_index, template in enumerate(templates):
                key = (line.id, day, template.department)
                if key in existing_cards:
                    counts["existing_papercards_preserved"] += 1
                    continue
                employee = members.get(template.department)
                if employee is None:
                    gaps.add(f"{line.code}: tidak ada anggota {template.department}")
                    continue
                if variant == 2 and department_index == 0:
                    scenarios["papercard_missing"] += 1
                    continue
                answers = answers_for(template, finding=variant != 5)
                if not answers:
                    gaps.add(f"{line.code}/{template.department}: checklist kosong")
                    continue
                late = variant == 1 and department_index == 0
                submitted = at(day, template.window_end) + timedelta(minutes=25) if late else at(day, template.window_start) + timedelta(minutes=5 + line_index * 4 + department_index)
                reviewer = employees.get(employee.supervisor_id)
                approval = "pending" if variant == 3 or reviewer is None else "rejected" if variant == 4 else "approved"
                approved = None if approval == "pending" else at(day + timedelta(days=1 if variant == 6 else 0), "16:00")
                ng = any(a["status"] == "NG" for a in answers)
                add(PapercardSubmission(
                    template_id=template.id, line_id=line.id, employee_id=employee.id,
                    department=template.department, date=day, shift=SHIFT, answers=answers,
                    abnormal_notes=f"{MARKER} {'Terlambat. ' if late else ''}{'Ada temuan NG.' if ng else 'Semua item normal.'}",
                    status="NG" if ng or late else "OK", submitted_at=submitted, created_at=submitted,
                    approval_status=approval, approved_by_id=reviewer.id if approved else None,
                    approved_at=approved, supervisor_notes=f"{MARKER} {approval}" if approved else None,
                ))
                existing_cards.add(key)
                scenarios[f"papercard_{approval}"] += 1
                scenarios["papercard_late" if late else "papercard_on_time"] += 1
            for number in (1, 2):
                key = (line.id, day, number)
                if key in existing_meetings:
                    counts["existing_meetings_preserved"] += 1
                    continue
                scheduled = at(day, "10:00" if number == 1 else "14:00") + timedelta(minutes=line_index * 30)
                held = not (variant == 4 and number == 2)
                started = scheduled + timedelta(minutes=12 if variant == 1 else 0)
                ended = started + timedelta(minutes=10)
                meeting = DmMeetingSession(
                    line_id=line.id, leader_id=leader_id, date=day, shift=SHIFT,
                    session_type=f"during_{number}", session_number=number,
                    label=f"{MARKER} Meeting {number}", scheduled_time=scheduled.strftime("%H:%M"),
                    status="completed" if held else "pending", meeting_scope="line", roster=roster,
                    started_at=started if held else None, ended_at=ended if held else None,
                    duration_seconds=600 if held else 0, created_at=scheduled, updated_at=ended if held else scheduled,
                )
                add(meeting)
                existing_meetings.add(key)
                scenarios["meeting_completed" if held else "meeting_not_held"] += 1
                if not held:
                    continue
                for member_index, member in enumerate(roster):
                    attendance_status = {2: "absent", 3: "sick", 7: "permit"}.get(variant, "present") if member_index == len(roster) - 1 and number == 1 else "present"
                    add(DmMeetingAttendance(
                        session_id=meeting.id, employee_id=member["employee_id"],
                        status=attendance_status, verification_method="manual", attended_at=started,
                        notes=f"{MARKER} {attendance_status}", note_by_id=leader_id, note_at=started,
                    ))
                    scenarios[f"attendance_{attendance_status}"] += 1
                if variant == 5:
                    scenarios["meeting_without_problem"] += 1
                    continue
                problem_status = "open" if variant == 3 else "in_progress" if variant == 7 else "resolved"
                resolved_at = at(day + timedelta(days=1 if variant == 6 else 0), "17:00") if problem_status == "resolved" else None
                pic = employees[roster[(number - 1) % len(roster)]["employee_id"]]
                add(DmMeetingSummary(
                    session_id=meeting.id, line_id=line.id, line_code=line.code,
                    problem=f"{MARKER} {day.isoformat()} sesi {number}: pemeriksaan kestabilan proses memerlukan tindak lanjut.",
                    problem_categories=["Quality"], solution="Periksa parameter, lakukan penyetelan dan verifikasi hasil.",
                    pic_name=pic.name, pic_id=pic.id, due_date=day.isoformat(), status=problem_status,
                    resolved_at=resolved_at, created_at=ended,
                ))
                scenarios[f"problem_{problem_status}"] += 1
    return {"created": dict(counts), "ids": ids, "scenarios": dict(scenarios), "gaps": sorted(gaps), "working_days": len(days)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--from", dest="start", type=date.fromisoformat, required=True)
    parser.add_argument("--to", dest="end", type=date.fromisoformat, required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    today = datetime.now(JAKARTA).date()
    if args.start > args.end or (args.end - args.start).days != 13 or args.end >= today:
        parser.error("Gunakan 14 hari kalender yang sudah berlalu.")
    if engine.url.host not in {"localhost", "127.0.0.1", "::1"}:
        parser.error("Seeder ini hanya untuk database lokal.")
    with SessionLocal() as db:
        db.execute(text("SELECT pg_advisory_xact_lock(20261103, 14)"))
        original = {m: fingerprint(db, m) for m in MODELS}
        report = populate(db, args.start, args.end)
        replay = populate(db, args.start, args.end)
        if any(replay["ids"].values()):
            raise RuntimeError("Idempotency check failed")
        for model, rows in original.items():
            if fingerprint(db, model, list(rows)) != rows:
                raise RuntimeError(f"Existing rows changed: {model.__tablename__}")
        report.update({"from": str(args.start), "to": str(args.end), "applied": args.apply, "idempotent": True, "existing_rows_unchanged": True})
        report["kpi"] = []
        for line in db.scalars(select(Line).order_by(Line.id)):
            paper = line_kpi(db, line.id, args.start, args.end, SHIFT, today)
            meetings = line_standup(db, line.id, args.start, args.end, SHIFT, today)
            report["kpi"].append({"line": line.code, "papercard_totals": dict(Counter(d.total for d in paper)), "meeting_totals": dict(Counter(d.total for d in meetings))})
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        if args.apply:
            db.commit()
        else:
            db.rollback()
        print(json.dumps({k: v for k, v in report.items() if k != "ids"}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
