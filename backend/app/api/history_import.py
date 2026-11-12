from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import HistoricalEntry, HistoryImportBatch, Line
from app.schemas_history_import import HistoryImportIn, HistoryKind
from app.services import history_import

router = APIRouter(prefix="/history-import", tags=["history-import"])


@router.get("/statuses")
def statuses(
    from_date: date = Query(alias="from"), to_date: date = Query(alias="to"),
    kind: Literal["papercard_status", "attendance"] = "papercard_status", line: str | None = None,
    db: Session = Depends(get_db), _admin=Depends(get_current_admin),
):
    if to_date < from_date or (to_date - from_date).days > 365:
        raise HTTPException(400, "Rentang tanggal tidak valid (maksimal satu tahun).")
    from app.services.imported_statuses import list_imported_statuses
    return list_imported_statuses(db, from_date, to_date, kind, line)


@router.post("/preview")
def preview(payload: HistoryImportIn, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return history_import.preview_import(db, payload)


@router.post("/commit")
def commit(payload: HistoryImportIn, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    try:
        username = getattr(admin, "username", None) or admin.employee_no
        return history_import.commit_import(db, payload, username)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Data berubah selama proses impor. Jalankan preview lagi.")


@router.get("/batches")
def batches(db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return [{
        "id": batch.id, "fileName": batch.file_name, "importedBy": batch.imported_by,
        "added": batch.added, "updated": batch.updated, "skipped": batch.skipped,
        "createdAt": batch.created_at,
    } for batch in db.scalars(select(HistoryImportBatch).order_by(HistoryImportBatch.id.desc()).limit(20))]


@router.get("/entries")
def entries(
    from_date: date = Query(alias="from"), to_date: date = Query(alias="to"),
    kind: HistoryKind | None = None, line_id: int | None = None,
    page: int = Query(default=1, ge=1),
    db: Session = Depends(get_db), _admin=Depends(get_current_admin),
):
    query = select(HistoricalEntry, Line.code).join(Line, Line.id == HistoricalEntry.line_id).where(
        HistoricalEntry.date >= from_date, HistoricalEntry.date <= to_date,
    )
    if kind:
        query = query.where(HistoricalEntry.kind == kind)
    if line_id is not None:
        query = query.where(HistoricalEntry.line_id == line_id)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.execute(query.order_by(HistoricalEntry.date.desc(), HistoricalEntry.id.desc()).offset((page - 1) * 50).limit(50))
    return {"total": total, "rows": [{
        "id": row.id, "kind": row.kind, "date": row.date, "line": code,
        "leader": row.leader_name, "dm": row.source_dm, "shift": row.shift,
        "sourceSheet": row.source_sheet, "sourceRow": row.source_row,
        "data": row.data,
    } for row, code in rows]}
