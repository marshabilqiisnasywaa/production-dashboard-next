from sqlalchemy import and_, func, or_, select, true
from sqlalchemy.orm import Session

from app.api.deps import Principal
from app.models import Board, BoardMember, Employee, LeaderAssignment, Line
from app.models.fivewhy import FiveWhyDocument
from app.services.accounts import active_lines, forbidden


def leader_line_ids(db: Session, employee_id: int) -> set[int]:
    assignments = list(db.scalars(select(LeaderAssignment).where(
        LeaderAssignment.employee_id == employee_id,
        LeaderAssignment.ended_at.is_(None),
    )))
    ids = {row.line_id for row in assignments if row.kind == "line_leader" and row.line_id is not None}
    groups = {row.dm_group_id for row in assignments if row.kind == "dm_leader"}
    if groups:
        ids.update(db.scalars(select(Line.id).where(Line.dm_group_id.in_(groups))))
    occupied = select(LeaderAssignment.id).where(
        LeaderAssignment.line_id == Line.id,
        LeaderAssignment.kind == "line_leader",
        LeaderAssignment.ended_at.is_(None),
    ).exists()
    ids.update(db.scalars(select(Line.id).join(Board, Board.line_id == Line.id).join(BoardMember, BoardMember.board_id == Board.id).where(
        BoardMember.employee_id == employee_id, BoardMember.ended_at.is_(None),
        BoardMember.sort_order == 1, ~occupied,
    )))
    return ids


def upload_line_ids(db: Session, principal: Principal) -> set[int]:
    if principal.employee is None:
        return set()
    if principal.role == "leader":
        return leader_line_ids(db, principal.employee.id)
    if principal.role == "member":
        return {line.id for _, line, _ in active_lines(db, principal.employee.id)}
    return set()


def line_leaders(db: Session, line: Line) -> list[Employee]:
    assignments = list(db.scalars(select(LeaderAssignment).where(
        LeaderAssignment.ended_at.is_(None),
        or_(and_(LeaderAssignment.kind == "line_leader", LeaderAssignment.line_id == line.id),
            and_(LeaderAssignment.kind == "dm_leader", LeaderAssignment.dm_group_id == line.dm_group_id)),
    )))
    ids = {row.employee_id for row in assignments}
    if not any(row.kind == "line_leader" for row in assignments):
        ids.update(db.scalars(select(BoardMember.employee_id).join(Board, Board.id == BoardMember.board_id).where(
            Board.line_id == line.id, BoardMember.ended_at.is_(None), BoardMember.sort_order == 1,
        )))
    return list(db.scalars(select(Employee).where(Employee.id.in_(ids), Employee.is_active.is_(True), Employee.role == "leader").order_by(Employee.name)))


def supervisor_for(db: Session, pic: Employee) -> Employee | None:
    if pic.supervisor_id is not None:
        supervisor = db.get(Employee, pic.supervisor_id)
        return supervisor if supervisor and supervisor.is_active and supervisor.role == "supervisor" else None
    if not pic.supervisor or not pic.supervisor.strip():
        return None
    matches = list(db.scalars(select(Employee).where(
        Employee.role == "supervisor", Employee.is_active.is_(True),
        func.lower(func.trim(Employee.name)) == pic.supervisor.strip().lower(),
    )))
    return matches[0] if len(matches) == 1 else None


def pic_candidates(db: Session, principal: Principal, line: Line) -> list[Employee]:
    if line.id not in upload_line_ids(db, principal):
        raise forbidden("Line dokumen harus sesuai penugasan aktif kamu.")
    ids = set(db.scalars(select(BoardMember.employee_id).join(Board, Board.id == BoardMember.board_id).where(
        Board.line_id == line.id, BoardMember.ended_at.is_(None),
    )))
    ids.update(person.id for person in line_leaders(db, line))
    if principal.role == "member":
        ids.intersection_update({principal.employee.id})
    return list(db.scalars(select(Employee).where(
        Employee.id.in_(ids), Employee.is_active.is_(True), Employee.role.in_(("member", "leader")),
    ).order_by(Employee.name, Employee.id)))


def validate_pic(db: Session, principal: Principal, line_id: int, pic_id: int) -> Employee:
    line = db.get(Line, line_id)
    if line is None:
        raise forbidden("Line dokumen tidak ditemukan.")
    pic = next((person for person in pic_candidates(db, principal, line) if person.id == pic_id), None)
    if pic is None:
        raise forbidden("Pilih PIC aktif yang sesuai dengan line dan akses akun kamu.")
    return pic


def document_access(db: Session, principal: Principal):
    if principal.is_admin or principal.role == "hod":
        return true()
    employee = principal.employee
    if employee is None:
        return FiveWhyDocument.id.is_(None)
    pic_id = func.coalesce(FiveWhyDocument.pic_id, FiveWhyDocument.created_by)
    own = pic_id == employee.id
    if principal.role == "leader":
        return or_(own, FiveWhyDocument.line_id.in_(leader_line_ids(db, employee.id)))
    if principal.role == "supervisor":
        same_name = list(db.scalars(select(Employee.id).where(
            Employee.role == "supervisor", Employee.is_active.is_(True),
            func.lower(func.trim(Employee.name)) == employee.name.strip().lower(),
        )))
        direct = Employee.supervisor_id == employee.id
        if same_name == [employee.id]:
            direct = or_(direct, and_(Employee.supervisor_id.is_(None), func.lower(func.trim(Employee.supervisor)) == employee.name.strip().lower()))
        subordinates = select(Employee.id).where(direct)
        return or_(own, pic_id.in_(subordinates))
    return own
