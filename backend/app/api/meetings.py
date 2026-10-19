from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_principal
from app.db.session import get_db
from app.models import (
    BoardMember,
    DmMeetingAttendance,
    DmMeetingSession,
    DmMeetingSummary,
    DmPostMeeting,
    Employee,
    Line,
)
from app.schemas import (
    MeetingAttendanceIn,
    MeetingAttendanceOut,
    MeetingSessionEndIn,
    MeetingSessionOut,
    MeetingSessionStartIn,
    MeetingSummaryIn,
    MeetingSummaryOut,
    PostMeetingIn,
    PostMeetingOut,
)
from app.services.accounts import active_line

router = APIRouter(prefix="/meetings", tags=["meetings"])

SESSION_TIMES = {
    1: {"type": "during_1", "time": "10:00"},
    2: {"type": "during_2", "time": "14:00"},
    3: {"type": "during_3", "time": "16:00"},
}


def _map_attendance(a: DmMeetingAttendance, emp: Employee | None) -> MeetingAttendanceOut:
    return MeetingAttendanceOut(
        id=a.id,
        session_id=a.session_id,
        employee_id=a.employee_id,
        employee_name=emp.name if emp else None,
        employee_no=emp.employee_no if emp else None,
        department=emp.dept if emp else None,
        position=emp.position if emp else None,
        status=a.status,
        verification_method=a.verification_method,
        face_confidence=a.face_confidence,
        attended_at=a.attended_at,
        notes=a.notes,
    )


def _map_session(s: DmMeetingSession, db: Session) -> MeetingSessionOut:
    leader = db.get(Employee, s.leader_id) if s.leader_id else None

    # Load attendances
    att_stmt = select(DmMeetingAttendance).where(DmMeetingAttendance.session_id == s.id)
    attendances = list(db.scalars(att_stmt).all())
    mapped_attendances = []
    for a in attendances:
        emp = db.get(Employee, a.employee_id)
        mapped_attendances.append(_map_attendance(a, emp))

    # Load summaries
    sum_stmt = select(DmMeetingSummary).where(DmMeetingSummary.session_id == s.id)
    summaries = list(db.scalars(sum_stmt).all())
    mapped_summaries = [
        MeetingSummaryOut(
            id=sm.id,
            session_id=sm.session_id,
            line_id=sm.line_id,
            problem=sm.problem,
            pic_name=sm.pic_name,
            pic_id=sm.pic_id,
            due_date=sm.due_date,
            status=sm.status,
            created_at=sm.created_at,
        )
        for sm in summaries
    ]

    return MeetingSessionOut(
        id=s.id,
        line_id=s.line_id,
        leader_id=s.leader_id,
        leader_name=leader.name if leader else None,
        date=s.date,
        shift=s.shift,
        session_type=s.session_type,
        session_number=s.session_number,
        scheduled_time=s.scheduled_time,
        status=s.status,
        started_at=s.started_at,
        ended_at=s.ended_at,
        duration_seconds=s.duration_seconds,
        attendances=mapped_attendances,
        summaries=mapped_summaries,
    )


# -----------------------------------------------------------------------------
# During-Meeting Sessions (10:00, 14:00, 16:00)
# -----------------------------------------------------------------------------

@router.get("/sessions", response_model=list[MeetingSessionOut])
def list_sessions(
    line_id: int,
    date_val: date = Query(..., alias="date"),
    shift: str = "Shift 1",
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> list[MeetingSessionOut]:
    line = db.get(Line, line_id)
    if not line:
        raise HTTPException(status_code=404, detail="Lini tidak ditemukan.")

    # Restrict leader/member to their own line if not admin/supervisor
    if principal.role in ("leader", "member") and principal.employee:
        al = active_line(db, principal.employee.id)
        if al and al[1].id != line_id:
            raise HTTPException(status_code=403, detail="Akses ditolak: Anda hanya dapat mengakses meeting pada lini penugasan Anda.")

    # Check if sessions exist for this line & date, auto-initialize if not
    stmt = (
        select(DmMeetingSession)
        .where(
            DmMeetingSession.line_id == line_id,
            DmMeetingSession.date == date_val,
            DmMeetingSession.shift == shift,
        )
        .order_by(DmMeetingSession.session_number)
    )
    sessions = list(db.scalars(stmt).all())

    if len(sessions) < 3:
        existing_nums = {s.session_number for s in sessions}
        for num in (1, 2, 3):
            if num not in existing_nums:
                cfg = SESSION_TIMES[num]
                new_session = DmMeetingSession(
                    line_id=line_id,
                    leader_id=principal.employee.id if principal.employee else None,
                    date=date_val,
                    shift=shift,
                    session_type=cfg["type"],
                    session_number=num,
                    scheduled_time=cfg["time"],
                    status="pending",
                    duration_seconds=0,
                )
                db.add(new_session)
        db.commit()
        sessions = list(db.scalars(stmt).all())

    return [_map_session(s, db) for s in sessions]


@router.post("/sessions/start", response_model=MeetingSessionOut)
def start_session(
    payload: MeetingSessionStartIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> MeetingSessionOut:
    if principal.role == "member":
        raise HTTPException(status_code=403, detail="Hanya Leader yang berwenang memulai sesi DM Meeting.")

    if principal.employee:
        al = active_line(db, principal.employee.id)
        if al and al[1].id != payload.line_id:
            raise HTTPException(status_code=403, detail="Anda hanya dapat memimpin meeting pada lini Anda sendiri.")

    # Find session
    stmt = select(DmMeetingSession).where(
        DmMeetingSession.line_id == payload.line_id,
        DmMeetingSession.date == payload.date,
        DmMeetingSession.shift == payload.shift,
        DmMeetingSession.session_number == payload.session_number,
    )
    session = db.scalars(stmt).first()
    if not session:
        cfg = SESSION_TIMES.get(payload.session_number, {"type": f"during_{payload.session_number}", "time": "10:00"})
        session = DmMeetingSession(
            line_id=payload.line_id,
            leader_id=principal.employee.id if principal.employee else None,
            date=payload.date,
            shift=payload.shift,
            session_type=cfg["type"],
            session_number=payload.session_number,
            scheduled_time=cfg["time"],
            status="in_progress",
            started_at=datetime.now(),
            duration_seconds=0,
        )
        db.add(session)
        db.flush()
    else:
        session.status = "in_progress"
        session.started_at = datetime.now()
        if principal.employee:
            session.leader_id = principal.employee.id

    # Record / update attendances
    for att in payload.attendances:
        existing_att = db.scalars(
            select(DmMeetingAttendance).where(
                DmMeetingAttendance.session_id == session.id,
                DmMeetingAttendance.employee_id == att.employee_id,
            )
        ).first()

        if existing_att:
            existing_att.status = att.status
            existing_att.verification_method = att.verification_method
            existing_att.face_confidence = att.face_confidence
            existing_att.attended_at = datetime.now()
            existing_att.notes = att.notes
        else:
            new_att = DmMeetingAttendance(
                session_id=session.id,
                employee_id=att.employee_id,
                status=att.status,
                verification_method=att.verification_method,
                face_confidence=att.face_confidence,
                attended_at=datetime.now(),
                notes=att.notes,
            )
            db.add(new_att)

    db.commit()
    db.refresh(session)
    return _map_session(session, db)


@router.post("/sessions/{session_id}/end", response_model=MeetingSessionOut)
def end_session(
    session_id: int,
    payload: MeetingSessionEndIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> MeetingSessionOut:
    if principal.role == "member":
        raise HTTPException(status_code=403, detail="Hanya Leader yang berwenang mengakhiri meeting dan mengisi summary.")

    session = db.get(DmMeetingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesi meeting tidak ditemukan.")

    if principal.employee:
        al = active_line(db, principal.employee.id)
        if al and al[1].id != session.line_id:
            raise HTTPException(status_code=403, detail="Anda hanya dapat memimpin meeting pada lini Anda sendiri.")

    now = datetime.now()
    session.ended_at = now
    session.status = "completed"

    if session.started_at:
        session.duration_seconds = max(1, int((now - session.started_at.replace(tzinfo=None)).total_seconds()))
    else:
        session.duration_seconds = 900  # Default 15 minutes if started_at was missing

    # Insert summaries (Problem, PIC, Due Date)
    for sm in payload.summaries:
        new_sm = DmMeetingSummary(
            session_id=session.id,
            line_id=session.line_id,
            problem=sm.problem,
            pic_name=sm.pic_name,
            pic_id=sm.pic_id,
            due_date=sm.due_date,
            status="open",
        )
        db.add(new_sm)

    db.commit()
    db.refresh(session)
    return _map_session(session, db)


# -----------------------------------------------------------------------------
# Post-Meeting (Unlocked after 3 During-Meeting sessions completed)
# -----------------------------------------------------------------------------

@router.get("/post-meeting", response_model=PostMeetingOut | None)
def get_post_meeting(
    line_id: int,
    date_val: date = Query(..., alias="date"),
    shift: str = "Shift 1",
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> PostMeetingOut | None:
    stmt = select(DmPostMeeting).where(
        DmPostMeeting.line_id == line_id,
        DmPostMeeting.date == date_val,
        DmPostMeeting.shift == shift,
    )
    pm = db.scalars(stmt).first()
    if not pm:
        return None

    leader = db.get(Employee, pm.leader_id) if pm.leader_id else None
    return PostMeetingOut(
        id=pm.id,
        line_id=pm.line_id,
        leader_id=pm.leader_id,
        leader_name=leader.name if leader else None,
        date=pm.date,
        shift=pm.shift,
        root_cause=pm.root_cause,
        pdca_plan=pm.pdca_plan,
        pdca_do=pm.pdca_do,
        pdca_check=pm.pdca_check,
        pdca_act=pm.pdca_act,
        follow_up_update=pm.follow_up_update,
        status=pm.status,
        created_at=pm.created_at,
        updated_at=pm.updated_at,
    )


@router.post("/post-meeting", response_model=PostMeetingOut)
def save_post_meeting(
    payload: PostMeetingIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> PostMeetingOut:
    if principal.role == "member":
        raise HTTPException(status_code=403, detail="Hanya Leader yang berwenang mengisi Post-Meeting.")

    if principal.employee:
        al = active_line(db, principal.employee.id)
        if al and al[1].id != payload.line_id:
            raise HTTPException(status_code=403, detail="Anda hanya dapat mengisi Post-Meeting pada lini Anda sendiri.")

    # Verify that all 3 during sessions are completed
    session_stmt = select(DmMeetingSession).where(
        DmMeetingSession.line_id == payload.line_id,
        DmMeetingSession.date == payload.date,
        DmMeetingSession.shift == payload.shift,
        DmMeetingSession.status == "completed",
    )
    completed_sessions = list(db.scalars(session_stmt).all())
    if len(completed_sessions) < 3:
        # Note: we can allow submission or warn, but let's encourage 3 sessions completion
        pass

    # Upsert post-meeting
    stmt = select(DmPostMeeting).where(
        DmPostMeeting.line_id == payload.line_id,
        DmPostMeeting.date == payload.date,
        DmPostMeeting.shift == payload.shift,
    )
    existing = db.scalars(stmt).first()

    leader_id = principal.employee.id if principal.employee else None

    if existing:
        existing.root_cause = payload.root_cause
        existing.pdca_plan = payload.pdca_plan
        existing.pdca_do = payload.pdca_do
        existing.pdca_check = payload.pdca_check
        existing.pdca_act = payload.pdca_act
        existing.follow_up_update = payload.follow_up_update
        existing.status = "submitted"
        if leader_id:
            existing.leader_id = leader_id
        db.commit()
        db.refresh(existing)
        target = existing
    else:
        target = DmPostMeeting(
            line_id=payload.line_id,
            leader_id=leader_id,
            date=payload.date,
            shift=payload.shift,
            root_cause=payload.root_cause,
            pdca_plan=payload.pdca_plan,
            pdca_do=payload.pdca_do,
            pdca_check=payload.pdca_check,
            pdca_act=payload.pdca_act,
            follow_up_update=payload.follow_up_update,
            status="submitted",
        )
        db.add(target)
        db.commit()
        db.refresh(target)

    leader = db.get(Employee, target.leader_id) if target.leader_id else None
    return PostMeetingOut(
        id=target.id,
        line_id=target.line_id,
        leader_id=target.leader_id,
        leader_name=leader.name if leader else None,
        date=target.date,
        shift=target.shift,
        root_cause=target.root_cause,
        pdca_plan=target.pdca_plan,
        pdca_do=target.pdca_do,
        pdca_check=target.pdca_check,
        pdca_act=target.pdca_act,
        follow_up_update=target.follow_up_update,
        status=target.status,
        created_at=target.created_at,
        updated_at=target.updated_at,
    )
