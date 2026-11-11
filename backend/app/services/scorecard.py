from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Employee, HistoricalEntry, LeaderAssignment, Line, SqdipEntry, Workshop
from app.schemas import PapercardKpiDayOut, ScorecardEntryOut, ScorecardLeaderOut, SqdipKpiDayOut, StandupKpiDayOut
from app.services import history_import, papercard_kpi, sqdip, standup_kpi
from app.services.scorecard_identity import assignment_on, normalize


def scorecard_entries(db: Session, start: date, end: date, today: date, shift: str = "Shift 1") -> list[ScorecardEntryOut]:
    employees = {e.id: e for e in db.scalars(select(Employee))}
    assignments = list(db.scalars(select(LeaderAssignment).where(LeaderAssignment.kind == "line_leader")))
    history = list(db.scalars(select(HistoricalEntry).where(
        HistoricalEntry.date >= start, HistoricalEntry.date <= end, HistoricalEntry.shift == shift,
    )))
    source_entries = list(db.scalars(select(SqdipEntry).where(SqdipEntry.date >= start, SqdipEntry.date <= end)))
    lines = {line.code: (line, workshop) for line, workshop in db.execute(
        select(Line, Workshop).join(Workshop, Workshop.id == Line.workshop_id)
    )}
    result: dict[tuple, ScorecardEntryOut] = {}

    def needs_dm_review(source):
        return "dm" in source.data.get("mappingReviewFields", []) or bool(
            source.data.get("mappingReview") and "mappingReviewFields" not in source.data
        )

    def historical_dm(line_id, day, name, leader_id):
        matching = [source for source in history if source.line_id == line_id and source.date == day and (
            (leader_id is not None and source.data.get("leaderEmployeeId") == leader_id)
            or normalize(source.leader_name) == normalize(name)
        )]
        names = {history_import.normalize_identity(source.source_dm, dm=True) for source in matching if source.source_dm}
        if len(names) != 1 or any(needs_dm_review(source) for source in matching):
            return None, True
        source_dm = next(source.source_dm for source in matching if source.source_dm)
        return source_dm, False

    def bucket(code, day, source_name=None, source_id=None, source_dm=None, review=False):
        line, workshop = lines.get(code, (None, None))
        owner = assignment_on([a for a in assignments if line and a.line_id == line.id], day)
        if source_name is None:
            leader_id = owner.employee_id if owner else 0
            name = (owner.leader_name_snapshot or employees[leader_id].name) if owner else "Leader belum terverifikasi"
        else:
            leader_id = source_id
            if leader_id is None and owner and normalize(source_name) in {
                normalize(owner.leader_name_snapshot or ""), normalize(employees[owner.employee_id].name),
            }:
                leader_id = owner.employee_id
            leader_id = leader_id or 0
            name = source_name
        matched = owner and owner.employee_id == leader_id
        dm_id = owner.dm_group_id if matched else None
        dm_name = "Perlu verifikasi DM" if review else source_dm or (owner.dm_name_snapshot if matched else None)
        identity = f"id:{leader_id}" if leader_id else f"name:{normalize(name)}"
        key = (line.id if line else code, identity, dm_id, history_import.normalize_identity(dm_name, dm=True) if dm_name else None)
        if key not in result:
            result[key] = ScorecardEntryOut(
                key=repr(key),
                info=ScorecardLeaderOut(
                    line_id=line.id if line else 0, line_code=code, line_name=line.name if line else code,
                    model=line.model if line else None, workshop_id=workshop.id if workshop else 0,
                    workshop_name=workshop.name if workshop else "Tanpa Workshop", dm_group_id=dm_id,
                    dm_name=dm_name, leader_id=leader_id, leader_name=name,
                    leader_photo_url=employees[leader_id].photo_url if leader_id in employees else None,
                    historical=line is None,
                ), papercard=[], standup=[], sqdip=[], before=0, current=0, after=0,
            )
        return result[key]

    for code, (line, _) in lines.items():
        line_history = [entry for entry in history if entry.line_id == line.id]
        for kind, service, field, schema in (
            ("papercard_kpi", papercard_kpi.line_kpi, "papercard", PapercardKpiDayOut),
            ("standup_kpi", standup_kpi.line_standup, "standup", StandupKpiDayOut),
        ):
            live = service(db, line.id, start, end, shift, today)
            days, _ = history_import.merge_kpi(db, line.id, start, end, shift, kind, live, today)
            for row in days:
                day = row["date"]
                if row.get("source") == "excel":
                    source = next((e for e in line_history if e.date == day and e.kind == kind), None)
                    if source is None:
                        source = next((e for e in line_history if e.date == day and e.kind == "attendance"), None)
                    target = bucket(code, day, row.get("leader_name"), source.data.get("leaderEmployeeId") if source else None,
                                    source.source_dm if source else None,
                                    bool(source and needs_dm_review(source)))
                else:
                    owner = assignment_on([a for a in assignments if a.line_id == line.id], day)
                    has_live = any(c["submitted"] for c in row["checks"]) if field == "papercard" else any(
                        m["held"] or m["present"] for m in row["meetings"])
                    if owner is None and not has_live:
                        continue
                    target = bucket(code, day)
                row["leader_name"] = target.info.leader_name
                getattr(target, field).append(schema.model_validate(row))

    grouped = {}
    for entry in source_entries:
        grouped.setdefault((entry.line_code, entry.date, entry.leader_employee_id, entry.leader_name), []).append(entry)
    for (code, day, leader_id, name), entries in grouped.items():
        line, _ = lines.get(code, (None, None))
        owner = assignment_on([a for a in assignments if line and a.line_id == line.id], day)
        matches_owner = owner and (owner.employee_id == leader_id or (leader_id is None and normalize(name) in {
            normalize(owner.leader_name_snapshot or ""), normalize(employees[owner.employee_id].name),
        }))
        source_dm, review = (None, False) if matches_owner else historical_dm(line.id if line else None, day, name, leader_id)
        target = bucket(code, day, name, leader_id, source_dm, review)
        dimensions = {entry.dimension: entry for entry in entries}
        points = {dimension.lower(): dimensions[dimension].points if dimension in dimensions else 0 for dimension in sqdip.DIMENSIONS}
        target.sqdip.append(SqdipKpiDayOut(date=day, leader=name, final=day < today, **points,
                                 total=sum(points.values()), actuals=[dimensions[d].actual if d in dimensions else None for d in sqdip.DIMENSIONS]))

    def mean(days, final_only=False):
        values = [d.total for d in days if (d.final or not final_only) and d.total is not None]
        return round(sum(values) / len(values), 2) if values else 0

    for entry in result.values():
        entry.before, entry.current, entry.after = mean(entry.papercard), mean(entry.standup), mean(entry.sqdip, final_only=True)
    return sorted(result.values(), key=lambda e: (e.info.workshop_name, e.info.line_code, e.info.leader_name, e.key))
