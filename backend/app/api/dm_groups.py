from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_principal
from app.db.session import get_db
from app.models import DmGroup, Line, Workshop
from app.schemas import DmGroupIn, DmGroupLineAssignIn, DmGroupOut, DmGroupUpdateIn

router = APIRouter(prefix="/dm-groups", tags=["dm-groups"])


@router.get("", response_model=list[DmGroupOut])
def list_dm_groups(
    workshop_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _principal: Principal = Depends(get_principal),
) -> list[DmGroupOut]:
    stmt = select(DmGroup)
    if workshop_id is not None:
        stmt = stmt.where(DmGroup.workshop_id == workshop_id)
    groups = db.scalars(stmt.order_by(DmGroup.name, DmGroup.id)).all()

    result: list[DmGroupOut] = []
    for g in groups:
        line_ids = [l.id for l in g.lines]
        result.append(
            DmGroupOut(
                id=g.id,
                workshop_id=g.workshop_id,
                name=g.name,
                description=g.description or "",
                line_ids=line_ids,
            )
        )
    return result


@router.get("/line-map", response_model=dict[int, int])
def get_line_group_map(
    db: Session = Depends(get_db),
    _principal: Principal = Depends(get_principal),
) -> dict[int, int]:
    stmt = select(Line.id, Line.dm_group_id).where(Line.dm_group_id.isnot(None))
    rows = db.execute(stmt).all()
    return {row[0]: row[1] for row in rows}


@router.post("", response_model=DmGroupOut, status_code=status.HTTP_201_CREATED)
def create_dm_group(
    payload: DmGroupIn,
    db: Session = Depends(get_db),
    _principal: Principal = Depends(get_principal),
) -> DmGroupOut:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama DM wajib diisi.")

    workshop = db.get(Workshop, payload.workshop_id)
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop tidak ditemukan.")

    duplicate = db.scalar(
        select(DmGroup).where(
            DmGroup.workshop_id == payload.workshop_id,
            func.lower(func.trim(DmGroup.name)) == name.lower(),
        )
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama DM sudah dipakai di workshop ini.")

    group = DmGroup(
        workshop_id=payload.workshop_id,
        name=name,
        description=payload.description.strip(),
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    return DmGroupOut(
        id=group.id,
        workshop_id=group.workshop_id,
        name=group.name,
        description=group.description or "",
        line_ids=[],
    )


@router.put("/{id}", response_model=DmGroupOut)
def update_dm_group(
    id: int,
    payload: DmGroupUpdateIn,
    db: Session = Depends(get_db),
    _principal: Principal = Depends(get_principal),
) -> DmGroupOut:
    group = db.get(DmGroup, id)
    if not group:
        raise HTTPException(status_code=404, detail="DM tidak ditemukan.")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Nama DM wajib diisi.")

    duplicate = db.scalar(
        select(DmGroup).where(
            DmGroup.workshop_id == group.workshop_id,
            DmGroup.id != id,
            func.lower(func.trim(DmGroup.name)) == name.lower(),
        )
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Nama DM sudah dipakai di workshop ini.")

    group.name = name
    group.description = payload.description.strip()
    db.commit()
    db.refresh(group)

    line_ids = [l.id for l in group.lines]
    return DmGroupOut(
        id=group.id,
        workshop_id=group.workshop_id,
        name=group.name,
        description=group.description or "",
        line_ids=line_ids,
    )


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dm_group(
    id: int,
    db: Session = Depends(get_db),
    _principal: Principal = Depends(get_principal),
) -> None:
    group = db.get(DmGroup, id)
    if not group:
        raise HTTPException(status_code=404, detail="DM tidak ditemukan.")

    # Unassign all lines belonging to this group
    for l in group.lines:
        l.dm_group_id = None

    db.delete(group)
    db.commit()


@router.patch("/lines/{line_id}")
def assign_line_to_group(
    line_id: int,
    payload: DmGroupLineAssignIn,
    db: Session = Depends(get_db),
    _principal: Principal = Depends(get_principal),
) -> dict:
    line = db.get(Line, line_id)
    if not line:
        raise HTTPException(status_code=404, detail="Line tidak ditemukan.")

    if payload.group_id is not None:
        group = db.get(DmGroup, payload.group_id)
        if not group:
            raise HTTPException(status_code=404, detail="DM tidak ditemukan.")
        line.dm_group_id = group.id
    else:
        line.dm_group_id = None

    db.commit()
    return {"success": True, "line_id": line_id, "dm_group_id": line.dm_group_id}
