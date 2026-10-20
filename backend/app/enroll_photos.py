from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Employee
from app.services.face.engine import get_model
from app.services.face.enrollment import photo_template_ids, sync_photo


def main() -> None:
    get_model()
    done = 0
    failed: list[tuple[str, str, str]] = []
    with SessionLocal() as db:
        enrolled = photo_template_ids(db)
        employees = db.scalars(
            select(Employee).where(Employee.is_active.is_(True), Employee.photo_url.is_not(None)).order_by(Employee.id)
        ).all()
        pending = [e for e in employees if e.id not in enrolled]
        print(f"{len(pending)} karyawan punya foto tapi belum punya template wajah.")
        for employee in pending:
            message = sync_photo(db, employee)
            db.commit()
            if message is None:
                done += 1
                print(f"  OK     {employee.employee_no}  {employee.name}")
            else:
                failed.append((employee.employee_no, employee.name, message))
                print(f"  GAGAL  {employee.employee_no}  {employee.name}: {message}")
    print(f"Selesai: {done} berhasil, {len(failed)} gagal.")
    print("Restart backend agar pencocok wajah memuat template baru.")


if __name__ == "__main__":
    main()
