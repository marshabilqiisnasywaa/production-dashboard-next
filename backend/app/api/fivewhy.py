import io
from pathlib import Path
from uuid import uuid4
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Principal, require
from app.core.config import settings
from app.db.session import get_db
from app.models import Employee, Line
from app.models.fivewhy import FiveWhyDocument
from app.schemas_fivewhy import DocumentCategory, SimoDocumentIn
from app.services.accounts import forbidden
from app.services.fivewhy import document_access, line_leaders, pic_candidates, supervisor_for, upload_line_ids, validate_pic

router = APIRouter(prefix="/fivewhy", tags=["fivewhy"])
MAX_FILE_BYTES = 20 * 1024 * 1024


def can_write(principal: Principal) -> None:
    if principal.role not in ("leader", "member") or principal.employee is None:
        raise forbidden("Hanya leader dan member pada line terkait yang bisa mengelola dokumen.")


def document_out(row: FiveWhyDocument, db: Session) -> dict:
    line = db.get(Line, row.line_id)
    pic = db.get(Employee, row.pic_id) if row.pic_id is not None else None
    return {
        "id": row.id, "title": row.title, "category": row.category,
        "source": row.source, "url": row.url, "fileName": row.file_name,
        "size": row.size, "createdAt": row.created_at,
        "lineId": row.line_id,
        "lineCode": line.code if line else "",
        "picId": row.pic_id,
        "picName": pic.name if pic else None,
    }


def file_path(document_id: str) -> Path:
    return Path(settings.upload_dir) / "fivewhy" / f"{document_id}.xlsx"


@router.get("/documents")
def list_documents(principal: Principal = Depends(require("problems.read")), db: Session = Depends(get_db)):
    rows = db.scalars(select(FiveWhyDocument).where(document_access(db, principal)).order_by(FiveWhyDocument.created_at.desc()))
    return [document_out(row, db) for row in rows]


@router.get("/documents/options")
def document_options(principal: Principal = Depends(require("problems.write")), db: Session = Depends(get_db)):
    can_write(principal)
    result = []
    for line in db.scalars(select(Line).where(Line.id.in_(upload_line_ids(db, principal))).order_by(Line.code)):
        pics = []
        for pic in pic_candidates(db, principal, line):
            supervisor = supervisor_for(db, pic)
            pics.append({"id": pic.id, "name": pic.name, "employeeNo": pic.employee_no, "supervisorName": supervisor.name if supervisor else None})
        result.append({"id": line.id, "code": line.code, "leaders": [person.name for person in line_leaders(db, line)], "pics": pics})
    return result


@router.post("/documents/simo", status_code=201)
def add_simo_document(payload: SimoDocumentIn, principal: Principal = Depends(require("problems.write")), db: Session = Depends(get_db)):
    can_write(principal)
    validate_pic(db, principal, payload.line_id, payload.pic_id)
    assert principal.employee is not None
    row = FiveWhyDocument(id=str(uuid4()), line_id=payload.line_id, pic_id=payload.pic_id, created_by=principal.employee.id, title=payload.title, category=payload.category, source="simo", url=payload.url)
    db.add(row)
    db.commit()
    db.refresh(row)
    return document_out(row, db)


@router.post("/documents/file", status_code=201)
def upload_document(line_id: int = Form(gt=0), pic_id: int = Form(gt=0), title: str = Form(min_length=1, max_length=200), category: DocumentCategory = Form(), file: UploadFile = File(), principal: Principal = Depends(require("problems.write")), db: Session = Depends(get_db)):
    can_write(principal)
    validate_pic(db, principal, line_id, pic_id)
    if not title.strip():
        raise HTTPException(422, "Judul dokumen wajib diisi.")
    name = (file.filename or "").replace("\\", "/").rsplit("/", 1)[-1]
    if not name.lower().endswith(".xlsx") or len(name) > 255:
        raise HTTPException(422, "Gunakan file Excel .xlsx dengan nama maksimal 255 karakter.")
    content = file.file.read(MAX_FILE_BYTES + 1)
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(413, "File Excel maksimal 20 MB.")
    try:
        with ZipFile(io.BytesIO(content)) as workbook:
            names = set(workbook.namelist())
            if not {"[Content_Types].xml", "xl/workbook.xml"}.issubset(names) or any(name.lower().endswith("vbaproject.bin") for name in names):
                raise ValueError()
            if len(names) > 10000 or sum(item.file_size for item in workbook.infolist()) > 200 * 1024 * 1024:
                raise ValueError()
            if any(workbook.getinfo(name).file_size > 5 * 1024 * 1024 for name in ("[Content_Types].xml", "xl/workbook.xml")):
                raise ValueError()
            root = ElementTree.fromstring(workbook.read("xl/workbook.xml"))
            content_types = ElementTree.fromstring(workbook.read("[Content_Types].xml"))
            if root.tag != "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}workbook" or not any(item.get("PartName") == "/xl/workbook.xml" and item.get("ContentType") == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml" for item in content_types):
                raise ValueError()
            if workbook.testzip() is not None:
                raise ValueError()
    except (BadZipFile, ValueError, RuntimeError, NotImplementedError, ElementTree.ParseError):
        raise HTTPException(422, "File bukan workbook .xlsx yang valid atau ukurannya terlalu besar setelah dibuka.")
    assert principal.employee is not None
    row = FiveWhyDocument(id=str(uuid4()), line_id=line_id, pic_id=pic_id, created_by=principal.employee.id, title=title.strip(), category=category, source="file", file_name=name, size=len(content))
    path = file_path(row.id)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        path.write_bytes(content)
        db.add(row)
        db.commit()
    except Exception:
        db.rollback()
        path.unlink(missing_ok=True)
        raise
    db.refresh(row)
    return document_out(row, db)


def document(db: Session, principal: Principal, document_id: str) -> FiveWhyDocument:
    row = db.scalar(select(FiveWhyDocument).where(FiveWhyDocument.id == document_id, document_access(db, principal)))
    if row is None:
        raise HTTPException(404, "Dokumen tidak ditemukan.")
    return row


@router.get("/documents/{document_id}/download")
def download_document(document_id: str, principal: Principal = Depends(require("problems.read")), db: Session = Depends(get_db)):
    row = document(db, principal, document_id)
    path = file_path(row.id)
    if row.source != "file" or not path.is_file():
        raise HTTPException(404, "File tidak ditemukan.")
    return FileResponse(path, filename=row.file_name, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(document_id: str, principal: Principal = Depends(require("problems.write")), db: Session = Depends(get_db)):
    can_write(principal)
    row = document(db, principal, document_id)
    path = file_path(row.id) if row.source == "file" else None
    db.delete(row)
    db.commit()
    if path:
        path.unlink(missing_ok=True)
    return Response(status_code=204)
