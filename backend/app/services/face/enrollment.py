import base64

import numpy as np
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import Employee, FaceTemplate
from app.services.face.engine import FaceError, extract_face

MIN_PHOTO_QUALITY = 0.6


class EnrollError(Exception):
    pass


def decode_data_url(value: str | None) -> bytes | None:
    if not value or not value.startswith("data:image/"):
        return None
    try:
        return base64.b64decode(value.split(",", 1)[1])
    except (IndexError, ValueError):
        return None


def enroll_photo(db: Session, employee_id: int, data: bytes) -> float:
    try:
        result = extract_face(data)
    except FaceError as exc:
        raise EnrollError(str(exc)) from exc
    if result.quality < MIN_PHOTO_QUALITY:
        raise EnrollError("Kualitas foto terlalu rendah, pakai foto yang lebih jelas.")
    db.execute(delete(FaceTemplate).where(FaceTemplate.employee_id == employee_id, FaceTemplate.source == "photo"))
    db.add(
        FaceTemplate(
            employee_id=employee_id,
            embedding=result.embedding.astype(np.float32).tobytes(),
            source="photo",
            quality=result.quality,
        )
    )
    return result.quality


def remove_templates(db: Session, employee_id: int) -> None:
    db.execute(delete(FaceTemplate).where(FaceTemplate.employee_id == employee_id))


def remove_photo_templates(db: Session, employee_id: int) -> None:
    db.execute(delete(FaceTemplate).where(FaceTemplate.employee_id == employee_id, FaceTemplate.source == "photo"))


def photo_template_ids(db: Session) -> set[int]:
    return set(db.scalars(select(FaceTemplate.employee_id).where(FaceTemplate.source == "photo")).all())


def has_photo_template(db: Session, employee_id: int) -> bool:
    found = db.scalar(
        select(FaceTemplate.id).where(FaceTemplate.employee_id == employee_id, FaceTemplate.source == "photo").limit(1)
    )
    return found is not None


def sync_photo(db: Session, employee: Employee) -> str | None:
    if not employee.photo_url:
        remove_templates(db, employee.id)
        return None
    data = decode_data_url(employee.photo_url)
    if data is None:
        remove_photo_templates(db, employee.id)
        return "Format foto tidak didukung untuk Face ID. Unggah foto dari perangkat."
    try:
        enroll_photo(db, employee.id, data)
    except EnrollError as exc:
        remove_photo_templates(db, employee.id)
        return str(exc)
    return None
