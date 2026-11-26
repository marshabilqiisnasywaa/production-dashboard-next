from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_active_principal, get_current_admin
from app.db.session import get_db
from app.models.abnormal_category import AbnormalCategory
from app.schemas_abnormal import (
    AbnormalCategoryCreate,
    AbnormalCategoryOut,
    AbnormalCategoryUpdate,
    AbnormalImportIn,
    AbnormalImportItem,
    AbnormalImportPreview,
    AbnormalImportResult,
)
from app.services import abnormal_categories as service

router = APIRouter(prefix="/abnormal-categories", tags=["abnormal-categories"])


def to_out(row: AbnormalCategory, child_count: int) -> AbnormalCategoryOut:
    return AbnormalCategoryOut(
        id=row.id, level=row.level, code=row.code, name=row.name,
        parent_id=row.parent_id, is_active=row.is_active,
        child_count=child_count, updated_at=row.updated_at,
    )


def one(db: Session, row: AbnormalCategory) -> AbnormalCategoryOut:
    direct = db.scalar(select(func.count()).select_from(AbnormalCategory).where(AbnormalCategory.parent_id == row.id))
    return to_out(row, direct or 0)


def load(db: Session, category_id: int) -> AbnormalCategory:
    row = db.get(AbnormalCategory, category_id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kode abnormal tidak ditemukan.")
    return row


@router.get("", response_model=list[AbnormalCategoryOut])
def list_categories(db: Session = Depends(get_db), _admin=Depends(get_current_admin)) -> list[AbnormalCategoryOut]:
    rows = list(db.scalars(select(AbnormalCategory).order_by(AbnormalCategory.code)))
    children = Counter(row.parent_id for row in rows if row.parent_id is not None)
    return [to_out(row, children.get(row.id, 0)) for row in rows]


@router.get("/options", response_model=list[AbnormalCategoryOut])
def list_options(db: Session = Depends(get_db), _principal: Principal = Depends(get_active_principal)) -> list[AbnormalCategoryOut]:
    rows = list(db.scalars(select(AbnormalCategory).where(AbnormalCategory.is_active.is_(True)).order_by(AbnormalCategory.code)))
    children = Counter(row.parent_id for row in rows if row.parent_id is not None)
    return [to_out(row, children.get(row.id, 0)) for row in rows]


@router.post("", response_model=AbnormalCategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: AbnormalCategoryCreate, db: Session = Depends(get_db), _admin=Depends(get_current_admin)) -> AbnormalCategoryOut:
    return one(db, service.create_category(db, payload.code, payload.name, payload.parent_id))


@router.patch("/{category_id}", response_model=AbnormalCategoryOut)
def update_category(category_id: int, payload: AbnormalCategoryUpdate, db: Session = Depends(get_db), _admin=Depends(get_current_admin)) -> AbnormalCategoryOut:
    row = load(db, category_id)
    return one(db, service.update_category(db, row, payload.code, payload.name, payload.is_active))


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: Session = Depends(get_db), _admin=Depends(get_current_admin)) -> None:
    service.delete_category(db, load(db, category_id))


def columns_of(payload: AbnormalImportIn) -> dict[int, list[str]]:
    return {1: payload.code1, 2: payload.code2, 3: payload.code3}


@router.post("/import/preview", response_model=AbnormalImportPreview)
def preview_import(payload: AbnormalImportIn, db: Session = Depends(get_db), _admin=Depends(get_current_admin)) -> AbnormalImportPreview:
    plan = service.build_plan(db, columns_of(payload))
    return AbnormalImportPreview(
        items=[
            AbnormalImportItem(
                level=item.level, position=item.position, code=item.code, name=item.name,
                parent_code=item.parent_code, action=item.action, message=item.message,
            )
            for item in plan.items
        ],
        created=plan.count("baru"),
        updated=plan.count("diperbarui"),
        unchanged=plan.count("tetap"),
        errors=plan.count("error"),
        missing=[code for _, code in plan.missing],
    )


@router.post("/import", response_model=AbnormalImportResult)
def run_import(payload: AbnormalImportIn, db: Session = Depends(get_db), _admin=Depends(get_current_admin)) -> AbnormalImportResult:
    plan = service.build_plan(db, columns_of(payload))
    return AbnormalImportResult(**service.apply_plan(db, plan, payload.deactivate_missing))
