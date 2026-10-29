from datetime import date, datetime, timezone

import numpy as np
from pydantic import Field
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_active_principal, get_current_admin
from app.api.face_scan import MAX_FRAME_BYTES, MAX_FRAMES, MAX_CAMERA_TEMPLATES, check_liveness, logger, not_recognized
from app.core.config import settings
from app.db.session import get_db
from app.models import (
    Employee,
    FaceTemplate,
    SupervisorWorkshop,
    Workshop,
    WorkshopMeetingAttendance,
    WorkshopMeetingSession,
    WorkshopMeetingSummary,
)
from app.schemas import (
    AbsenceNotesIn,
    MeetingRepresentativeOut,
    CamelModel,
    FaceChallengeOut,
    FaceScanOut,
    MeetingAttendanceOut,
    MeetingSessionEndIn,
    MeetingSessionOut,
    MeetingSummaryOut,
    PresensiCloseIn,
)
from app.services.face import antispoof, liveness
from app.services.face.engine import FaceError, FaceResult, extract_face
from app.services.face.matcher import matcher
from app.services.teamtalk import notify_new_problems

router = APIRouter(prefix="/workshop-meetings", tags=["workshop-meetings"])

WORKSHOP_MEETING_LABEL = "Workshop Meeting"
WORKSHOP_MEETING_TIME = "16:00"
HOST_DEPT = "PROD"
SESSION_PLACEHOLDER_LINE = 0


class WorkshopRefOut(CamelModel):
    id: int
    name: str


class WorkshopSupervisorsOut(CamelModel):
    workshop_id: int
    employee_ids: list[int]
    responsibilities: dict[int, str | None] = Field(default_factory=dict)


class WorkshopSupervisorsIn(CamelModel):
    employee_ids: list[int]
    responsibilities: dict[int, str | None] = Field(default_factory=dict)


def assigned_workshop_ids(db: Session, employee_id: int) -> set[int]:
    return set(db.scalars(select(SupervisorWorkshop.workshop_id).where(SupervisorWorkshop.employee_id == employee_id)))


def is_host_supervisor(employee: Employee | None) -> bool:
    return employee is not None and employee.role == "supervisor" and (employee.dept or "").strip().upper() == HOST_DEPT


def authorize_workshop(db: Session, principal: Principal, workshop_id: int) -> None:
    if principal.is_admin:
        return
    employee = principal.employee
    if not is_host_supervisor(employee):
        raise HTTPException(403, "Workshop Meeting hanya bisa dibuka oleh supervisor PROD.")
    assert employee is not None
    if workshop_id not in assigned_workshop_ids(db, employee.id):
        raise HTTPException(403, "Workshop ini bukan penugasan Anda. Hubungi admin.")


def authorize_host(db: Session, principal: Principal, session: WorkshopMeetingSession) -> None:
    authorize_workshop(db, principal, session.workshop_id)
    if principal.is_admin:
        return
    assert principal.employee is not None
    if session.source_session_id is not None:
        raise HTTPException(409, "Presensi workshop dikelola oleh supervisor PROD yang membuka meeting.")
    if session.roster is not None and session.host_id not in (None, principal.employee.id):
        raise HTTPException(409, "Meeting ini sedang dikelola oleh supervisor lain.")


def build_roster(db: Session, workshop_ids: list[int]) -> list[dict]:
    rows = db.execute(
        select(Employee, Workshop)
        .select_from(SupervisorWorkshop)
        .join(Employee, Employee.id == SupervisorWorkshop.employee_id)
        .join(Workshop, Workshop.id == SupervisorWorkshop.workshop_id)
        .where(
            SupervisorWorkshop.workshop_id.in_(workshop_ids),
            Employee.role == "supervisor",
            Employee.is_active.is_(True),
        )
        .order_by(Employee.name, Employee.id, Workshop.name)
    ).all()
    members: dict[int, dict] = {}
    for employee, workshop in rows:
        item = members.setdefault(employee.id, {
            "employee_id": employee.id, "employee_no": employee.employee_no, "name": employee.name,
            "dept": employee.dept, "position": employee.position, "line_ids": [], "line_codes": [],
        })
        if workshop.id not in item["line_ids"]:
            item["line_ids"].append(workshop.id)
            item["line_codes"].append(workshop.name)
    return list(members.values())


def sync_attendance(db: Session, source: WorkshopMeetingSession, attendance: WorkshopMeetingAttendance) -> None:
    if source.source_session_id is not None:
        return
    targets = db.scalars(
        select(WorkshopMeetingSession).where(WorkshopMeetingSession.source_session_id == source.id)
    ).all()
    for target in targets:
        if not any(item["employee_id"] == attendance.employee_id for item in target.roster or []):
            continue
        mirrored = db.scalar(select(WorkshopMeetingAttendance).where(
            WorkshopMeetingAttendance.session_id == target.id,
            WorkshopMeetingAttendance.employee_id == attendance.employee_id,
        ))
        if mirrored is None:
            mirrored = WorkshopMeetingAttendance(session_id=target.id, employee_id=attendance.employee_id)
            db.add(mirrored)
        for field in ("status", "verification_method", "face_confidence", "attended_at", "notes", "note_by_id", "note_at"):
            setattr(mirrored, field, getattr(attendance, field))


def sync_sessions(db: Session, source: WorkshopMeetingSession) -> None:
    for target in db.scalars(
        select(WorkshopMeetingSession).where(WorkshopMeetingSession.source_session_id == source.id)
    ):
        for field in ("status", "started_at", "ended_at", "duration_seconds", "host_id"):
            setattr(target, field, getattr(source, field))


def same_dept_representatives(db: Session, absent: Employee) -> list[Employee]:
    dept = (absent.dept or "").strip().upper()
    if not dept:
        return []
    return [
        e
        for e in db.scalars(
            select(Employee)
            .where(Employee.is_active.is_(True), Employee.id != absent.id)
            .order_by(Employee.name, Employee.employee_no)
        )
        if (e.dept or "").strip().upper() == dept
    ]


def validate_representative(db: Session, absent: Employee, text: str) -> None:
    if not text.endswith(")") or "(" not in text:
        raise HTTPException(400, "Pilih wakil dari daftar karyawan.")
    employee_no = text[text.rindex("(") + 1 : -1].strip()
    if not absent.dept:
        raise HTTPException(400, f"Departemen {absent.name} belum diisi, jadi wakil belum bisa dipilih.")
    if not any(e.employee_no == employee_no for e in same_dept_representatives(db, absent)):
        raise HTTPException(400, f"Wakil {absent.name} harus dari departemen {absent.dept}.")


def require_participant(db: Session, session: WorkshopMeetingSession, employee_id: int) -> None:
    roster = session.roster if session.roster is not None else build_roster(db, [session.workshop_id])
    if not any(item["employee_id"] == employee_id for item in roster):
        raise HTTPException(403, "Peserta tidak terdaftar dalam workshop meeting ini.")


def load_session(db: Session, session_id: int) -> WorkshopMeetingSession:
    session = db.get(WorkshopMeetingSession, session_id)
    if session is None:
        raise HTTPException(404, "Sesi meeting tidak ditemukan.")
    return session


def absence_fields(a: WorkshopMeetingAttendance) -> tuple[str | None, str | None]:
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


def map_attendance(a: WorkshopMeetingAttendance, emp: Employee | None) -> MeetingAttendanceOut:
    reason, note = absence_fields(a)
    return MeetingAttendanceOut(
        id=a.id, session_id=a.session_id, employee_id=a.employee_id,
        employee_name=emp.name if emp else None, employee_no=emp.employee_no if emp else None,
        department=emp.dept if emp else None, position=emp.position if emp else None,
        status=a.status, verification_method=a.verification_method, face_confidence=a.face_confidence,
        attended_at=a.attended_at, notes=a.notes, employee_line=None,
        absence_reason=reason, absence_note=note,
    )


def map_session(s: WorkshopMeetingSession, db: Session) -> MeetingSessionOut:
    host = db.get(Employee, s.host_id) if s.host_id else None
    attendances = db.scalars(
        select(WorkshopMeetingAttendance).where(WorkshopMeetingAttendance.session_id == s.id)
    ).all()
    source = db.get(WorkshopMeetingSession, s.source_session_id) if s.source_session_id else s
    summaries = db.scalars(
        select(WorkshopMeetingSummary).where(WorkshopMeetingSummary.session_id == source.id)
    ).all()
    roster = s.roster if s.roster is not None else build_roster(db, [s.workshop_id])
    source_roster = source.roster if source.roster is not None else roster
    line_codes = sorted({code for item in source_roster for code in item["line_codes"]})
    participants = []
    for item in roster:
        employee = db.get(Employee, item["employee_id"])
        participants.append({**item, "photo_url": employee.photo_url if employee else None})
    return MeetingSessionOut(
        id=s.id, line_id=SESSION_PLACEHOLDER_LINE, leader_id=s.host_id,
        leader_name=host.name if host else None, leader_employee_no=host.employee_no if host else None,
        date=s.date, shift="Shift 1", session_type="workshop", session_number=1,
        label=s.label, scheduled_time=s.scheduled_time, status=s.status,
        started_at=s.started_at, ended_at=s.ended_at, duration_seconds=s.duration_seconds,
        meeting_scope="dm" if len(line_codes) > 1 else "line", source_session_id=s.source_session_id,
        dm_group_name=None, meeting_line_codes=line_codes,
        participants=participants, roster_prepared=s.roster is not None,
        attendances=[map_attendance(a, db.get(Employee, a.employee_id)) for a in attendances],
        summaries=[
            MeetingSummaryOut(
                id=sm.id, session_id=sm.session_id, line_id=SESSION_PLACEHOLDER_LINE, problem=sm.problem,
                problem_categories=sm.problem_categories, solution=sm.solution, pic_name=sm.pic_name,
                pic_id=sm.pic_id, due_date=sm.due_date, line_code=sm.line_code, status=sm.status,
                created_at=sm.created_at,
            )
            for sm in summaries
        ],
    )


@router.get("/mine", response_model=list[WorkshopRefOut])
def my_workshops(
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> list[WorkshopRefOut]:
    stmt = select(Workshop).order_by(Workshop.name)
    if not principal.is_admin:
        if not is_host_supervisor(principal.employee):
            raise HTTPException(403, "Workshop Meeting hanya bisa dibuka oleh supervisor PROD.")
        assert principal.employee is not None
        stmt = stmt.where(Workshop.id.in_(assigned_workshop_ids(db, principal.employee.id) or {-1}))
    return [WorkshopRefOut(id=w.id, name=w.name) for w in db.scalars(stmt)]


@router.get("/representatives", response_model=list[MeetingRepresentativeOut])
def list_representatives(
    for_employee_no: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> list[MeetingRepresentativeOut]:
    if not principal.is_admin and not is_host_supervisor(principal.employee):
        raise HTTPException(403, "Workshop Meeting hanya bisa dibuka oleh supervisor PROD.")
    absent = db.scalars(select(Employee).where(Employee.employee_no == for_employee_no)).first()
    if absent is None:
        raise HTTPException(404, "Peserta tidak ditemukan.")
    return [
        MeetingRepresentativeOut(employee_no=e.employee_no, name=e.name)
        for e in same_dept_representatives(db, absent)
    ]


@router.get("/sessions", response_model=list[MeetingSessionOut])
def list_sessions(
    workshop_id: int,
    date_val: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> list[MeetingSessionOut]:
    if db.get(Workshop, workshop_id) is None:
        raise HTTPException(404, "Workshop tidak ditemukan.")
    authorize_workshop(db, principal, workshop_id)
    session = db.scalars(select(WorkshopMeetingSession).where(
        WorkshopMeetingSession.workshop_id == workshop_id, WorkshopMeetingSession.date == date_val,
    )).first()
    if session is None:
        session = WorkshopMeetingSession(
            workshop_id=workshop_id, date=date_val, label=WORKSHOP_MEETING_LABEL,
            scheduled_time=WORKSHOP_MEETING_TIME, status="pending", duration_seconds=0,
        )
        host_session = db.scalars(select(WorkshopMeetingSession).where(
            WorkshopMeetingSession.date == date_val,
            WorkshopMeetingSession.roster.is_not(None),
            WorkshopMeetingSession.source_session_id.is_(None),
        )).first()
        if host_session is not None:
            session.source_session_id = host_session.id
            session.roster = build_roster(db, [workshop_id])
            session.host_id = host_session.host_id
            session.status = host_session.status
            session.started_at = host_session.started_at
            session.ended_at = host_session.ended_at
            session.duration_seconds = host_session.duration_seconds
        db.add(session)
        db.commit()
        db.refresh(session)
    return [map_session(session, db)]


@router.get("/sessions/{session_id}", response_model=MeetingSessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> MeetingSessionOut:
    session = load_session(db, session_id)
    authorize_workshop(db, principal, session.workshop_id)
    return map_session(session, db)


@router.post("/sessions/{session_id}/prepare", response_model=MeetingSessionOut)
def prepare_session(
    session_id: int,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> MeetingSessionOut:
    session = db.scalars(
        select(WorkshopMeetingSession).where(WorkshopMeetingSession.id == session_id).with_for_update()
    ).first()
    if session is None:
        raise HTTPException(404, "Sesi meeting tidak ditemukan.")
    authorize_host(db, principal, session)
    if session.roster is None:
        if session.status != "pending":
            raise HTTPException(409, "Sesi ini sudah dimulai atau selesai.")
        day = list(db.scalars(
            select(WorkshopMeetingSession)
            .where(WorkshopMeetingSession.date == session.date)
            .order_by(WorkshopMeetingSession.workshop_id)
            .with_for_update()
        ).all())
        for other in day:
            if other.id != session.id and (other.roster is not None or other.source_session_id or other.status != "pending"):
                raise HTTPException(409, "Presensi workshop hari ini sudah dibuka oleh supervisor PROD lain.")
        workshop_ids = sorted(set(db.scalars(
            select(SupervisorWorkshop.workshop_id)
            .join(Employee, Employee.id == SupervisorWorkshop.employee_id)
            .where(Employee.role == "supervisor", Employee.is_active.is_(True))
        )) | {session.workshop_id})
        roster = build_roster(db, workshop_ids)
        if not roster:
            raise HTTPException(400, "Belum ada supervisor yang ditugaskan ke workshop.")
        host_id = principal.employee.id if principal.employee else None
        session.roster = roster
        session.host_id = host_id
        db.flush()
        existing = {item.workshop_id: item for item in day}
        for workshop_id in workshop_ids:
            if workshop_id == session.workshop_id:
                continue
            target = existing.get(workshop_id)
            if target is None:
                target = WorkshopMeetingSession(
                    workshop_id=workshop_id, date=session.date, label=session.label,
                    scheduled_time=session.scheduled_time, status="pending", duration_seconds=0,
                )
                db.add(target)
            target.source_session_id = session.id
            target.host_id = host_id
            target.label = session.label
            target.scheduled_time = session.scheduled_time
            target.roster = build_roster(db, [workshop_id])
    db.commit()
    db.refresh(session)
    return map_session(session, db)


@router.put("/sessions/{session_id}/absence-notes", response_model=MeetingSessionOut)
def save_absence_notes(
    session_id: int,
    payload: AbsenceNotesIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> MeetingSessionOut:
    session = load_session(db, session_id)
    authorize_host(db, principal, session)
    if session.status == "completed":
        raise HTTPException(409, "Sesi ini sudah selesai.")
    employees = {
        e.employee_no: e
        for e in db.scalars(select(Employee).where(Employee.employee_no.in_([i.employee_no for i in payload.items])))
    }
    now = datetime.now()
    for item in payload.items:
        employee = employees.get(item.employee_no)
        if employee is None:
            raise HTTPException(400, "Peserta tidak ditemukan.")
        require_participant(db, session, employee.id)
        attendance = db.scalars(select(WorkshopMeetingAttendance).where(
            WorkshopMeetingAttendance.session_id == session.id, WorkshopMeetingAttendance.employee_id == employee.id,
        )).first()
        if attendance is not None and attendance.status == "present":
            continue
        if attendance is None:
            attendance = WorkshopMeetingAttendance(session_id=session.id, employee_id=employee.id)
            db.add(attendance)
        text = (item.note or "").strip()
        if item.reason == "represented":
            if text:
                validate_representative(db, employee, text)
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
        db.flush()
        sync_attendance(db, session, attendance)
    db.commit()
    db.refresh(session)
    return map_session(session, db)


@router.post("/sessions/{session_id}/presensi/close", response_model=MeetingSessionOut)
def close_presensi(
    session_id: int,
    payload: PresensiCloseIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> MeetingSessionOut:
    session = load_session(db, session_id)
    authorize_host(db, principal, session)
    if session.status == "completed":
        raise HTTPException(409, "Sesi ini sudah selesai.")
    employees = db.scalars(select(Employee).where(Employee.employee_no.in_(payload.absent_employee_nos))).all()
    for employee in employees:
        require_participant(db, session, employee.id)
        attendance = db.scalars(select(WorkshopMeetingAttendance).where(
            WorkshopMeetingAttendance.session_id == session.id, WorkshopMeetingAttendance.employee_id == employee.id,
        )).first()
        if attendance is not None and attendance.status != "absent":
            continue
        if attendance is None:
            attendance = WorkshopMeetingAttendance(session_id=session.id, employee_id=employee.id)
            db.add(attendance)
        attendance.status = "absent"
        attendance.verification_method = "manual"
        attendance.face_confidence = None
        db.flush()
        sync_attendance(db, session, attendance)
    db.commit()
    db.refresh(session)
    return map_session(session, db)


@router.post("/sessions/{session_id}/start", response_model=MeetingSessionOut)
def start_session(
    session_id: int,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> MeetingSessionOut:
    session = load_session(db, session_id)
    authorize_host(db, principal, session)
    if session.status == "completed":
        raise HTTPException(409, "Sesi ini sudah selesai.")
    if session.roster is None:
        raise HTTPException(409, "Buka presensi meeting terlebih dahulu.")
    if session.status != "in_progress":
        session.status = "in_progress"
        session.started_at = datetime.now()
    sync_sessions(db, session)
    db.commit()
    db.refresh(session)
    return map_session(session, db)


@router.post("/sessions/{session_id}/end", response_model=MeetingSessionOut)
def end_session(
    session_id: int,
    payload: MeetingSessionEndIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> MeetingSessionOut:
    session = load_session(db, session_id)
    authorize_host(db, principal, session)
    if session.status != "in_progress":
        raise HTTPException(409, "Meeting belum dimulai atau sudah selesai.")
    now = datetime.now()
    session.ended_at = now
    session.status = "completed"
    if session.started_at:
        session.duration_seconds = max(1, int((now - session.started_at.replace(tzinfo=None)).total_seconds()))
    else:
        session.duration_seconds = 900
    sync_sessions(db, session)

    for sm in payload.summaries:
        pic_id = sm.pic_id
        pic_name = sm.pic_name
        if pic_id is None and sm.pic_employee_no:
            pic = db.scalars(select(Employee).where(Employee.employee_no == sm.pic_employee_no)).first()
            if pic is None or not pic.is_active:
                raise HTTPException(400, "User PIC tidak ditemukan atau sudah nonaktif.")
            pic_id = pic.id
            pic_name = pic.name
        db.add(WorkshopMeetingSummary(
            session_id=session.id, problem=sm.problem, problem_categories=sm.problem_categories,
            pic_name=pic_name, pic_id=pic_id, due_date=sm.due_date, line_code=sm.line_code, status="open",
        ))
    db.commit()
    db.refresh(session)

    if payload.summaries:
        workshop = db.get(Workshop, session.workshop_id)
        background_tasks.add_task(
            notify_new_problems,
            line_code=workshop.name if workshop else "-",
            session_label=session.label,
            summaries=payload.summaries,
        )
    return map_session(session, db)


def liveness_key(session_id: int) -> int:
    return -session_id


def open_scan_session(db: Session, principal: Principal, session_id: int) -> WorkshopMeetingSession:
    session = load_session(db, session_id)
    if session.status == "completed":
        raise HTTPException(409, "Sesi ini sudah selesai.")
    authorize_host(db, principal, session)
    if session.roster is None:
        raise HTTPException(409, "Buka presensi meeting terlebih dahulu.")
    return session


@router.post("/sessions/{session_id}/challenge", response_model=FaceChallengeOut)
def request_challenge(
    session_id: int,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> FaceChallengeOut:
    open_scan_session(db, principal, session_id)
    if not settings.face_liveness_enabled:
        return FaceChallengeOut(required=False)
    token, direction = liveness.issue(liveness_key(session_id))
    return FaceChallengeOut(
        required=True, token=token, direction=direction, expires_in=settings.face_challenge_seconds
    )


@router.post("/sessions/{session_id}/scan", response_model=FaceScanOut)
def scan_attendance(
    session_id: int,
    frames: list[UploadFile] = File(...),
    token: str | None = Form(None),
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> FaceScanOut:
    session = open_scan_session(db, principal, session_id)
    if not 1 <= len(frames) <= MAX_FRAMES:
        raise HTTPException(status_code=400, detail=f"Kirim 1 sampai {MAX_FRAMES} gambar.")

    results: list[FaceResult] = []
    try:
        for frame in frames:
            data = frame.file.read(MAX_FRAME_BYTES + 1)
            if len(data) > MAX_FRAME_BYTES:
                raise HTTPException(status_code=413, detail="Gambar terlalu besar.")
            results.append(extract_face(data))
    except FaceError as exc:
        return not_recognized(str(exc))

    failure = check_liveness(results, token, liveness_key(session_id))
    if failure:
        return not_recognized(failure)

    result = min(results, key=lambda r: abs(r.yaw))
    if settings.face_antispoof_enabled:
        real = antispoof.real_score(result)
        logger.info("antispoof real=%.3f yaw=%.1f min=%.2f", real, result.yaw, settings.face_antispoof_min_real)
        if real < settings.face_antispoof_min_real:
            return not_recognized("Terdeteksi bukan wajah asli. Hadapkan wajah langsung ke kamera.")
    match = matcher.identify(result.embedding)
    if match is None:
        return not_recognized("Wajah tidak dikenali. Coba scan lagi.")

    employee = db.get(Employee, match.employee_id)
    require_participant(db, session, match.employee_id)
    attendance = db.scalars(select(WorkshopMeetingAttendance).where(
        WorkshopMeetingAttendance.session_id == session_id, WorkshopMeetingAttendance.employee_id == match.employee_id,
    )).first()
    if attendance is not None and attendance.status == "present":
        sync_attendance(db, session, attendance)
        db.commit()
        return FaceScanOut(recognized=True, already_present=True, attendance=map_attendance(attendance, employee))

    if attendance is None:
        attendance = WorkshopMeetingAttendance(session_id=session_id, employee_id=match.employee_id)
        db.add(attendance)
    attendance.status = "present"
    attendance.verification_method = "face_id"
    attendance.face_confidence = match.score
    attendance.attended_at = datetime.now(timezone.utc)
    db.flush()
    sync_attendance(db, session, attendance)

    if match.score >= settings.face_update_threshold:
        camera_count = db.scalar(
            select(func.count()).select_from(FaceTemplate).where(
                FaceTemplate.employee_id == match.employee_id, FaceTemplate.source == "camera"
            )
        )
        if camera_count < MAX_CAMERA_TEMPLATES:
            db.add(FaceTemplate(
                employee_id=match.employee_id,
                embedding=result.embedding.astype(np.float32).tobytes(),
                source="camera",
                quality=result.quality,
            ))
    db.commit()
    db.refresh(attendance)
    matcher.reload(db)
    return FaceScanOut(recognized=True, attendance=map_attendance(attendance, employee))


@router.get("/assignments", response_model=list[WorkshopSupervisorsOut])
def list_assignments(
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
) -> list[WorkshopSupervisorsOut]:
    grouped: dict[int, list[SupervisorWorkshop]] = {}

    rows = db.scalars(
        select(SupervisorWorkshop).order_by(
            SupervisorWorkshop.workshop_id,
            SupervisorWorkshop.employee_id,
        )
    )

    for row in rows:
        grouped.setdefault(row.workshop_id, []).append(row)

    return [
        WorkshopSupervisorsOut(
            workshop_id=workshop_id,
            employee_ids=[row.employee_id for row in members],
            responsibilities={
                row.employee_id: row.responsibility
                for row in members
            },
        )
        for workshop_id, members in grouped.items()
    ]


@router.put("/assignments/{workshop_id}", response_model=WorkshopSupervisorsOut)
def save_assignment(
    workshop_id: int,
    payload: WorkshopSupervisorsIn,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
) -> WorkshopSupervisorsOut:
    if db.get(Workshop, workshop_id) is None:
        raise HTTPException(404, "Workshop tidak ditemukan.")

    wanted = set(payload.employee_ids)

    if not set(payload.responsibilities).issubset(wanted):
        raise HTTPException(
            400,
            "Tugas hanya bisa diisi untuk supervisor yang dipilih.",
        )

    valid = (
        set(
            db.scalars(
                select(Employee.id).where(
                    Employee.id.in_(wanted),
                    Employee.role == "supervisor",
                    Employee.is_active.is_(True),
                )
            )
        )
        if wanted
        else set()
    )

    if valid != wanted:
        raise HTTPException(
            400,
            "Hanya akun supervisor aktif yang bisa ditugaskan ke workshop.",
        )

    current = {
        row.employee_id: row
        for row in db.scalars(
            select(SupervisorWorkshop).where(
                SupervisorWorkshop.workshop_id == workshop_id
            )
        )
    }

    for employee_id, row in current.items():
        if employee_id not in wanted:
            db.delete(row)

    saved_responsibilities: dict[int, str | None] = {}

    for employee_id in sorted(wanted):
        row = current.get(employee_id)

        if row is None:
            row = SupervisorWorkshop(
                employee_id=employee_id,
                workshop_id=workshop_id,
            )
            db.add(row)

        if employee_id in payload.responsibilities:
            value = payload.responsibilities[employee_id]
            row.responsibility = (value or "").strip() or None

        saved_responsibilities[employee_id] = row.responsibility

    db.commit()

    return WorkshopSupervisorsOut(
        workshop_id=workshop_id,
        employee_ids=sorted(wanted),
        responsibilities=saved_responsibilities,
    )