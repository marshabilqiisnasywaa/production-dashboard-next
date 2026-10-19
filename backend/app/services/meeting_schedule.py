from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DmMeetingSchedule

ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

DEFAULT_SLOTS = [
    ("Sesi 1", "10:00"),
    ("Sesi 2", "14:00"),
    ("Sesi 3", "16:00"),
]


@dataclass
class Slot:
    number: int
    label: str
    time: str


def parse_days(raw: str | None) -> list[int]:
    if not raw:
        return list(ALL_DAYS)
    days = sorted({int(p) for p in raw.split(",") if p.strip().isdigit() and 1 <= int(p) <= 7})
    return days or list(ALL_DAYS)


def format_days(days: list[int]) -> str:
    return ",".join(str(d) for d in sorted(set(days)))


def line_schedule_rows(db: Session, line_id: int) -> list[DmMeetingSchedule]:
    stmt = (
        select(DmMeetingSchedule)
        .where(DmMeetingSchedule.line_id == line_id)
        .order_by(DmMeetingSchedule.time, DmMeetingSchedule.id)
    )
    return list(db.scalars(stmt).all())


def slots_for_day(db: Session, line_id: int, day: date) -> list[Slot]:
    rows = line_schedule_rows(db, line_id)
    if not rows:
        return [Slot(i + 1, label, time) for i, (label, time) in enumerate(DEFAULT_SLOTS)]
    weekday = day.isoweekday()
    active = [r for r in rows if r.is_active and weekday in parse_days(r.days)]
    return [Slot(i + 1, r.label, r.time) for i, r in enumerate(active)]
