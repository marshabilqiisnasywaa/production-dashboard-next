from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Employee, Line
from app.schemas import MeetingSummaryIn


def resolve_assignments(db: Session, body: MeetingSummaryIn, default_line_id: int | None = None):
    codes = body.line_codes if body.line_codes is not None else ([body.line_code] if body.line_code else [])
    if not codes and default_line_id is not None:
        line = db.get(Line, default_line_id)
        codes = [line.code] if line else []
    known = {line.code: line.id for line in db.scalars(select(Line).where(Line.code.in_(codes)))}
    custom = set(body.custom_line_codes)
    if body.custom_line and body.line_code:
        custom.add(body.line_code)
    lines = []
    for code in dict.fromkeys(codes):
        if code not in known and code not in custom:
            raise HTTPException(400, f"Lini masalah '{code}' tidak ditemukan.")
        lines.append((known.get(code), code))

    pics = []
    seen = set()
    inputs = body.pics
    if inputs is None:
        from app.schemas import SummaryPicIn
        inputs = [SummaryPicIn(name=body.pic_name, employee_id=body.pic_id, employee_no=body.pic_employee_no, manual=body.pic_id is None and not body.pic_employee_no)]
    for item in inputs:
        name = item.name.strip()
        employee = None
        if not item.manual:
            employee = db.get(Employee, item.employee_id) if item.employee_id is not None else db.scalar(select(Employee).where(Employee.employee_no == item.employee_no)) if item.employee_no else None
            if employee is None or not employee.is_active:
                raise HTTPException(400, "User PIC tidak ditemukan atau sudah nonaktif.")
            name = employee.name
        if not name:
            raise HTTPException(400, "Nama PIC wajib diisi.")
        key = ("employee", employee.id) if employee else ("manual", name.casefold())
        if key not in seen:
            pics.append((employee.id if employee else None, name))
            seen.add(key)
    return lines, pics


def summary_metadata(summary) -> dict:
    return {
        "line_codes": [line.code for line in getattr(summary, "affected_lines", [])] or ([summary.line_code] if summary.line_code else []),
        "pics": [{"employee_id": pic.employee_id, "name": pic.name} for pic in getattr(summary, "assigned_pics", [])] or [{"employee_id": summary.pic_id, "name": summary.pic_name}],
    }


def display_lines(summary) -> str | None:
    return ", ".join(summary_metadata(summary)["line_codes"]) or None


def display_pics(summary) -> str:
    return ", ".join(pic["name"] for pic in summary_metadata(summary)["pics"])
