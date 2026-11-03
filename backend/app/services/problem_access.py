from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models import Employee


def is_pic(summary, employee) -> bool:
    if summary.pic_id is not None:
        return summary.pic_id == employee.id
    return summary.pic_name.strip().lower() == employee.name.strip().lower()


def pic_filter(model, employee_ids: list[int], names: list[str]):
    return or_(
        model.pic_id.in_(employee_ids),
        and_(model.pic_id.is_(None), func.lower(func.trim(model.pic_name)).in_(names)),
    )


def with_pic_dept(db: Session, rows: list) -> list:
    ids = {row.pic_id for row in rows if row.pic_id is not None}
    names = {row.pic_name.strip().lower() for row in rows if row.pic_id is None and row.pic_name}
    if not ids and not names:
        return rows
    by_id: dict[int, str | None] = {}
    by_name: dict[str, str | None] = {}
    for employee in db.scalars(
        select(Employee).where(or_(Employee.id.in_(ids), func.lower(func.trim(Employee.name)).in_(names)))
    ):
        by_id[employee.id] = employee.dept
        by_name.setdefault(employee.name.strip().lower(), employee.dept)
    for row in rows:
        row.pic_dept = by_id.get(row.pic_id) if row.pic_id is not None else by_name.get((row.pic_name or "").strip().lower())
    return rows
