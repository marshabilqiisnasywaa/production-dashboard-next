from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models import Employee, Line


def is_pic(summary, employee) -> bool:
    assignments = getattr(summary, "assigned_pics", []) or getattr(summary, "pics", [])
    if assignments:
        return any(pic.employee_id == employee.id if pic.employee_id is not None else pic.name.strip().lower() == employee.name.strip().lower() for pic in assignments)
    if summary.pic_id is not None:
        return summary.pic_id == employee.id
    return summary.pic_name.strip().lower() == employee.name.strip().lower()


def pic_filter(model, employee_ids: list[int], names: list[str]):
    legacy = or_(
        model.pic_id.in_(employee_ids),
        and_(model.pic_id.is_(None), func.lower(func.trim(model.pic_name)).in_(names)),
    )
    pic_model = model.assigned_pics.property.mapper.class_
    return or_(
        model.assigned_pics.any(or_(pic_model.employee_id.in_(employee_ids), and_(pic_model.employee_id.is_(None), func.lower(func.trim(pic_model.name)).in_(names)))),
        and_(~model.assigned_pics.any(), legacy),
    )


def line_filter(model, line_ids: list[int]):
    line_model = model.affected_lines.property.mapper.class_
    legacy = model.line_id.in_(line_ids) if hasattr(model, "line_id") else model.line_code.in_(select(Line.code).where(Line.id.in_(line_ids)))
    return or_(model.affected_lines.any(line_model.line_id.in_(line_ids)), and_(~model.affected_lines.any(), legacy))


def with_pic_dept(db: Session, rows: list) -> list:
    pics = [pic for row in rows for pic in getattr(row, "pics", [])]
    ids = {pic.employee_id for pic in pics if pic.employee_id is not None} | {row.pic_id for row in rows if row.pic_id is not None}
    names = {pic.name.strip().lower() for pic in pics if pic.employee_id is None} | {row.pic_name.strip().lower() for row in rows if not getattr(row, "pics", []) and row.pic_id is None and row.pic_name}
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
        departments = [by_id.get(pic.employee_id) if pic.employee_id is not None else by_name.get(pic.name.strip().lower()) for pic in getattr(row, "pics", [])] if getattr(row, "pics", []) else [by_id.get(row.pic_id) if row.pic_id is not None else by_name.get((row.pic_name or "").strip().lower())]
        row.pic_dept = ", ".join(dict.fromkeys(dept for dept in departments if dept)) or None
    return rows
