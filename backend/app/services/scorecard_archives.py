from calendar import monthrange
from datetime import date

from fastapi import HTTPException
from sqlalchemy import or_, select, text
from sqlalchemy.orm import Session

from app.models import DmMeetingAttendance, DmMeetingSession, PapercardSubmission, ScorecardArchive


def month_end(day: date) -> date:
    return day.replace(day=monthrange(day.year, day.month)[1])


def lock_period(db: Session, start: date, end: date) -> None:
    if db.get_bind().dialect.name != "postgresql":
        return
    month = start.replace(day=1)
    while month <= end:
        db.execute(text("SELECT pg_advisory_xact_lock(:namespace, :month)"), {"namespace": 734201, "month": month.year * 12 + month.month})
        month = date(month.year + (month.month == 12), month.month % 12 + 1, 1)


def ensure_historical_period(db: Session, start: date, end: date) -> None:
    lock_period(db, start, end)
    papercard = db.scalar(select(PapercardSubmission.id).where(PapercardSubmission.date.between(start, end)).limit(1))
    meetings = db.scalar(select(DmMeetingSession.id).where(
        DmMeetingSession.date.between(start, end), or_(
            DmMeetingSession.status.in_(("in_progress", "completed")), DmMeetingSession.started_at.is_not(None),
            select(DmMeetingAttendance.id).where(DmMeetingAttendance.session_id == DmMeetingSession.id).exists(),
        ),
    ).limit(1))
    if papercard is not None or meetings is not None:
        raise HTTPException(409, "Periode ini sudah memiliki aktivitas sistem. Impor histori papercard/standup tidak boleh mengganti periode operasional.")


def ensure_live_period(db: Session, day: date) -> None:
    lock_period(db, day, day)
    if db.scalar(select(ScorecardArchive.id).where(ScorecardArchive.month == day.replace(day=1)).limit(1)):
        raise HTTPException(409, "Bulan ini merupakan arsip final Excel. Aktivitas operasional tidak dapat ditulis ke bulan arsip.")


def prepare_archives(db: Session, payload, today: date):
    prepared, errors, warnings, seen = [], [], [], set()
    months = {row.month for row in payload.archives}
    for detail in payload.archive_details:
        if detail.date.replace(day=1) not in months:
            errors.append("Detail arsip harus berada pada bulan rekap final yang disertakan.")
    for month in sorted(months):
        if month_end(month) >= today or month < payload.from_date or month_end(month) > payload.to_date:
            errors.append("Rekap final harus mencakup satu bulan penuh yang sudah berakhir dan berada dalam periode impor.")
        else:
            ensure_historical_period(db, month, month_end(month))
    existing = {(r.month, r.scope, r.line_code.casefold(), r.leader_name.casefold(), r.dm_name.casefold()): r
                for r in db.scalars(select(ScorecardArchive).where(ScorecardArchive.month.in_(months)))} if months else {}
    existing_scopes = {(row.month, row.scope): row for row in existing.values()}
    for row in payload.archives:
        identity = (row.month, row.scope, row.line.strip().casefold(), row.leader.strip().casefold(), row.dm.strip().casefold())
        if identity in seen:
            errors.append(f"Rekap final berulang: {row.month:%Y-%m}, {row.leader}, {row.line or row.dm}.")
            continue
        seen.add(identity)
        if abs(row.total - row.before - row.current - row.after) > 0.01:
            warnings.append(f"{row.source_sheet} baris {row.source_row}: total final berbeda dari jumlah komponen; angka final Excel tetap diarsipkan.")
        stored = existing.get(identity)
        if stored is None and payload.mode == "skip":
            stored = existing_scopes.get((row.month, row.scope))
        prepared.append((row, stored))
    return prepared, errors, warnings
