from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Board, BoardMember, DmGroup, Employee, Line


TEAM_SLOTS = {"PROD": 1, "PE": 2, "QC": 3, "ME": 4}


def team_department(value: str | None) -> str:
    department = (value or "").strip().upper()
    return "QC" if department in {"QA", "QUALITY", "QUALITY CONTROL"} else department


def validate_team_slot(
    db: Session, board_id: int, employee: Employee, exclude_member_id: int | None = None,
) -> int:
    department = team_department(employee.dept)
    slot = TEAM_SLOTS.get(department)
    if slot is None:
        raise HTTPException(400, "Departemen anggota tim harus PROD, PE, Quality/QC, atau ME.")
    if department == "PROD" and employee.role != "leader":
        raise HTTPException(400, "Slot 1 hanya untuk karyawan PROD dengan role Leader.")

    board = db.get(Board, board_id)
    line = db.get(Line, board.line_id) if board is not None else None
    if line is not None and line.dm_group_id is not None:
        db.scalar(select(DmGroup).where(DmGroup.id == line.dm_group_id).with_for_update())
    db.scalar(select(Board).where(Board.id == board_id).with_for_update())
    members = db.execute(
        select(BoardMember, Employee)
        .join(Employee, Employee.id == BoardMember.employee_id)
        .where(BoardMember.board_id == board_id, BoardMember.ended_at.is_(None))
    ).all()
    for member, person in members:
        if member.id != exclude_member_id and team_department(person.dept) == department:
            raise HTTPException(409, f"Slot {slot} ({department}) sudah terisi. Lepas anggota lama terlebih dahulu.")
    return slot
