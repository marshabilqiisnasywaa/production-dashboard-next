from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.schemas import SqdipImportIn, SqdipImportOut, SqdipListOut
from app.services import sqdip

router = APIRouter(prefix="/sqdip", tags=["sqdip"])


@router.get("", response_model=SqdipListOut)
def list_sqdip(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
) -> SqdipListOut:
    latest = sqdip.latest_import(db)
    return SqdipListOut(
        file_name=latest.source_file if latest else None,
        uploaded_at=latest.updated_at if latest else None,
        rows=sqdip.list_rows(db, from_date, to_date),
    )


@router.post("/import", response_model=SqdipImportOut)
def import_sqdip(
    payload: SqdipImportIn,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
) -> SqdipImportOut:
    added, updated = sqdip.upsert_rows(db, payload.rows, payload.file_name)
    return SqdipImportOut(added=added, updated=updated)
