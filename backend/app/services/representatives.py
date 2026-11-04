from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Employee

REPRESENTED_PREFIX = "Diwakilkan oleh "


def same_dept_representatives(db: Session, absent: Employee) -> list[Employee]:
    dept = (absent.dept or "").strip().upper()
    if not dept:
        return []
    return [
        e
        for e in db.scalars(
            select(Employee)
            .where(Employee.is_active.is_(True), Employee.id != absent.id)
            .order_by(Employee.name, Employee.employee_no)
        )
        if (e.dept or "").strip().upper() == dept
    ]


def validate_representative(db: Session, absent: Employee, text: str) -> None:
    if not text.endswith(")") or "(" not in text:
        raise HTTPException(400, "Pilih wakil dari daftar karyawan.")
    employee_no = text[text.rindex("(") + 1 : -1].strip()
    if not absent.dept:
        raise HTTPException(400, f"Departemen {absent.name} belum diisi, jadi wakil belum bisa dipilih.")
    if not any(e.employee_no == employee_no for e in same_dept_representatives(db, absent)):
        raise HTTPException(400, f"Wakil {absent.name} harus dari departemen {absent.dept}.")
