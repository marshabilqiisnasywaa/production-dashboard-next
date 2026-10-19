from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Principal, authorize_line, get_active_principal
from app.db.session import get_db
from app.models import Board, Line, Workshop
from app.schemas import LineOut, PublicBoardOut
from app.services.accounts import active_line
from app.services.boards import line_out, public_board

router = APIRouter(prefix="/lines", tags=["lines"])


@router.get("/{line_id}/board", response_model=PublicBoardOut)
def line_board(
    line_id: int,
    principal: Principal = Depends(get_active_principal),
    db: Session = Depends(get_db),
) -> PublicBoardOut:
    authorize_line(db, principal, line_id)
    row = db.execute(
        select(Board, Line, Workshop)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .where(Line.id == line_id)
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lini tidak ditemukan.")
    return public_board(db, *row)


@router.get("", response_model=list[LineOut])
def list_my_lines(
    principal: Principal = Depends(get_active_principal),
    db: Session = Depends(get_db),
) -> list[LineOut]:
    if principal.is_admin or (principal.employee and principal.employee.role == "supervisor"):
        rows = db.execute(
            select(Board, Line, Workshop)
            .join(Line, Line.id == Board.line_id)
            .join(Workshop, Workshop.id == Line.workshop_id)
            .order_by(Workshop.name, Line.code)
        ).all()
        return [line_out(db, board, line, workshop) for board, line, workshop in rows]
    employee = principal.employee
    assert employee is not None
    found = active_line(db, employee.id)
    return [line_out(db, *found)] if found else []

