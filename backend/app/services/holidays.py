from dataclasses import dataclass
from datetime import date

import holidays as holiday_lib
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Holiday


@dataclass
class HolidayEntry:
    date: date
    name: str
    source: str
    active: bool


def national_holidays(year: int) -> dict[date, str]:
    return dict(holiday_lib.country_holidays("ID", years=[year]))


def holiday_entries(db: Session, year: int) -> list[HolidayEntry]:
    rows = list(db.scalars(
        select(Holiday).where(Holiday.date >= date(year, 1, 1), Holiday.date <= date(year, 12, 31))
    ))
    suppressed = {r.date for r in rows if r.kind == "suppressed"}
    custom = {r.date: r.name for r in rows if r.kind == "custom"}
    entries = [
        HolidayEntry(d, custom.get(d, name), "national", d not in suppressed)
        for d, name in national_holidays(year).items()
    ]
    entries += [HolidayEntry(d, name, "custom", True) for d, name in custom.items() if d not in national_holidays(year)]
    return sorted(entries, key=lambda e: e.date)


def holiday_name(db: Session, day: date) -> str | None:
    row = db.scalar(select(Holiday).where(Holiday.date == day))
    if row is not None:
        return row.name if row.kind == "custom" else None
    return national_holidays(day.year).get(day)


def is_holiday(db: Session, day: date) -> bool:
    return holiday_name(db, day) is not None
