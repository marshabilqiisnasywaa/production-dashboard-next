import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Employee

ADMIN_USERNAME = "admin"
ADMIN_NAME = "Superadmin"
ADMIN_PASSWORD = "admin123"
MIN_PASSWORD_LENGTH = 8


def read_credentials() -> tuple[str, str]:
    username = ADMIN_USERNAME.strip()
    password = ADMIN_PASSWORD
    if not username or len(username) > 32:
        sys.exit("NIK wajib diisi, maksimal 32 karakter.")
    if not MIN_PASSWORD_LENGTH <= len(password) <= 128:
        sys.exit(f"Password harus {MIN_PASSWORD_LENGTH}-128 karakter.")
    return username, password


def main() -> None:
    username, password = read_credentials()
    with SessionLocal() as db:
        employee = db.scalar(select(Employee).where(Employee.employee_no == username))
        if employee is not None and employee.role != "superadmin":
            sys.exit(f"NIK '{username}' sudah dipakai karyawan dengan role '{employee.role}'.")
        if employee is None:
            employee = Employee(employee_no=username, name=ADMIN_NAME, role="superadmin")
            db.add(employee)
            print(f"Superadmin '{username}' dibuat.")
        else:
            print(f"Password superadmin '{username}' diperbarui.")
        employee.password_hash = hash_password(password)
        employee.must_change_password = False
        employee.is_active = True
        db.commit()


if __name__ == "__main__":
    main()
