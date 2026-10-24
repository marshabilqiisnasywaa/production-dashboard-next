from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Board, BoardMember, DmGroup, DmMeetingAttendance, DmMeetingSession, Employee, Line
from app.services.accounts import active_lines


def authorize_host(db: Session, principal, session: DmMeetingSession) -> None:
    if principal.is_admin:
        return
    if principal.role != "leader" or principal.employee is None or principal.employee.must_change_password:
        raise HTTPException(403, "Hanya leader lini yang dapat menjalankan meeting.")
    own_ids = {line.id for _, line, _ in active_lines(db, principal.employee.id)}
    if session.line_id not in own_ids:
        raise HTTPException(403, "Meeting ini bukan milik lini penugasan Anda.")
    if session.source_session_id is not None:
        raise HTTPException(409, "Presensi gabungan dikelola oleh leader yang membuka meeting DM.")
    if session.roster is not None and session.leader_id != principal.employee.id:
        raise HTTPException(409, "Meeting ini sedang dikelola oleh leader lain.")


def build_roster(db: Session, line_ids: list[int]) -> list[dict]:
    rows = db.execute(
        select(Employee, Line)
        .select_from(BoardMember)
        .join(Employee, Employee.id == BoardMember.employee_id)
        .join(Board, Board.id == BoardMember.board_id)
        .join(Line, Line.id == Board.line_id)
        .where(Line.id.in_(line_ids), BoardMember.ended_at.is_(None), Employee.is_active.is_(True))
        .order_by(Line.code, BoardMember.sort_order, Employee.id)
    ).all()
    members: dict[int, dict] = {}
    for employee, line in rows:
        item = members.setdefault(employee.id, {
            "employee_id": employee.id, "employee_no": employee.employee_no,
            "name": employee.name, "dept": employee.dept, "position": employee.position,
            "line_ids": [], "line_codes": [],
        })
        if line.id not in item["line_ids"]:
            item["line_ids"].append(line.id)
            item["line_codes"].append(line.code)
    return list(members.values())


def participants(db: Session, session: DmMeetingSession) -> list[dict]:
    roster = session.roster if session.roster is not None else build_roster(db, [session.line_id])
    result = []
    for item in roster:
        employee = db.get(Employee, item["employee_id"])
        result.append({**item, "photo_url": employee.photo_url if employee else None})
    return result


def prepare(db: Session, principal, session: DmMeetingSession, scope: str) -> DmMeetingSession:
    authorize_host(db, principal, session)
    line = db.get(Line, session.line_id)
    if scope == "dm":
        if line.dm_group_id is None:
            raise HTTPException(400, "Lini ini belum masuk DM. Hubungi admin.")
        lines = list(db.scalars(select(Line).where(
            Line.dm_group_id == line.dm_group_id, Line.workshop_id == line.workshop_id,
        ).order_by(Line.id).with_for_update()).all())
    else:
        lines = list(db.scalars(select(Line).where(Line.id == line.id).with_for_update()).all())
    db.refresh(session)
    authorize_host(db, principal, session)
    if session.roster is not None:
        if session.meeting_scope != scope:
            raise HTTPException(409, "Mode meeting sudah ditetapkan saat presensi dibuka.")
        return session
    if session.status != "pending":
        raise HTTPException(409, "Sesi ini sudah dimulai atau selesai.")
    line_ids = [item.id for item in lines]
    sessions = list(db.scalars(select(DmMeetingSession).where(
        DmMeetingSession.line_id.in_(line_ids), DmMeetingSession.date == session.date,
        DmMeetingSession.shift == session.shift, DmMeetingSession.session_number == session.session_number,
    ).order_by(DmMeetingSession.line_id).with_for_update()).all())
    for other in sessions:
        has_attendance = db.scalar(select(DmMeetingAttendance.id).where(DmMeetingAttendance.session_id == other.id).limit(1))
        if other.status != "pending" or other.roster is not None or other.source_session_id or has_attendance:
            raise HTTPException(409, "Salah satu lini sudah membuka presensi atau menjalankan sesi ini.")
    roster = build_roster(db, line_ids)
    if not roster:
        raise HTTPException(400, "Belum ada anggota aktif untuk meeting ini.")
    group = db.get(DmGroup, line.dm_group_id) if scope == "dm" else None
    session.meeting_scope = scope
    session.dm_group_name = group.name if group else None
    session.roster = roster
    session.leader_id = principal.employee.id if principal.employee else None
    db.flush()
    existing = {item.line_id: item for item in sessions}
    for target_line in lines:
        if target_line.id == session.line_id:
            continue
        target = existing.get(target_line.id)
        if target is None:
            target = DmMeetingSession(
                line_id=target_line.id, date=session.date, shift=session.shift,
                session_type=session.session_type, session_number=session.session_number,
                scheduled_time=session.scheduled_time, label=session.label, status="pending", duration_seconds=0,
            )
            db.add(target)
        target.source_session_id = session.id
        target.meeting_scope = scope
        target.dm_group_name = session.dm_group_name
        target.leader_id = session.leader_id
        target.scheduled_time = session.scheduled_time
        target.label = session.label
        target.roster = [
            {**item, "line_ids": [target_line.id], "line_codes": [target_line.code]}
            for item in roster if target_line.id in item["line_ids"]
        ]
    db.flush()
    return session


def require_participant(db: Session, session: DmMeetingSession, employee_id: int) -> None:
    roster = session.roster if session.roster is not None else build_roster(db, [session.line_id])
    if not any(item["employee_id"] == employee_id for item in roster):
        raise HTTPException(403, "Peserta tidak terdaftar dalam lini atau DM meeting ini.")


def participant_line(session: DmMeetingSession, employee_id: int) -> str | None:
    if session.roster is None:
        return None
    return next((", ".join(item["line_codes"]) for item in session.roster if item["employee_id"] == employee_id), None)


def sync_attendance(db: Session, source: DmMeetingSession, attendance: DmMeetingAttendance) -> None:
    if source.meeting_scope != "dm" or source.source_session_id is not None:
        return
    targets = db.scalars(select(DmMeetingSession).where(DmMeetingSession.source_session_id == source.id)).all()
    for target in targets:
        if not any(item["employee_id"] == attendance.employee_id for item in target.roster or []):
            continue
        mirrored = db.scalar(select(DmMeetingAttendance).where(
            DmMeetingAttendance.session_id == target.id, DmMeetingAttendance.employee_id == attendance.employee_id,
        ))
        if mirrored is None:
            mirrored = DmMeetingAttendance(session_id=target.id, employee_id=attendance.employee_id)
            db.add(mirrored)
        for field in ("status", "verification_method", "face_confidence", "attended_at", "notes", "note_by_id", "note_at"):
            setattr(mirrored, field, getattr(attendance, field))


def sync_sessions(db: Session, source: DmMeetingSession) -> None:
    for target in db.scalars(select(DmMeetingSession).where(DmMeetingSession.source_session_id == source.id)):
        for field in ("status", "started_at", "ended_at", "duration_seconds", "leader_id"):
            setattr(target, field, getattr(source, field))
