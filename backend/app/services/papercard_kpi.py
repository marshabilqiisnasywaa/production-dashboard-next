from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PapercardSubmission, PapercardTemplate
from app.services.holidays import holiday_entries

JAKARTA = ZoneInfo("Asia/Jakarta")
DEPARTMENTS = ("PROD", "ME", "PE", "QC")
MAX_ON_TIME = 8
MAX_REGISTERED = 14
MAX_CLOSED = 8
MAX_TOTAL = MAX_ON_TIME + MAX_REGISTERED + MAX_CLOSED
OFF_WEEKDAYS = {6, 7}


@dataclass
class DeptCheck:
    department: str
    submitted: bool
    on_time: bool
    has_finding: bool
    registered: bool
    closed: bool


@dataclass
class DayScore:
    date: date
    final: bool
    on_time: int
    registered: int
    closed: int
    checks: list[DeptCheck]

    @property
    def total(self) -> int:
        return self.on_time + self.registered + self.closed


def has_ng(answers) -> bool:
    return any(isinstance(a, dict) and a.get("status") == "NG" for a in answers or [])


def to_jakarta(value: datetime) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=JAKARTA)
    return value.astimezone(JAKARTA)


def check_department(day: date, department: str, submission, window_end: str) -> DeptCheck:
    if submission is None:
        return DeptCheck(department, False, False, False, False, False)
    deadline = datetime.combine(day, time.fromisoformat(window_end), tzinfo=JAKARTA)
    on_time = to_jakarta(submission.submitted_at) <= deadline
    finding = has_ng(submission.answers)
    closed = (
        finding
        and submission.approval_status == "approved"
        and submission.approved_at is not None
        and to_jakarta(submission.approved_at).date() == day
    )
    return DeptCheck(department, True, on_time, finding, finding and on_time, closed)


def score_day(day: date, checks: list[DeptCheck], today: date) -> DayScore:
    ready = bool(checks)
    return DayScore(
        date=day,
        final=day < today,
        on_time=MAX_ON_TIME if ready and all(c.on_time for c in checks) else 0,
        registered=MAX_REGISTERED if ready and all(c.registered for c in checks) else 0,
        closed=MAX_CLOSED if ready and all(c.closed for c in checks) else 0,
        checks=checks,
    )


def holiday_dates(db: Session, start: date, end: date) -> set[date]:
    dates: set[date] = set()
    for year in range(start.year, end.year + 1):
        dates.update(e.date for e in holiday_entries(db, year) if e.active)
    return dates


def working_days(db: Session, start: date, end: date):
    holidays = holiday_dates(db, start, end)
    day = start
    while day <= end:
        if day.isoweekday() not in OFF_WEEKDAYS and day not in holidays:
            yield day
        day += timedelta(days=1)


def line_kpi(db: Session, line_id: int, start: date, end: date, shift: str, today: date) -> list[DayScore]:
    templates = {
        t.department: t
        for t in db.scalars(
            select(PapercardTemplate).where(
                PapercardTemplate.line_id == line_id,
                PapercardTemplate.department.in_(DEPARTMENTS),
            )
        )
    }
    required = [d for d in DEPARTMENTS if d in templates]
    if not required:
        return []

    submissions = db.scalars(
        select(PapercardSubmission).where(
            PapercardSubmission.line_id == line_id,
            PapercardSubmission.shift == shift,
            PapercardSubmission.date >= start,
            PapercardSubmission.date <= end,
            PapercardSubmission.department.in_(required),
        )
    )
    by_key = {(s.date, s.department): s for s in submissions}

    days = []
    for day in working_days(db, start, end):
        checks = [
            check_department(day, d, by_key.get((day, d)), templates[d].window_end)
            for d in required
        ]
        days.append(score_day(day, checks, today))
    return days


def average_scores(days: list[DayScore]) -> dict | None:
    final = [d for d in days if d.final]
    if not final:
        return None
    n = len(final)
    return {
        "days": n,
        "on_time": round(sum(d.on_time for d in final) / n, 2),
        "registered": round(sum(d.registered for d in final) / n, 2),
        "closed": round(sum(d.closed for d in final) / n, 2),
        "total": round(sum(d.total for d in final) / n, 2),
    }
