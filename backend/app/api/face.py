from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import Employee, FaceTemplate
from app.services.face.enrollment import EnrollError, enroll_photo
from app.services.face.matcher import matcher

router = APIRouter(prefix="/face", tags=["face"], dependencies=[Depends(get_current_admin)])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


@router.post("/enroll/{employee_id}", status_code=status.HTTP_201_CREATED)
def enroll(
    employee_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    employee = db.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Karyawan tidak ditemukan.")
    data = photo.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Foto maksimal 5 MB.")
    try:
        quality = enroll_photo(db, employee_id, data)
    except EnrollError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    db.commit()
    matcher.reload(db)
    return {"employee_id": employee_id, "quality": round(quality, 3)}


@router.get("/status/{employee_id}")
def status_of(employee_id: int, db: Session = Depends(get_db)) -> dict:
    rows = db.execute(
        select(FaceTemplate.source, func.count()).where(FaceTemplate.employee_id == employee_id).group_by(FaceTemplate.source)
    ).all()
    counts = {source: count for source, count in rows}
    return {"employee_id": employee_id, "photo": counts.get("photo", 0), "camera": counts.get("camera", 0)}


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove(employee_id: int, db: Session = Depends(get_db)) -> Response:
    db.execute(delete(FaceTemplate).where(FaceTemplate.employee_id == employee_id))
    db.commit()
    matcher.reload(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
