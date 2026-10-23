from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DmMeetingAttendance, DmMeetingSession, Employee, Line
from app.services.accounts import active_line, active_lines
from app.services.meeting_schedule import slots_for_day


def home_line_code(db: Session, employee_id: int) -> str | None:
    lines = active_lines(db, employee_id)
    if not lines:
        return None
    return ", ".join(l[1].code for l in lines)


def mirror_attendance(db: Session, source: DmMeetingSession, employee: Employee, score: float) -> None:
    lines = active_lines(db, employee.id)
    if not lines or any(l[1].id == source.line_id for l in lines):
        return
    home_line = lines[0][1]
    target = db.scalars(
        select(DmMeetingSession).where(
            DmMeetingSession.line_id == home_line.id,
            DmMeetingSession.date == source.date,
            DmMeetingSession.shift == source.shift,
            DmMeetingSession.session_number == source.session_number,
        )
    ).first()
    if target is None:
        slot = next(
            (s for s in slots_for_day(db, home_line.id, source.date) if s.number == source.session_number), None
        )
        if slot is None:
            return
        target = DmMeetingSession(
            line_id=home_line.id,
            date=source.date,
            shift=source.shift,
            session_type=source.session_type,
            session_number=source.session_number,
            label=slot.label,
            scheduled_time=slot.time,
            status="pending",
            duration_seconds=0,
        )
        db.add(target)
        db.flush()
    attendance = db.scalars(
        select(DmMeetingAttendance).where(
            DmMeetingAttendance.session_id == target.id, DmMeetingAttendance.employee_id == employee.id
        )
    ).first()
    if attendance is not None and attendance.status == "present":
        return
    if attendance is None:
        attendance = DmMeetingAttendance(session_id=target.id, employee_id=employee.id)
        db.add(attendance)
    source_line = db.get(Line, source.line_id)
    attendance.status = "present"
    attendance.verification_method = "face_id"
    attendance.face_confidence = score
    attendance.notes = f"Hadir di meeting gabungan {source_line.code if source_line else ''}".strip()
