from datetime import date

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ScorecardArchive
from app.schemas import ArchivedDmScoreOut, PapercardKpiDayOut, ScorecardEntryOut, ScorecardLeaderOut, ScorecardReportOut, StandupKpiDayOut
from app.services.scorecard import scorecard_entries
from app.services.scorecard_identity import normalize


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
        identity = (row["line"], normalize(row["leader"]), row.get("dm"))
        candidates = [entry for entry in entries if normalize(entry.info.leader_name) == normalize(row["leader"])]
        if identity not in groups:
            info = ScorecardLeaderOut(line_id=0, line_code=row["line"], line_name=row["line"], model=None,
                workshop_id=0, workshop_name=candidates[0].info.workshop_name if candidates else "Tanpa Workshop",
                dm_group_id=None, dm_name=row.get("dm"), leader_id=0, leader_name=row["leader"], leader_photo_url=None, historical=True)
            groups[identity] = ScorecardEntryOut(key=f"archive-detail:{identity}", info=info,
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
        raise HTTPException(422, "Rentang mencakup arsip final bulanan. Pilih satu bulan arsip agar nilai final tidak dicampur dengan periode lain.")
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
        candidates = [entry for entry in entries if normalize(entry.info.leader_name) == normalize(detail.info.leader_name)]
        exact = [entry for entry in candidates if entry.info.line_code == detail.info.line_code]
        linked = exact if exact else candidates
        if len(linked) == 1:
            detail.archive_key = linked[0].key
            if detail.sqdip and not detail.papercard and not detail.standup:
                detail.info = detail.info.model_copy(update={"dm_name": linked[0].info.dm_name, "dm_group_id": None})
    return ScorecardReportOut(entries=entries, details=details, archived_dm_scores=dm_scores,
                              archive_month=archived[0].month, archive_file=archived[0].data.get("fileName"))
