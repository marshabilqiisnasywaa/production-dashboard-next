import sys

from sqlalchemy import select

from app.core.config import settings
from app.core.roles import ROLES
from app.db.session import SessionLocal
from app.models import Board, BoardMember, Employee, Line
from app.services.accounts import active_line, new_employee

DEV_DEPT = {"member": "ME", "leader": "PROD", "supervisor": "PROD"}


def main() -> None:
    if settings.app_env.lower() in ("production", "prod"):
        sys.exit("Seeder akun dev tidak boleh dijalankan di production.")
    with SessionLocal() as db:
        board = db.scalar(select(Board).join(Line, Line.id == Board.line_id).order_by(Line.code))
        for key, role in ROLES.items():
            nik = f"DEV-{key.upper()}"
            employee = db.scalar(select(Employee).where(Employee.employee_no == nik))
            if employee is None:
                employee = new_employee(nik, f"Dev {role.label}", role=key, dept=DEV_DEPT.get(key))
                db.add(employee)
                db.flush()
                print(f"Akun {nik} dibuat, password awal sama dengan NIK.")
            else:
                print(f"Akun {nik} sudah ada, dilewati.")
            if role.scope != "own":
                continue
            if board is None:
                print(f"  {nik}: belum ada line, penugasan dilewati.")
            elif active_line(db, employee.id) is None:
                db.add(BoardMember(board_id=board.id, employee_id=employee.id))
                print(f"  {nik}: ditugaskan ke board '{board.slug}'.")
        db.commit()


if __name__ == "__main__":
    main()
