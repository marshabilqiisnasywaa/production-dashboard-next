import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Employee, User
from app.seed import MIN_PASSWORD_LENGTH

HOD_USERNAME = "HOD001"
HOD_NAME = "Nama HOD"
HOD_PASSWORD = "GantiPasswordHOD123!"


def read_credentials() -> tuple[str, str, str]:
    nik = HOD_USERNAME.strip()
    name = HOD_NAME.strip()
    password = HOD_PASSWORD
    if not nik or len(nik) > 32:
        sys.exit("NIK wajib diisi, maksimal 32 karakter.")
    if not name or len(name) > 120:
        sys.exit("Nama wajib diisi, maksimal 120 karakter.")
    if not MIN_PASSWORD_LENGTH <= len(password) <= 128:
        sys.exit(f"Password harus {MIN_PASSWORD_LENGTH}-128 karakter.")
    if password == nik:
        sys.exit("Password tidak boleh sama dengan NIK.")
    return nik, name, password


def main() -> None:
    nik, name, password = read_credentials()
    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.username == nik)) is not None:
            sys.exit(f"NIK '{nik}' sudah dipakai akun admin.")
        employee = db.scalar(select(Employee).where(Employee.employee_no == nik))
        if employee is not None and employee.role != "hod":
            sys.exit(f"NIK '{nik}' sudah dipakai karyawan dengan role '{employee.role}'.")
        if employee is None:
            employee = Employee(employee_no=nik, role="hod")
            db.add(employee)
        employee.name = name
        employee.password_hash = hash_password(password)
        employee.must_change_password = False
        employee.is_active = True
        db.commit()
        print(f"Akun HOD '{nik}' disimpan. Password sesuai yang diberikan ke seeder.")


if __name__ == "__main__":
    main()
