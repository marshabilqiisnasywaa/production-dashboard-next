from calendar import monthrange
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ScorecardArchive
from app.schemas import ArchivedDmScoreOut, PapercardKpiDayOut, ScorecardEntryOut, ScorecardLeaderOut, ScorecardReportOut, StandupKpiDayOut
from app.services.scorecard import scorecard_entries
from app.services.scorecard_identity import normalize


def has_recorded_data(entry):
    return (
        any(day.source == "excel" or any(check.submitted for check in day.checks) for day in entry.papercard)
        or any(day.source == "excel" or any(meeting.held or meeting.present for meeting in day.meetings) for day in entry.standup)
        or any(day.final for day in entry.sqdip)
    )


def operational_dm_scores(entries):
    groups = {}
    for entry in entries:
        groups.setdefault((entry.info.workshop_name, entry.info.dm_name or "Tanpa DM"), []).append(entry)
    result = []
    for (workshop, dm), members in groups.items():
        scores = []
        for field in ("papercard", "standup", "sqdip"):
            by_line = {}
            for member in members:
                for day in getattr(member, field):
                    if day.total is None or field == "sqdip" and not day.final:
                        continue
                    by_line.setdefault(member.info.line_code, {}).setdefault(day.date, []).append(day.total)
            line_scores = [sum(sum(values) / len(values) for values in days.values()) / len(days) for days in by_line.values()]
            scores.append(sum(line_scores) / len(line_scores) if line_scores else 0)
        leader = max(members, key=lambda member: member.before + member.current + member.after).info.leader_name
        result.append(ArchivedDmScoreOut(dm=dm, workshop_name=workshop, leader=leader,
            before=scores[0], current=scores[1], after=scores[2], total=sum(scores)))
    return result


def average_monthly_reports(db, start, end, today):
    month = start.replace(day=1)
    reports = []
    while month <= end:
        last = month.replace(day=monthrange(month.year, month.month)[1])
        report = scorecard_report(db, max(start, month), min(end, last), today)
        if report.archive_month or any(has_recorded_data(entry) for entry in report.entries):
            reports.append((month, report))
        month = date(month.year + (month.month == 12), month.month % 12 + 1, 1)
    leader_groups, dm_groups, aliases = {}, {}, {}
    for month, report in reports:
        for entry in report.entries:
            if not report.archive_month and not has_recorded_data(entry):
                continue
            info = entry.info
            identity = (info.workshop_name, info.line_code, normalize(info.leader_name), normalize(info.dm_name or ""))
            leader_groups.setdefault(identity, []).append(entry)
            aliases[(month, entry.key)] = f"period:{identity!r}"
        monthly_dms = report.archived_dm_scores if report.archive_month else operational_dm_scores(report.entries)
        for dm in monthly_dms:
            dm_groups.setdefault((dm.workshop_name, normalize(dm.dm)), []).append(dm)
    entries = []
    for identity, members in leader_groups.items():
        mean = lambda field: sum(getattr(member, field) for member in members) / len(members)
        entries.append(members[-1].model_copy(update={
            "key": f"period:{identity!r}", "before": mean("before"), "current": mean("current"), "after": mean("after"),
            "total": sum(member.total if member.total is not None else member.before + member.current + member.after for member in members) / len(members),
            "papercard": [day for member in members for day in member.papercard],
            "standup": [day for member in members for day in member.standup],
            "sqdip": [day for member in members for day in member.sqdip],
        }))
    entries.sort(key=lambda entry: (-entry.total, entry.key))
    for rank, entry in enumerate(entries, 1):
        entry.archive_rank = rank
    dm_scores = []
    for members in dm_groups.values():
        values = {field: sum(getattr(member, field) for member in members) / len(members)
                  for field in ("before", "current", "after", "total")}
        dm_scores.append(members[-1].model_copy(update=values))
    dm_scores.sort(key=lambda row: (-row.total, row.workshop_name, row.dm))
    for rank, dm in enumerate(dm_scores, 1):
        dm.rank = rank
    details = []
    for month, report in reports:
        for detail in report.details:
            details.append(detail.model_copy(update={
                "key": f"{detail.key}:{month:%Y-%m}",
                "archive_key": aliases.get((month, detail.archive_key or detail.key)),
            }))
    archives = [report for _, report in reports if report.archive_month]
    files = list(dict.fromkeys(report.archive_file for report in archives if report.archive_file))
    return ScorecardReportOut(entries=entries, details=details, archived_dm_scores=dm_scores,
        archive_month=archives[0].archive_month if archives else None, archive_file="; ".join(files) or None,
        averaged_months=[month for month, _ in reports])


def supporting_details(archived, entries, original, start: date, end: date, today: date):
    stored = next((row.data["details"] for row in archived if row.data.get("details")), None)
    sqdip_only = [entry.model_copy(update={"key": f"{entry.key}:sqdip", "papercard": [], "standup": []}) for entry in original if entry.sqdip]
    if stored is None:
        return [entry.model_copy(update={"sqdip": []}) for entry in original if entry.papercard or entry.standup] + sqdip_only
    groups = {}
    status_rows = {}
    for row in stored:
        day = date.fromisoformat(row["date"])
        if not start <= day <= end:
            continue
        scope = row.get("scope", "leader")
        identity = (scope, row.get("dm") if scope == "dm" else row["line"], normalize(row["leader"]), row.get("dm"))
        candidates = [entry for entry in entries if normalize(entry.info.leader_name) == normalize(row["leader"])]
        dm_candidates = [entry for entry in archived if entry.scope == "dm" and normalize(entry.leader_name) == normalize(row["leader"])] if scope == "dm" else []
        exact_dm = [entry for entry in dm_candidates if normalize(entry.dm_name) == normalize(row.get("dm"))]
        dm_candidates = exact_dm or dm_candidates
        dm_archive = dm_candidates[0] if len(dm_candidates) == 1 else None
        if identity not in groups:
            workshop = candidates[0].info.workshop_name if candidates else "Tanpa Workshop"
            if dm_archive and dm_archive.data.get("area"):
                workshop = f"Workshop {dm_archive.data['area']}"
            info = ScorecardLeaderOut(line_id=0, line_code=row["line"], line_name=row["line"], model=None,
                workshop_id=0, workshop_name=workshop,
                dm_group_id=None, dm_name=dm_archive.dm_name if dm_archive else row.get("dm"), leader_id=0, leader_name=row["leader"], leader_photo_url=None, historical=True)
            groups[identity] = ScorecardEntryOut(scope=scope, key=f"archive-detail:{identity}", info=info,
                papercard=[], standup=[], sqdip=[], before=0, current=0, after=0)
        target = groups[identity]
        kind = row["kind"]
        if kind in ("papercard_status", "attendance"):
            status_rows[(identity, day, kind)] = row["statuses"]
            continue
        scores = row["scores"]
        common = dict(date=day, final=day < today, source="excel", leader_name=row["leader"], total=sum(scores))
        if kind == "papercard_kpi":
            target.papercard.append(PapercardKpiDayOut(**common, on_time=scores[0], registered=scores[1], closed=scores[2], checks=[]))
        elif kind == "standup_kpi":
            target.standup.append(StandupKpiDayOut(**common, attendance=scores[0], content=scores[1], close_loop=scores[2],
                                                 problems=None, problems_closed=None, meetings=[], source_scores=scores))
    for identity, group in groups.items():
        for field, kind in (("papercard", "papercard_status"), ("standup", "attendance")):
            for day in getattr(group, field):
                day.historical_statuses = status_rows.get((identity, day.date, kind), [])
        for (status_identity, day, kind), statuses in status_rows.items():
            if status_identity == identity and kind == "attendance" and all(d.date != day for d in group.standup):
                group.standup.append(StandupKpiDayOut(date=day, final=day < today, source="excel", leader_name=group.info.leader_name,
                    attendance=None, content=None, close_loop=None, total=None, problems=None, problems_closed=None,
                    meetings=[], historical_statuses=statuses, score_note="Detail attendance sumber tanpa rekap poin harian."))
    return list(groups.values()) + sqdip_only


def scorecard_report(db: Session, start: date, end: date, today: date) -> ScorecardReportOut:
    archived = list(db.scalars(select(ScorecardArchive).where(
        ScorecardArchive.month.between(start.replace(day=1), end.replace(day=1)),
    ).order_by(ScorecardArchive.source_rank, ScorecardArchive.id)))
    if not archived:
        entries = scorecard_entries(db, start, end, today)
        return ScorecardReportOut(entries=entries, details=entries)
    if start.replace(day=1) != end.replace(day=1):
        return average_monthly_reports(db, start, end, today)
    details = scorecard_entries(db, start, end, today)
    entries, dm_scores = [], []
    for row in archived:
        workshop = f"Workshop {row.data.get('area')}" if row.data.get("area") else "Tanpa Workshop"
        if row.scope == "dm":
            dm_scores.append(ArchivedDmScoreOut(dm=row.dm_name, workshop_name=workshop, leader=row.leader_name,
                before=row.before, current=row.current, after=row.after, total=row.total, rank=row.source_rank))
            continue
        entries.append(ScorecardEntryOut(key=f"archive:{row.id}", info=ScorecardLeaderOut(
            line_id=0, line_code=row.line_code, line_name=row.line_code, model=row.data.get("model"),
            workshop_id=0, workshop_name=workshop, dm_group_id=None, dm_name=row.dm_name,
            leader_id=row.data.get("leaderEmployeeId") or 0, leader_name=row.leader_name, leader_photo_url=None, historical=True,
        ), papercard=[], standup=[], sqdip=[], before=row.before, current=row.current, after=row.after, total=row.total, archive_rank=row.source_rank))
    details = supporting_details(archived, entries, details, start, end, today)
    for detail in details:
        if detail.scope == "dm":
            continue
        candidates = [entry for entry in entries if normalize(entry.info.leader_name) == normalize(detail.info.leader_name)]
        exact = [entry for entry in candidates if entry.info.line_code == detail.info.line_code]
        linked = exact if exact else candidates
        if len(linked) == 1:
            detail.archive_key = linked[0].key
            if detail.sqdip and not detail.papercard and not detail.standup:
                detail.info = detail.info.model_copy(update={"dm_name": linked[0].info.dm_name, "dm_group_id": None})
    return ScorecardReportOut(entries=entries, details=details, archived_dm_scores=dm_scores,
                              archive_month=archived[0].month, archive_file=archived[0].data.get("fileName"))
