from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Board, BoardMember, Employee, Line, Workshop

MIN_PASSWORD_LENGTH = 8


def new_employee(employee_no: str, name: str, **fields) -> Employee:
    return Employee(
        employee_no=employee_no,
        name=name,
        password_hash=hash_password(employee_no),
        must_change_password=True,
        **fields,
    )


def reset_password(employee: Employee, password: str | None = None) -> None:
    employee.password_hash = hash_password(password or employee.employee_no)
    employee.must_change_password = True


def active_line(db: Session, employee_id: int) -> tuple[Board, Line, Workshop] | None:
    row = db.execute(
        select(Board, Line, Workshop)
        .select_from(BoardMember)
        .join(Board, Board.id == BoardMember.board_id)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .where(BoardMember.employee_id == employee_id, BoardMember.ended_at.is_(None))
    ).first()
    return (row[0], row[1], row[2]) if row else None


def forbidden(message: str = "Kamu tidak punya akses ke data ini.") -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, message)
