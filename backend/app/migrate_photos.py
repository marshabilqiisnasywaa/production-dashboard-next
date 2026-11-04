from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.db.session import SessionLocal
from app.models import Board, Employee, Workshop
from app.services.face.enrollment import decode_data_url
from app.services.photos import PhotoError, save_photo


def convert(value: str | None) -> str | None:
    data = decode_data_url(value)
    if data is None:
        return None
    try:
        return save_photo(data)
    except PhotoError:
        return None


def main() -> None:
    converted = skipped = 0
    with SessionLocal() as db:
        for employee in db.scalars(select(Employee).where(Employee.photo_url.like("data:image/%"))):
            url = convert(employee.photo_url)
            if url is None:
                skipped += 1
                print(f"  LEWAT  karyawan {employee.employee_no}  {employee.name}")
                continue
            employee.photo_url = url
            converted += 1
        for board in db.scalars(select(Board).where(Board.team_photo_url.like("data:image/%"))):
            url = convert(board.team_photo_url)
            if url is None:
                skipped += 1
                print(f"  LEWAT  foto tim board {board.id}")
                continue
            board.team_photo_url = url
            converted += 1
        for workshop in db.scalars(select(Workshop)):
            hod = workshop.hod
            if not hod or not str(hod.get("photo_url") or "").startswith("data:image/"):
                continue
            url = convert(hod["photo_url"])
            if url is None:
                skipped += 1
                print(f"  LEWAT  HOD workshop {workshop.name}")
                continue
            workshop.hod = {**hod, "photo_url": url}
            flag_modified(workshop, "hod")
            converted += 1
        db.commit()
    print(f"Selesai: {converted} foto dipindah ke file, {skipped} dilewati.")


if __name__ == "__main__":
    main()
