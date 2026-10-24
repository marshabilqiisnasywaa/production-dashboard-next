import logging

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_active_principal
from app.api.meetings import _map_attendance
from app.core.config import settings
from app.db.session import get_db
from app.models import DmMeetingAttendance, DmMeetingSession, Employee, FaceTemplate
from app.schemas import FaceChallengeOut, FaceScanOut
from app.services.face import antispoof, liveness
from app.services.face.engine import FaceError, FaceResult, extract_face
from app.services.face.matcher import matcher
from app.services.meeting_attendance import home_line_code
from app.services import joint_meetings

router = APIRouter(prefix="/meetings", tags=["meetings"])
logger = logging.getLogger("uvicorn.error")

MAX_FRAME_BYTES = 2 * 1024 * 1024
MAX_FRAMES = 4
MAX_CAMERA_TEMPLATES = 3


def not_recognized(message: str) -> FaceScanOut:
    return FaceScanOut(recognized=False, message=message)


def open_session(db: Session, principal: Principal, session_id: int) -> DmMeetingSession:
    if principal.role == "member":
        raise HTTPException(status_code=403, detail="Hanya Leader yang berwenang memindai kehadiran.")
    session = db.get(DmMeetingSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan.")
    if session.status == "completed":
        raise HTTPException(status_code=409, detail="Sesi ini sudah selesai.")
    joint_meetings.authorize_host(db, principal, session)
    if session.roster is None:
        raise HTTPException(409, "Buka presensi meeting terlebih dahulu.")
    return session


def check_liveness(results: list[FaceResult], token: str | None, session_id: int) -> str | None:
    if not settings.face_liveness_enabled:
        return None
    challenge = liveness.consume(token, session_id) if token else None
    if challenge is None:
        return "Tantangan kedaluwarsa atau tidak valid. Ulangi."
    if len(results) < 2:
        return "Butuh minimal 2 gambar untuk verifikasi gerakan."
    first = results[0]
    for other in results[1:]:
        if float(other.embedding @ first.embedding) < settings.face_liveness_same_person:
            return "Wajah berubah selama verifikasi. Ulangi."
    if challenge.direction is None:
        if not liveness.moved_enough([(r.pitch, r.yaw) for r in results]):
            return "Gerakan kepala tidak terdeteksi. Gerakkan kepala sedikit."
    elif not liveness.turned_enough(first.yaw, results[-1].yaw, challenge.direction):
        return "Gerakan kepala tidak sesuai arah yang diminta. Ulangi."
    return None



@router.post("/sessions/{session_id}/challenge", response_model=FaceChallengeOut)
def request_challenge(
    session_id: int,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_active_principal),
) -> FaceChallengeOut:
    open_session(db, principal, session_id)
    if not settings.face_liveness_enabled:
        return FaceChallengeOut(required=False)
    token, direction = liveness.issue(session_id)
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
    session = open_session(db, principal, session_id)
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

    failure = check_liveness(results, token, session_id)
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
    joint_meetings.require_participant(db, session, match.employee_id)
    home_line = joint_meetings.participant_line(session, match.employee_id) or home_line_code(db, match.employee_id)
    attendance = db.scalars(
        select(DmMeetingAttendance).where(
            DmMeetingAttendance.session_id == session_id,
            DmMeetingAttendance.employee_id == match.employee_id,
        )
    ).first()
    if attendance is not None and attendance.status == "present":
        joint_meetings.sync_attendance(db, session, attendance)
        db.commit()
        return FaceScanOut(
            recognized=True, already_present=True, attendance=_map_attendance(attendance, employee, home_line)
        )

    if attendance is None:
        attendance = DmMeetingAttendance(session_id=session_id, employee_id=match.employee_id)
        db.add(attendance)
    attendance.status = "present"
    attendance.verification_method = "face_id"
    attendance.face_confidence = match.score
    db.flush()
    joint_meetings.sync_attendance(db, session, attendance)


    if match.score >= settings.face_update_threshold:
        camera_count = db.scalar(
            select(func.count()).select_from(FaceTemplate).where(
                FaceTemplate.employee_id == match.employee_id, FaceTemplate.source == "camera"
            )
        )
        if camera_count < MAX_CAMERA_TEMPLATES:
            db.add(
                FaceTemplate(
                    employee_id=match.employee_id,
                    embedding=result.embedding.astype(np.float32).tobytes(),
                    source="camera",
                    quality=result.quality,
                )
            )
    db.commit()
    db.refresh(attendance)
    matcher.reload(db)
    return FaceScanOut(recognized=True, attendance=_map_attendance(attendance, employee, home_line))