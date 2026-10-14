from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Board, Line, Workshop
from app.schemas import PublicBoardListItem, PublicBoardOut
from app.services.boards import public_board

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/boards", response_model=list[PublicBoardListItem])
def list_boards(db: Session = Depends(get_db)) -> list[PublicBoardListItem]:
    rows = db.execute(
        select(Board, Line, Workshop)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .where(Board.is_active.is_(True))
        .order_by(Workshop.name, Line.code)
    ).all()
    return [
        PublicBoardListItem(
            slug=board.slug,
            line_code=line.code,
            line_name=line.name,
            workshop_name=workshop.name,
            status=line.status,
        )
        for board, line, workshop in rows
    ]


@router.get("/boards/{slug}", response_model=PublicBoardOut)
def get_board(slug: str, db: Session = Depends(get_db)) -> PublicBoardOut:
    row = db.execute(
        select(Board, Line, Workshop)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .where(Board.slug == slug, Board.is_active.is_(True))
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dashboard tidak ditemukan.")
    return public_board(db, *row)
