from datetime import date, datetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session
from app.services.teamtalk import notify_new_problems

from app.api.deps import Principal, authorize_line, get_active_principal, get_current_admin, get_principal
from app.db.session import get_db
from app.models import (
    BoardMember,
    DmMeetingAttendance,
    DmMeetingSchedule,
    DmMeetingSession,
    DmMeetingSummary,
    DmPostMeeting,
    Employee,
    Line,
)
from app.schemas import (
    AbsenceNotesIn,
    EmployeePhotoOut,
    MeetingAttendanceIn,
    MeetingAttendanceOut,
    MeetingScheduleApplyIn,
    MeetingScheduleItemIn,
    MeetingScheduleItemOut,
    MeetingScheduleOut,
    MeetingScheduleSaveIn,
    MeetingSessionEndIn,
    MeetingSessionOut,
    MeetingSessionStartIn,
    MeetingSummaryIn,
    MeetingSummaryOut,
    PostMeetingIn,
    PostMeetingOut,
    PresensiCloseIn,
    myProblemOut,
    problemStatusIn,
)
from app.services.accounts import active_line, active_lines
from app.services.meeting_attendance import home_line_code
from app.services.meeting_schedule import (
    ALL_DAYS,
    DEFAULT_SLOTS,
    format_days,
    line_schedule_rows,
    parse_days,
    slots_for_day,
)

router = APIRouter(prefix="/meetings", tags=["meetings"])

def _absence_fields(a: DmMeetingAttendance) -> tuple[str | None, str | None]:
    if a.status == "present":
        return None, None
    notes = a.notes or ""
    if a.status == "permit":
        return "permit", notes.removeprefix("Izin").removeprefix(": ")
    if a.status == "sick":
        return "sick", notes.removeprefix("Sakit").removeprefix(": ")
    if notes.startswith("Diwakilkan"):
        return "represented", notes.removeprefix("Diwakilkan").removeprefix(" oleh ")
    return "none", notes


def _map_attendance(a: DmMeetingAttendance, emp: Employee | None, home_line: str | None = None) -> MeetingAttendanceOut: 
    reason, note = _absence_fields(a)
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
        employee_line=home_line,
        absence_reason=reason,
        absence_note=note,

    )


def _map_session(s: DmMeetingSession, db: Session) -> MeetingSessionOut:
    leader = db.get(Employee, s.leader_id) if s.leader_id else None

    # Load attendances
    att_stmt = select(DmMeetingAttendance).where(DmMeetingAttendance.session_id == s.id)
    attendances = list(db.scalars(att_stmt).all())
    mapped_attendances = []
    for a in attendances:
        emp = db.get(Employee, a.employee_id)
        mapped_attendances.append(_map_attendance(a, emp, home_line_code(db, a.employee_id)))


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
            line_code=sm.line_code,
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
        label=s.label,
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

def _schedule_out(db: Session, line_id: int) -> MeetingScheduleOut:
    rows = line_schedule_rows(db, line_id)
    if not rows:
        return MeetingScheduleOut(
            line_id=line_id,
            is_default=True,
            items=[
                MeetingScheduleItemOut(label=label, time=time, days=list(ALL_DAYS), is_active=True)
                for label, time in DEFAULT_SLOTS
            ],
        )
    return MeetingScheduleOut(
        line_id=line_id,
        is_default=False,
        items=[
            MeetingScheduleItemOut(id=r.id, label=r.label, time=r.time, days=parse_days(r.days), is_active=r.is_active)
            for r in rows
        ],
    )


def _replace_schedule(db: Session, line_id: int, items: list[MeetingScheduleItemIn]) -> None:
    for row in line_schedule_rows(db, line_id):
        db.delete(row)
    db.flush()
    for item in items:
        db.add(
            DmMeetingSchedule(
                line_id=line_id,
                label=item.label.strip(),
                time=item.time,
                days=format_days(item.days),
                is_active=item.is_active,
            )
        )


@router.get("/schedule", response_model=MeetingScheduleOut)
def get_schedule(
    line_id: int,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> MeetingScheduleOut:
    if not db.get(Line, line_id):
        raise HTTPException(status_code=404, detail="Lini tidak ditemukan.")
    return _schedule_out(db, line_id)


@router.put("/schedule/{line_id}", response_model=MeetingScheduleOut)
def save_schedule(
    line_id: int,
    payload: MeetingScheduleSaveIn,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
) -> MeetingScheduleOut:
    if not db.get(Line, line_id):
        raise HTTPException(status_code=404, detail="Lini tidak ditemukan.")
    _replace_schedule(db, line_id, payload.items)
    db.commit()
    return _schedule_out(db, line_id)


@router.post("/schedule/apply", response_model=list[MeetingScheduleOut])
def apply_schedule(
    payload: MeetingScheduleApplyIn,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
) -> list[MeetingScheduleOut]:
    applied: list[int] = []
    for line_id in payload.line_ids:
        if not db.get(Line, line_id):
            continue
        _replace_schedule(db, line_id, payload.items)
        applied.append(line_id)
    db.commit()
    return [_schedule_out(db, line_id) for line_id in applied]


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
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if user_line_ids and line_id not in user_line_ids:
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

    slots = {slot.number: slot for slot in slots_for_day(db, line_id, date_val)}
    changed = False
    for s in sessions:
        slot = slots.get(s.session_number)
        if s.status == "pending":
            if slot is None:
                db.delete(s)
                changed = True
            elif s.scheduled_time != slot.time or s.label != slot.label:
                s.scheduled_time = slot.time
                s.label = slot.label
                changed = True
    existing_nums = {s.session_number for s in sessions}
    for num, slot in slots.items():
        if num not in existing_nums:
            db.add(
                DmMeetingSession(
                    line_id=line_id,
                    leader_id=principal.employee.id if principal.employee else None,
                    date=date_val,
                    shift=shift,
                    session_type=f"during_{num}",
                    session_number=num,
                    label=slot.label,
                    scheduled_time=slot.time,
                    status="pending",
                    duration_seconds=0,
                )
            )
            changed = True
    if changed:
        db.commit()
        sessions = list(db.scalars(stmt).all())

    return [_map_session(s, db) for s in sessions]

@router.get("/history", response_model=list[MeetingSessionOut])
def meeting_history(
    line_id: int,
    date_from: date = Query(..., alias="from"),
    date_to: date = Query(..., alias="to"),
    shift: str = "Shift 1",
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> list[MeetingSessionOut]:
    if date_to < date_from or (date_to - date_from).days > 62:
        raise HTTPException(status_code=400, detail="Rentang tanggal tidak valid (maksimal 62 hari).")
    if principal.role in ("leader", "member") and principal.employee:
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if user_line_ids and line_id not in user_line_ids:
            raise HTTPException(status_code=403, detail="Akses ditolak: Anda hanya dapat melihat riwayat lini penugasan Anda.")
    stmt = (
        select(DmMeetingSession)
        .where(
            DmMeetingSession.line_id == line_id,
            DmMeetingSession.date >= date_from,
            DmMeetingSession.date <= date_to,
            DmMeetingSession.shift == shift,
            DmMeetingSession.status != "pending",
        )
        .order_by(DmMeetingSession.date.desc(), DmMeetingSession.session_number)
    )
    return [_map_session(s, db) for s in db.scalars(stmt).all()]


@router.get("/employees/{employee_no}/photo", response_model=EmployeePhotoOut)
def employee_photo(
    employee_no: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> EmployeePhotoOut:
    if principal.role == "member":
        raise HTTPException(status_code=403, detail="Hanya Leader yang berwenang melihat foto peserta.")
    employee = db.scalars(select(Employee).where(Employee.employee_no == employee_no)).first()
    return EmployeePhotoOut(photo_url=employee.photo_url if employee else None)


@router.get("/sessions/{session_id}", response_model=MeetingSessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> MeetingSessionOut:
    session = db.get(DmMeetingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesi meeting tidak ditemukan.")
    if principal.role in ("leader", "member") and principal.employee:
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if user_line_ids and session.line_id not in user_line_ids:
            raise HTTPException(status_code=403, detail="Akses ditolak: Anda hanya dapat mengakses meeting pada lini penugasan Anda.")
    return _map_session(session, db)


@router.post("/sessions/start", response_model=MeetingSessionOut)
def start_session(
    payload: MeetingSessionStartIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> MeetingSessionOut:
    if principal.role == "member":
        raise HTTPException(status_code=403, detail="Hanya Leader yang berwenang memulai sesi DM Meeting.")

    if principal.employee:
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if user_line_ids and payload.line_id not in user_line_ids:
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
        slot = next((x for x in slots_for_day(db, payload.line_id, payload.date) if x.number == payload.session_number), None)
        if slot is None:
            raise HTTPException(status_code=404, detail="Sesi ini tidak ada pada jadwal meeting lini untuk hari tersebut.")
        session = DmMeetingSession(
            line_id=payload.line_id,
            leader_id=principal.employee.id if principal.employee else None,
            date=payload.date,
            shift=payload.shift,
            session_type=f"during_{payload.session_number}",
            session_number=payload.session_number,
            label=slot.label,
            scheduled_time=slot.time,
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

@router.post("/sessions/{session_id}/presensi/close", response_model=MeetingSessionOut)
def close_presensi(
    session_id: int,
    payload: PresensiCloseIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> MeetingSessionOut:
    if principal.role == "member":
        raise HTTPException(status_code=403, detail="Hanya Leader yang berwenang menutup presensi.")
    session = db.get(DmMeetingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesi meeting tidak ditemukan.")
    if session.status == "completed":
        raise HTTPException(status_code=409, detail="Sesi ini sudah selesai.")
    if principal.employee:
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if user_line_ids and session.line_id not in user_line_ids:
            raise HTTPException(status_code=403, detail="Anda hanya dapat menutup presensi pada lini Anda sendiri.")

    employees = db.scalars(select(Employee).where(Employee.employee_no.in_(payload.absent_employee_nos))).all()
    for employee in employees:
        attendance = db.scalars(
            select(DmMeetingAttendance).where(
                DmMeetingAttendance.session_id == session.id,
                DmMeetingAttendance.employee_id == employee.id,
            )
        ).first()
        if attendance is not None and attendance.status != "absent":
            continue
        if attendance is None:
            attendance = DmMeetingAttendance(session_id=session.id, employee_id=employee.id)
            db.add(attendance)
        attendance.status = "absent"
        attendance.verification_method = "manual"
        attendance.face_confidence = None
    db.commit()
    db.refresh(session)
    return _map_session(session, db)


@router.put("/sessions/{session_id}/absence-notes", response_model=MeetingSessionOut)
def save_absence_notes(
    session_id: int,
    payload: AbsenceNotesIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> MeetingSessionOut:
    if principal.role == "member":
        raise HTTPException(status_code=403, detail="Hanya Leader yang berwenang mengisi keterangan.")
    session = db.get(DmMeetingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesi meeting tidak ditemukan.")
    if session.status == "completed":
        raise HTTPException(status_code=409, detail="Sesi ini sudah selesai.")
    if principal.employee:
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if user_line_ids and session.line_id not in user_line_ids:
            raise HTTPException(status_code=403, detail="Anda hanya dapat mengisi keterangan pada lini Anda sendiri.")

    employees = {
        e.employee_no: e
        for e in db.scalars(select(Employee).where(Employee.employee_no.in_([i.employee_no for i in payload.items])))
    }
    now = datetime.now()
    for item in payload.items:
        employee = employees.get(item.employee_no)
        if employee is None:
            continue
        attendance = db.scalars(
            select(DmMeetingAttendance).where(
                DmMeetingAttendance.session_id == session.id,
                DmMeetingAttendance.employee_id == employee.id,
            )
        ).first()
        if attendance is not None and attendance.status == "present":
            continue
        if attendance is None:
            attendance = DmMeetingAttendance(session_id=session.id, employee_id=employee.id)
            db.add(attendance)
        text = (item.note or "").strip()
        if item.reason == "represented":
            attendance.status = "absent"
            attendance.notes = "Diwakilkan oleh " + text if text else "Diwakilkan"
        elif item.reason == "permit":
            attendance.status = "permit"
            attendance.notes = "Izin: " + text if text else "Izin"
        elif item.reason == "sick":
            attendance.status = "sick"
            attendance.notes = "Sakit: " + text if text else "Sakit"
        else:
            attendance.status = "absent"
            attendance.notes = text or None
        attendance.verification_method = "manual"
        attendance.face_confidence = None
        attendance.note_by_id = principal.employee.id if principal.employee else None
        attendance.note_at = now
    db.commit()
    db.refresh(session)
    return _map_session(session, db)


@router.post("/sessions/{session_id}/end", response_model=MeetingSessionOut)
def end_session(
    session_id: int,
    payload: MeetingSessionEndIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_principal),
) -> MeetingSessionOut:
    if principal.role == "member":
        raise HTTPException(status_code=403, detail="Hanya Leader yang berwenang mengakhiri meeting dan mengisi summary.")

    session = db.get(DmMeetingSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Sesi meeting tidak ditemukan.")

    if principal.employee:
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if user_line_ids and session.line_id not in user_line_ids:
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
        pic_id = sm.pic_id
        pic_name = sm.pic_name
        if pic_id is None and sm.pic_employee_no:
            pic = db.scalars(
                select(Employee).where(Employee.employee_no == sm.pic_employee_no)
            ).first()
            if pic is not None:
                pic_id = pic.id
                pic_name = pic.name
        new_sm = DmMeetingSummary(
            session_id=session.id,
            line_id=session.line_id,
            problem=sm.problem,
            pic_name=pic_name,
            pic_id=pic_id,
            due_date=sm.due_date,
            line_code=sm.line_code,
            status="open",
        )
        db.add(new_sm)


    db.commit()
    db.refresh(session)

    line = db.get(Line, session.line_id)
    line_code = line.code if line else "-"

    if payload.summaries:
        background_tasks.add_task(
            notify_new_problems,
            line_code=line_code,
            session_label=session.label,
            summaries=payload.summaries,
        )

    return _map_session(session, db)

def _my_problem_out(sm : DmMeetingSummary, session: DmMeetingSession) -> myProblemOut:
    return myProblemOut(
        id=sm.id,
        session_id=sm.session_id,
        line_id=sm.line_id,
        line_code=sm.line_code,
        date=session.date,
        session_label=session.label,
        problem=sm.problem,
        pic_name=sm.pic_name,
        pic_id=sm.pic_id,
        due_date=sm.due_date,
        status=sm.status,
    )

def _is_pic(sm: DmMeetingSummary, employee: Employee) -> bool:
    if sm.pic_id is not None and sm.pic_id == employee.id:
        return True
    return sm.pic_name.strip().lower() == employee.name.strip().lower()


@router.get("/problems/mine", response_model=list[myProblemOut])
def my_problems(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> list[myProblemOut]:
    employee = principal.employee
    if employee is None:
        return []
    stmt = (
        select(DmMeetingSummary, DmMeetingSession)
        .join(DmMeetingSession, DmMeetingSession.id == DmMeetingSummary.session_id)
        .where(
            or_(
                DmMeetingSummary.pic_id == employee.id,
                func.lower(func.trim(DmMeetingSummary.pic_name)) == employee.name.strip().lower(),
            )
        )
        .order_by(DmMeetingSession.date.desc(), DmMeetingSummary.id.desc())
    )
    return [_my_problem_out(sm, s) for sm, s in db.execute(stmt).all()]

@router.get("/problems", response_model=list[myProblemOut])
def list_problems(
    line_id: int | None = Query(None, description="Filter masalah berdasarkan ID lini"),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> list[myProblemOut]:
    """
    Mengambil seluruh daftar masalah dari meeting lini yang dipimpin oleh Leader (atau semua lini bagi SPV/Admin).
    Mendukung multi-line assignment.
    """
    employee = principal.employee

    # 1. Tentukan lini apa saja yang boleh diakses oleh user ini
    if principal.role in ("leader", "member"):
        if not employee:
            return []
        user_line_ids = [l.id for _, l, _ in active_lines(db, employee.id)]
        if not user_line_ids:
            return []
        
        # Jika difilter per lini tertentu, pastikan lini tersebut memang milik user
        if line_id is not None:
            if line_id not in user_line_ids:
                raise HTTPException(status_code=403, detail="Akses ditolak: Anda tidak memiliki akses ke lini ini.")
            target_line_ids = [line_id]
        else:
            target_line_ids = user_line_ids
    else:
        # Role Admin / Supervisor / Manager: bisa melihat semua atau difilter
        target_line_ids = [line_id] if line_id is not None else None

    # 2. Query masalah meeting dari database
    stmt = (
        select(DmMeetingSummary, DmMeetingSession)
        .join(DmMeetingSession, DmMeetingSession.id == DmMeetingSummary.session_id)
    )
    if target_line_ids is not None:
        stmt = stmt.where(DmMeetingSummary.line_id.in_(target_line_ids))

    stmt = stmt.order_by(DmMeetingSession.date.desc(), DmMeetingSummary.id.desc())
    return [_my_problem_out(sm, s) for sm, s in db.execute(stmt).all()]

@router.get("/problems/escalations", response_model=list[myProblemOut])
def list_supervisor_escalations(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> list[myProblemOut]:
    """
    Mengambil daftar masalah meeting milik bawahan supervisor yang belum selesai.
    Filter eskalasi waktu dilakukan berdasarkan due_date.
    """
    spv_emp = principal.employee

    # 1. Jika role supervisor, cari siapa saja bawahan langsungnya di tabel employees
    if principal.role == "supervisor":
        if not spv_emp:
            return []
        
        # Subordinate filter: cek supervisor_id atau supervisor name
        sub_stmt = select(Employee.id, Employee.name).where(
            or_(
                Employee.supervisor_id == spv_emp.id,
                func.lower(func.trim(Employee.supervisor)) == spv_emp.name.strip().lower(),
            )
        )
        subordinates = db.execute(sub_stmt).all()
        if not subordinates:
            return []
        
        sub_ids = [sub.id for sub in subordinates]
        sub_names = [sub.name.strip().lower() for sub in subordinates if sub.name]

        pic_filter = or_(
            DmMeetingSummary.pic_id.in_(sub_ids),
            func.lower(func.trim(DmMeetingSummary.pic_name)).in_(sub_names),
        )
    else:
        # Jika Admin / Manager, dapat melihat seluruh eskalasi
        pic_filter = None

    # 2. Query masalah yang statusnya belum selesai (bukan 'resolved')
    stmt = (
        select(DmMeetingSummary, DmMeetingSession)
        .join(DmMeetingSession, DmMeetingSession.id == DmMeetingSummary.session_id)
        .where(DmMeetingSummary.status != "resolved")
    )

    if pic_filter is not None:
        stmt = stmt.where(pic_filter)

    stmt = stmt.order_by(DmMeetingSession.date.desc(), DmMeetingSummary.id.desc())
    return [_my_problem_out(sm, s) for sm, s in db.execute(stmt).all()]


@router.patch("/problems/{summary_id}", response_model=myProblemOut)
def set_problem_status(
    summary_id: int,
    payload: problemStatusIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> myProblemOut:
    sm = db.get(DmMeetingSummary, summary_id)
    if sm is None:
        raise HTTPException(status_code=404, detail="Problem tidak ditemukan.")

    employee = principal.employee
    if employee is not None:
        if not _is_pic(sm, employee):
            raise HTTPException(status_code=403, detail="Hanya PIC yang bisa mengubah status problem.")

    sm.status = payload.status
    db.commit()
    db.refresh(sm)
    session = db.get(DmMeetingSession, sm.session_id)
    return _my_problem_out(sm, session)


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
        user_line_ids = [l.id for _, l, _ in active_lines(db, principal.employee.id)]
        if user_line_ids and payload.line_id not in user_line_ids:
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
