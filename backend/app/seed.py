import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Employee, User

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
MIN_PASSWORD_LENGTH = 8


def read_credentials() -> tuple[str, str]:
    username = ADMIN_USERNAME.strip()
    password = ADMIN_PASSWORD
    if not username or len(username) > 64:
        sys.exit("Username wajib diisi, maksimal 64 karakter.")
    if not MIN_PASSWORD_LENGTH <= len(password) <= 128:
        sys.exit(f"Password harus {MIN_PASSWORD_LENGTH}-128 karakter.")
    return username, password


def main() -> None:
    username, password = read_credentials()
    with SessionLocal() as db:
        if db.scalar(select(Employee.id).where(Employee.employee_no == username)) is not None:
            sys.exit(f"Username '{username}' sudah dipakai akun karyawan.")
        user = db.scalar(select(User).where(User.username == username))
        if user is None:
            db.add(User(username=username, password_hash=hash_password(password), role="superadmin"))
            print(f"Superadmin '{username}' dibuat.")
        else:
            user.password_hash = hash_password(password)
            user.role = "superadmin"
            user.is_active = True
            print(f"Password superadmin '{username}' diperbarui.")
        db.commit()


if __name__ == "__main__":
    main()
