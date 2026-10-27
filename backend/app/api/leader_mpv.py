from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api import admin
from app.api.deps import Principal, get_active_principal
from app.db.session import get_db
from app.models import Board, BoardMember, Employee
from app.schemas import CamelModel, LineOut, MpvIn, MpvOut
from app.services.accounts import active_lines
from app.services.boards import line_out

router = APIRouter(prefix="/leader/mpv", tags=["leader-mpv"])
PERIOD_PATH = Path(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="Month as YYYY-MM")


LeaderMpvIn = MpvIn


class MvpCandidateOut(CamelModel):
    id: int
    employee_id: str
    name: str
    dept: str | None
    is_active: bool


def leader_lines(db: Session, principal: Principal):
    if principal.employee is None or principal.role != "leader" or not principal.employee.is_active:
        raise HTTPException(403, "Hanya leader yang dapat mengelola MVP melalui halaman ini.")
    return active_lines(db, principal.employee.id)


def authorize_mpv_line(db: Session, principal: Principal, line_id: int) -> None:
    if not any(line.id == line_id for _, line, _ in leader_lines(db, principal)):
        raise HTTPException(403, "Anda hanya dapat mengelola MVP pada lini yang menjadi tanggung jawab Anda.")


def candidate_query(line_id: int):
    return (
        select(Employee)
        .join(BoardMember, BoardMember.employee_id == Employee.id)
        .join(Board, Board.id == BoardMember.board_id)
        .where(Board.line_id == line_id, BoardMember.ended_at.is_(None), Employee.is_active.is_(True))
        .distinct()
        .order_by(Employee.name, Employee.employee_no)
    )


@router.get("/lines", response_model=list[LineOut])
def list_lines(db: Session = Depends(get_db), principal: Principal = Depends(get_active_principal)) -> list[LineOut]:
    return [line_out(db, board, line, workshop) for board, line, workshop in leader_lines(db, principal)]


@router.get("/lines/{line_id}/candidates", response_model=list[MvpCandidateOut])
def list_candidates(line_id: int, db: Session = Depends(get_db), principal: Principal = Depends(get_active_principal)) -> list[MvpCandidateOut]:
    authorize_mpv_line(db, principal, line_id)
    return [MvpCandidateOut(id=e.id, employee_id=e.employee_no, name=e.name, dept=e.dept, is_active=e.is_active) for e in db.scalars(candidate_query(line_id))]


@router.get("/lines/{line_id}/history", response_model=list[MpvOut])
def list_history(line_id: int, db: Session = Depends(get_db), principal: Principal = Depends(get_active_principal)) -> list[MpvOut]:
    authorize_mpv_line(db, principal, line_id)
    return admin.list_mpv(line_id, db)


@router.put("/lines/{line_id}/{period}", response_model=MpvOut)
def save_award(line_id: int, body: MpvIn, period: str = PERIOD_PATH, db: Session = Depends(get_db), principal: Principal = Depends(get_active_principal)) -> MpvOut:
    authorize_mpv_line(db, principal, line_id)
    if body.employee_pk is not None:
        employee = db.scalar(candidate_query(line_id).where(Employee.id == body.employee_pk))
        if employee is None:
            raise HTTPException(403, "Pilih karyawan aktif yang terdaftar pada lini ini.")
        return admin.save_mpv(line_id, MpvIn(employee_pk=employee.id), period, db)
    return admin.save_mpv(line_id, body, period, db)


@router.delete("/lines/{line_id}/{period}", status_code=status.HTTP_204_NO_CONTENT)
def delete_award(line_id: int, period: str = PERIOD_PATH, db: Session = Depends(get_db), principal: Principal = Depends(get_active_principal)) -> Response:
    authorize_mpv_line(db, principal, line_id)
    return admin.delete_mpv(line_id, period, db)
