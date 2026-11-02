from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.api.workshop_meetings import WORKSHOP_MEETING_LABEL, meeting_time
from app.db.session import get_db
from app.models import DmMeetingSession, Holiday, Line, Workshop, WorkshopMeetingSession
from app.schemas import CamelModel
from app.services.holidays import holiday_entries, is_holiday, national_holidays
from app.services.meeting_schedule import all_active_slots

router = APIRouter(prefix="/holidays", tags=["holidays"])


class HolidayOut(CamelModel):
    date: date
    name: str
    source: str
    active: bool


class HolidayIn(CamelModel):
    date: date
    name: str = Field(min_length=1, max_length=120)


class OpenMeetingsIn(CamelModel):
    date: date
    line_ids: list[int] = Field(default_factory=list)
    workshop_ids: list[int] = Field(default_factory=list)


class OpenMeetingsOut(CamelModel):
    created_lines: int
    created_workshops: int
    skipped: int


def _entries(db: Session, year: int) -> list[HolidayOut]:
    return [HolidayOut(date=e.date, name=e.name, source=e.source, active=e.active) for e in holiday_entries(db, year)]


@router.get("", response_model=list[HolidayOut])
def list_holidays(year: int = Query(ge=2000, le=2100), db: Session = Depends(get_db)) -> list[HolidayOut]:
    return _entries(db, year)


@router.post("", response_model=list[HolidayOut])
def add_holiday(payload: HolidayIn, db: Session = Depends(get_db), _admin=Depends(get_current_admin)) -> list[HolidayOut]:
    row = db.scalar(select(Holiday).where(Holiday.date == payload.date))
    national = payload.date in national_holidays(payload.date.year)
    if row is not None and row.kind == "suppressed":
        db.delete(row)
        if not national:
            db.add(Holiday(date=payload.date, name=payload.name.strip(), kind="custom"))
    elif row is not None:
        row.name = payload.name.strip()
    elif national:
        raise HTTPException(409, "Tanggal ini sudah libur nasional.")
    else:
        db.add(Holiday(date=payload.date, name=payload.name.strip(), kind="custom"))
    db.commit()
    return _entries(db, payload.date.year)


@router.delete("/{day}", response_model=list[HolidayOut])
def remove_holiday(day: date, db: Session = Depends(get_db), _admin=Depends(get_current_admin)) -> list[HolidayOut]:
    row = db.scalar(select(Holiday).where(Holiday.date == day))
    if row is not None and row.kind == "custom":
        db.delete(row)
    elif row is None and day in national_holidays(day.year):
        db.add(Holiday(date=day, name="Dibatalkan", kind="suppressed"))
    else:
        raise HTTPException(404, "Tanggal ini bukan hari libur.")
    db.commit()
    return _entries(db, day.year)


@router.post("/open-meetings", response_model=OpenMeetingsOut)
def open_holiday_meetings(
    payload: OpenMeetingsIn,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
) -> OpenMeetingsOut:
    if not is_holiday(db, payload.date):
        raise HTTPException(400, "Tanggal ini bukan hari libur. Sesi pada hari biasa dibuat otomatis sesuai jadwal.")
    if not payload.line_ids and not payload.workshop_ids:
        raise HTTPException(400, "Pilih minimal satu lini atau workshop.")

    created_lines = created_workshops = skipped = 0
    for line_id in dict.fromkeys(payload.line_ids):
        if db.get(Line, line_id) is None:
            raise HTTPException(404, "Lini tidak ditemukan.")
        existing = {
            n for n in db.scalars(select(DmMeetingSession.session_number).where(
                DmMeetingSession.line_id == line_id,
                DmMeetingSession.date == payload.date,
                DmMeetingSession.shift == "Shift 1",
            ))
        }
        for slot in all_active_slots(db, line_id):
            if slot.number in existing:
                skipped += 1
                continue
            db.add(DmMeetingSession(
                line_id=line_id, date=payload.date, shift="Shift 1",
                session_type=f"during_{slot.number}", session_number=slot.number,
                label=slot.label, scheduled_time=slot.time, status="pending", duration_seconds=0,
            ))
            created_lines += 1

    for workshop_id in dict.fromkeys(payload.workshop_ids):
        if db.get(Workshop, workshop_id) is None:
            raise HTTPException(404, "Workshop tidak ditemukan.")
        exists = db.scalar(select(WorkshopMeetingSession.id).where(
            WorkshopMeetingSession.workshop_id == workshop_id,
            WorkshopMeetingSession.date == payload.date,
        ))
        if exists:
            skipped += 1
            continue
        db.add(WorkshopMeetingSession(
            workshop_id=workshop_id, date=payload.date, label=WORKSHOP_MEETING_LABEL,
            scheduled_time=meeting_time(db, workshop_id), status="pending", duration_seconds=0,
        ))
        created_workshops += 1

    db.commit()
    return OpenMeetingsOut(created_lines=created_lines, created_workshops=created_workshops, skipped=skipped)
