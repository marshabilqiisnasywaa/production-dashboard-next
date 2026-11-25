import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import Principal, require
from app.core.config import settings
from app.db.session import get_db
from app.models import Employee, Line
from app.models.fivewhy import FiveWhyAnalysis, FiveWhyPhoto
from app.schemas_fivewhy import AnalysisCreateIn, AnalysisIn
from app.services.accounts import forbidden
from app.services.fivewhy import upload_line_ids
from app.services.fivewhy_analyses import (
    can_edit,
    countermeasures,
    editor_lines,
    empty_data,
    incident_brief,
    is_major,
    next_nomor,
    require_photos_owned,
    root_cause_text,
    settle_category,
    section,
    solution_counts,
)

router = APIRouter(prefix="/fivewhy", tags=["fivewhy"])
MAX_PHOTO_BYTES = 5 * 1024 * 1024
MAX_PHOTOS_PER_ANALYSIS = 60
NOMOR_ATTEMPTS = 5
PHOTO_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def photo_path(photo: FiveWhyPhoto) -> Path:
    return Path(settings.upload_dir) / "fivewhy" / "photos" / f"{photo.id}.{PHOTO_TYPES[photo.content_type]}"


def detect_image(content: bytes) -> str | None:
    if content.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    return None


def can_write(principal: Principal) -> None:
    if principal.role not in ("leader", "member") or principal.employee is None:
        raise forbidden("Hanya leader dan member yang bisa mengisi analisis 5Why.")


def line_code_of(row: FiveWhyAnalysis, lines: dict[int, Line]) -> str:
    line = lines.get(row.line_id) if row.line_id is not None else None
    return line.code if line else (row.line_code or "")


def summary_out(row: FiveWhyAnalysis, principal: Principal, lines: dict[int, Line], people: dict[int, Employee], photo_count: int, leader_lines: set[int]) -> dict:
    abnormal = section(row.data, "abnormal", dict)
    creator = people.get(row.created_by)
    return {
        "id": row.id, "nomor": row.nomor, "title": row.title, "status": row.status,
        "lineId": row.line_id, "lineCode": line_code_of(row, lines),
        "pengusul": abnormal.get("pengusul") or (creator.name if creator else ""),
        "createdByName": creator.name if creator else None,
        "major": is_major(abnormal),
        "rootCause": root_cause_text(section(row.data, "whys", list)),
        "solutionCounts": solution_counts(section(row.data, "solutions", list)),
        "countermeasures": countermeasures(section(row.data, "solutions", list)),
        **incident_brief(abnormal),
        "photoCount": photo_count,
        "createdAt": row.created_at, "updatedAt": row.updated_at,
        "canEdit": can_edit(principal, row, leader_lines),
    }


def detail_out(db: Session, row: FiveWhyAnalysis, principal: Principal) -> dict:
    lines = {line.id: line for line in [db.get(Line, row.line_id)] if line} if row.line_id is not None else {}
    creator = db.get(Employee, row.created_by)
    photo_count = db.scalar(select(func.count()).select_from(FiveWhyPhoto).where(FiveWhyPhoto.analysis_id == row.id)) or 0
    item = summary_out(row, principal, lines, {creator.id: creator} if creator else {}, photo_count, editor_lines(db, principal))
    return {
        **item, "revision": row.revision,
        "abnormal": section(row.data, "abnormal", dict),
        "whys": section(row.data, "whys", list),
        "solutions": section(row.data, "solutions", list),
    }


def load(db: Session, analysis_id: str, *, lock: bool = False) -> FiveWhyAnalysis:
    query = select(FiveWhyAnalysis).where(FiveWhyAnalysis.id == analysis_id)
    row = db.scalar(query.with_for_update() if lock else query)
    if row is None:
        raise HTTPException(404, "Analisis tidak ditemukan.")
    return row


def load_editable(db: Session, principal: Principal, analysis_id: str, *, lock: bool = False) -> FiveWhyAnalysis:
    can_write(principal)
    row = load(db, analysis_id, lock=lock)
    if not can_edit(principal, row, editor_lines(db, principal)):
        raise forbidden("Kamu tidak bisa mengubah analisis ini.")
    return row


@router.get("/analyses")
def list_analyses(principal: Principal = Depends(require("problems.read")), db: Session = Depends(get_db)):
    rows = list(db.scalars(select(FiveWhyAnalysis).order_by(FiveWhyAnalysis.created_at.desc(), FiveWhyAnalysis.id)))
    line_ids = {row.line_id for row in rows if row.line_id is not None}
    lines = {line.id: line for line in db.scalars(select(Line).where(Line.id.in_(line_ids)))} if line_ids else {}
    people = {person.id: person for person in db.scalars(select(Employee).where(Employee.id.in_({row.created_by for row in rows})))} if rows else {}
    counts = dict(db.execute(select(FiveWhyPhoto.analysis_id, func.count()).group_by(FiveWhyPhoto.analysis_id)).all())
    leader_lines = editor_lines(db, principal)
    return [summary_out(row, principal, lines, people, counts.get(row.id, 0), leader_lines) for row in rows]


@router.get("/analyses/{analysis_id}")
def get_analysis(analysis_id: str, principal: Principal = Depends(require("problems.read")), db: Session = Depends(get_db)):
    return detail_out(db, load(db, analysis_id), principal)


@router.post("/analyses", status_code=201)
def create_analysis(payload: AnalysisCreateIn, principal: Principal = Depends(require("problems.write")), db: Session = Depends(get_db)):
    can_write(principal)
    if payload.line_id not in upload_line_ids(db, principal):
        raise forbidden("Line analisis harus sesuai penugasan aktif kamu.")
    line = db.get(Line, payload.line_id)
    if line is None:
        raise forbidden("Line analisis tidak ditemukan.")
    assert principal.employee is not None
    now = datetime.now(timezone.utc)
    for _ in range(NOMOR_ATTEMPTS):
        analysis_id = str(uuid4())
        row = FiveWhyAnalysis(
            id=analysis_id, line_id=line.id, line_code=line.code, created_by=principal.employee.id,
            nomor=next_nomor(db, now), title="", status="draft", revision=1,
            data=empty_data(line.code, principal.employee.name, now, analysis_id),
        )
        try:
            with db.begin_nested():
                db.add(row)
                db.flush()
        except IntegrityError:
            continue
        db.commit()
        db.refresh(row)
        return detail_out(db, row, principal)
    raise HTTPException(503, "Nomor analisis sedang bentrok. Coba lagi.")


@router.put("/analyses/{analysis_id}")
def update_analysis(analysis_id: str, payload: AnalysisIn, principal: Principal = Depends(require("problems.write")), db: Session = Depends(get_db)):
    row = load_editable(db, principal, analysis_id, lock=True)
    if payload.revision != row.revision:
        raise HTTPException(409, "Analisis ini sudah diubah orang lain. Muat ulang sebelum menyimpan.")
    wanted = payload.photo_ids()
    if wanted:
        found = set(db.scalars(select(FiveWhyPhoto.id).where(FiveWhyPhoto.analysis_id == row.id, FiveWhyPhoto.id.in_(wanted))))
        require_photos_owned(found, wanted)
    body = payload.model_dump(by_alias=True)
    body["abnormal"]["categoryCodes"], body["abnormal"]["categoryLabels"] = settle_category(db, row, body["abnormal"])
    row.data = {"abnormal": body["abnormal"], "whys": body["whys"], "solutions": body["solutions"]}
    row.title = payload.abnormal.label.strip()
    row.status = payload.status
    row.revision = row.revision + 1
    db.commit()
    db.refresh(row)
    return detail_out(db, row, principal)


@router.delete("/analyses/{analysis_id}", status_code=204)
def delete_analysis(analysis_id: str, principal: Principal = Depends(require("problems.write")), db: Session = Depends(get_db)):
    row = load_editable(db, principal, analysis_id)
    paths = [photo_path(photo) for photo in db.scalars(select(FiveWhyPhoto).where(FiveWhyPhoto.analysis_id == row.id))]
    db.delete(row)
    db.commit()
    for path in paths:
        path.unlink(missing_ok=True)
    return Response(status_code=204)


@router.post("/analyses/{analysis_id}/photos", status_code=201)
def upload_photo(analysis_id: str, file: UploadFile = File(), principal: Principal = Depends(require("problems.write")), db: Session = Depends(get_db)):
    row = load_editable(db, principal, analysis_id, lock=True)
    content = file.file.read(MAX_PHOTO_BYTES + 1)
    if len(content) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Foto maksimal 5 MB.")
    content_type = detect_image(content)
    if content_type is None:
        raise HTTPException(422, "Gunakan foto JPEG, PNG, atau WebP.")
    stored = db.scalar(select(func.count()).select_from(FiveWhyPhoto).where(FiveWhyPhoto.analysis_id == row.id)) or 0
    if stored >= MAX_PHOTOS_PER_ANALYSIS:
        raise HTTPException(422, f"Satu analisis maksimal {MAX_PHOTOS_PER_ANALYSIS} foto.")
    name = (file.filename or "").replace("\\", "/").rsplit("/", 1)[-1].strip()[:255] or f"foto.{PHOTO_TYPES[content_type]}"
    assert principal.employee is not None
    photo = FiveWhyPhoto(id=str(uuid4()), analysis_id=row.id, created_by=principal.employee.id, file_name=name, content_type=content_type, size=len(content))
    path = photo_path(photo)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        path.write_bytes(content)
        db.add(photo)
        db.commit()
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    return {"id": photo.id, "fileName": photo.file_name, "contentType": photo.content_type, "size": photo.size}


@router.get("/photos/{photo_id}")
def get_photo(photo_id: str, principal: Principal = Depends(require("problems.read")), db: Session = Depends(get_db)):
    photo = db.get(FiveWhyPhoto, photo_id)
    if photo is None or not photo_path(photo).is_file():
        raise HTTPException(404, "Foto tidak ditemukan.")
    return FileResponse(photo_path(photo), media_type=photo.content_type, headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"})


@router.delete("/analyses/{analysis_id}/photos/{photo_id}", status_code=204)
def delete_photo(analysis_id: str, photo_id: str, principal: Principal = Depends(require("problems.write")), db: Session = Depends(get_db)):
    row = load_editable(db, principal, analysis_id, lock=True)
    photo = db.scalar(select(FiveWhyPhoto).where(FiveWhyPhoto.id == photo_id, FiveWhyPhoto.analysis_id == row.id))
    if photo is None:
        raise HTTPException(404, "Foto tidak ditemukan.")
    if photo.id in json.dumps(row.data):
        raise HTTPException(409, "Foto masih dipakai di analisis. Simpan analisis tanpa foto ini dulu.")
    path = photo_path(photo)
    db.delete(photo)
    db.commit()
    path.unlink(missing_ok=True)
    return Response(status_code=204)
