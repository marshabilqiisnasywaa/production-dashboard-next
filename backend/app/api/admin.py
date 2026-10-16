from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import Board, BoardMember, Employee, Line, MpvAward, Workshop
from app.schemas import (
    EmployeeIn,
    EmployeeOut,
    EmployeeUpdate,
    LineIn,
    LineOut,
    LineUpdate,
    MemberIn,
    MemberOut,
    MemberUpdate,
    MpvIn,
    MpvOut,
    ResetPasswordIn,
    WorkshopIn,
    WorkshopOut,
)
from app.services.accounts import new_employee, reset_password
from app.services.boards import (
    active_members,
    line_out,
    member_out,
    mpv_out,
    parse_period,
    pick_slug,
    slug_taken,
    slugify,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


def conflict(message: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, message)


def not_found(what: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} tidak ditemukan.")


def workshop_out(db: Session, workshop: Workshop) -> WorkshopOut:
    count = db.scalar(select(func.count(Line.id)).where(Line.workshop_id == workshop.id))
    return WorkshopOut(id=workshop.id, name=workshop.name, line_count=count or 0)


@router.get("/workshops", response_model=list[WorkshopOut])
def list_workshops(db: Session = Depends(get_db)) -> list[WorkshopOut]:
    return [workshop_out(db, w) for w in db.scalars(select(Workshop).order_by(Workshop.name))]


@router.post("/workshops", response_model=WorkshopOut, status_code=status.HTTP_201_CREATED)
def create_workshop(body: WorkshopIn, db: Session = Depends(get_db)) -> WorkshopOut:
    name = body.name.strip()
    if db.scalar(select(Workshop.id).where(func.lower(Workshop.name) == name.lower())):
        raise conflict(f"Workshop '{name}' sudah ada.")
    workshop = Workshop(name=name)
    db.add(workshop)
    db.commit()
    return workshop_out(db, workshop)


@router.patch("/workshops/{workshop_id}", response_model=WorkshopOut)
def rename_workshop(workshop_id: int, body: WorkshopIn, db: Session = Depends(get_db)) -> WorkshopOut:
    workshop = db.get(Workshop, workshop_id)
    if workshop is None:
        raise not_found("Workshop")
    name = body.name.strip()
    taken = db.scalar(
        select(Workshop.id).where(func.lower(Workshop.name) == name.lower(), Workshop.id != workshop_id)
    )
    if taken:
        raise conflict(f"Workshop '{name}' sudah ada.")
    workshop.name = name
    db.commit()
    return workshop_out(db, workshop)


@router.delete("/workshops/{workshop_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workshop(workshop_id: int, db: Session = Depends(get_db)) -> Response:
    workshop = db.get(Workshop, workshop_id)
    if workshop is None:
        raise not_found("Workshop")
    if workshop_out(db, workshop).line_count:
        raise conflict("Workshop masih punya lini. Pindahkan atau hapus lininya dulu.")
    db.delete(workshop)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def line_row(db: Session, line_id: int) -> tuple[Board, Line, Workshop]:
    row = db.execute(
        select(Board, Line, Workshop)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .where(Line.id == line_id)
    ).first()
    if row is None:
        raise not_found("Lini")
    return row[0], row[1], row[2]


def code_taken(db: Session, code: str, exclude_line_id: int | None = None) -> bool:
    query = select(Line.id).where(Line.code == code)
    if exclude_line_id is not None:
        query = query.where(Line.id != exclude_line_id)
    return db.scalar(query) is not None


@router.get("/lines", response_model=list[LineOut])
def list_lines(db: Session = Depends(get_db)) -> list[LineOut]:
    rows = db.execute(
        select(Board, Line, Workshop)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .order_by(Workshop.name, Line.code)
    ).all()
    return [line_out(db, board, line, workshop) for board, line, workshop in rows]


@router.post("/lines", response_model=LineOut, status_code=status.HTTP_201_CREATED)
def create_line(body: LineIn, db: Session = Depends(get_db)) -> LineOut:
    workshop = db.get(Workshop, body.workshop_id)
    if workshop is None:
        raise not_found("Workshop")
    code = body.code.strip()
    if code_taken(db, code):
        raise conflict(f"Kode lini '{code}' sudah dipakai.")
    slug = pick_slug(db, body.slug, f"{workshop.name} {code}")
    line = Line(
        workshop_id=workshop.id,
        code=code,
        name=body.name.strip(),
        model=body.model,
        status=body.status,
    )
    db.add(line)
    db.flush()
    board = Board(
        line_id=line.id,
        slug=slug,
        slogan=body.slogan,
        line_label=body.line_label,
        line_label_zh=body.line_label_zh,
        values=body.values,
        team_photo_url=body.team_photo_url,
        is_active=body.published,
    )
    db.add(board)
    db.commit()
    return line_out(db, board, line, workshop)


@router.patch("/lines/{line_id}", response_model=LineOut)
def update_line(line_id: int, body: LineUpdate, db: Session = Depends(get_db)) -> LineOut:
    board, line, workshop = line_row(db, line_id)
    sent = body.model_fields_set
    if "workshop_id" in sent and body.workshop_id is not None:
        new_workshop = db.get(Workshop, body.workshop_id)
        if new_workshop is None:
            raise not_found("Workshop")
        line.workshop_id = new_workshop.id
        workshop = new_workshop
    if "code" in sent and body.code is not None:
        code = body.code.strip()
        if code_taken(db, code, line.id):
            raise conflict(f"Kode lini '{code}' sudah dipakai.")
        line.code = code
    if "name" in sent and body.name is not None:
        line.name = body.name.strip()
    if "model" in sent:
        line.model = body.model
    if "status" in sent and body.status is not None:
        line.status = body.status
    if "slogan" in sent:
        board.slogan = body.slogan
    if "line_label" in sent:
        board.line_label = body.line_label
    if "line_label_zh" in sent:
        board.line_label_zh = body.line_label_zh
    if "values" in sent and body.values is not None:
        board.values = body.values
    if "team_photo_url" in sent:
        board.team_photo_url = body.team_photo_url
    if "published" in sent and body.published is not None:
        board.is_active = body.published
    if "slug" in sent and body.slug is not None:
        slug = slugify(body.slug)
        if not slug or slug_taken(db, slug, board.id):
            raise conflict(f"Slug '{body.slug}' tidak tersedia.")
        board.slug = slug
    db.commit()
    return line_out(db, board, line, workshop)


@router.delete("/lines/{line_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_line(line_id: int, db: Session = Depends(get_db)) -> Response:
    board, line, _ = line_row(db, line_id)
    if active_members(db, board.id):
        raise conflict("Lini masih punya anggota aktif. Lepas semua anggota dulu.")
    db.execute(delete(BoardMember).where(BoardMember.board_id == board.id))
    db.delete(board)
    db.delete(line)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/lines/{line_id}/members", response_model=list[MemberOut])
def list_members(line_id: int, db: Session = Depends(get_db)) -> list[MemberOut]:
    board, _, _ = line_row(db, line_id)
    return [member_out(m, e) for m, e in active_members(db, board.id)]


def employee_board_name(db: Session, employee_id: int) -> str | None:
    row = db.execute(
        select(Line.code, Workshop.name)
        .select_from(BoardMember)
        .join(Board, Board.id == BoardMember.board_id)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .where(BoardMember.employee_id == employee_id, BoardMember.ended_at.is_(None))
    ).first()
    return f"{row[0]} ({row[1]})" if row else None


def employee_by_pk(db: Session, employee_pk: int) -> Employee:
    employee = db.get(Employee, employee_pk)
    if employee is None:
        raise not_found("Pengguna")
    if not employee.is_active:
        raise conflict(f"{employee.name} nonaktif. Aktifkan dulu di menu Pengguna.")
    return employee


@router.post(
    "/lines/{line_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED
)
def add_member(line_id: int, body: MemberIn, db: Session = Depends(get_db)) -> MemberOut:
    board, _, _ = line_row(db, line_id)
    if body.employee_pk is not None:
        employee = employee_by_pk(db, body.employee_pk)
        busy = employee_board_name(db, employee.id)
        if busy:
            raise conflict(f"{employee.name} masih aktif di lini {busy}. Lepas dulu dari sana.")
    else:
        employee_no = (body.employee_id or "").strip()
        name = (body.name or "").strip()
        employee = db.scalar(select(Employee).where(Employee.employee_no == employee_no))
        if employee is None:
            employee = new_employee(employee_no, name)
            db.add(employee)
            db.flush()
        else:
            busy = employee_board_name(db, employee.id)
            if busy:
                raise conflict(f"{employee.name} masih aktif di lini {busy}. Lepas dulu dari sana.")
            employee.name = name
        employee.dept = body.dept
        employee.supervisor = body.supervisor
        employee.work_phone = body.work_phone
        if body.position is not None:
            employee.position = body.position
        if body.photo_url is not None:
            employee.photo_url = body.photo_url
    member = BoardMember(
        board_id=board.id,
        employee_id=employee.id,
        sort_order=body.sort_order,
    )
    db.add(member)
    db.commit()
    return member_out(member, employee)


def active_member(db: Session, member_id: int) -> tuple[BoardMember, Employee]:
    member = db.get(BoardMember, member_id)
    if member is None or member.ended_at is not None:
        raise not_found("Anggota")
    employee = db.get(Employee, member.employee_id)
    assert employee is not None
    return member, employee


@router.patch("/members/{member_id}", response_model=MemberOut)
def update_member(member_id: int, body: MemberUpdate, db: Session = Depends(get_db)) -> MemberOut:
    member, employee = active_member(db, member_id)
    sent = body.model_fields_set
    if "employee_id" in sent and body.employee_id is not None:
        employee_no = body.employee_id.strip()
        taken = db.scalar(
            select(Employee.id).where(Employee.employee_no == employee_no, Employee.id != employee.id)
        )
        if taken:
            raise conflict(f"NIK '{employee_no}' sudah dipakai karyawan lain.")
        employee.employee_no = employee_no
        if employee.must_change_password:
            reset_password(employee)
    if "name" in sent and body.name is not None:
        employee.name = body.name.strip()
    if "dept" in sent:
        employee.dept = body.dept
    if "supervisor" in sent:
        employee.supervisor = body.supervisor
    if "work_phone" in sent:
        employee.work_phone = body.work_phone
    if "photo_url" in sent:
        employee.photo_url = body.photo_url
    if "position" in sent:
        employee.position = body.position
    if "sort_order" in sent and body.sort_order is not None:
        member.sort_order = body.sort_order
    db.commit()
    return member_out(member, employee)


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def release_member(member_id: int, db: Session = Depends(get_db)) -> Response:
    member, _ = active_member(db, member_id)
    member.ended_at = func.now()
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


PERIOD_PATH = Path(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="Month as YYYY-MM")


@router.get("/lines/{line_id}/mpv", response_model=list[MpvOut])
def list_mpv(line_id: int, db: Session = Depends(get_db)) -> list[MpvOut]:
    line_row(db, line_id)
    rows = db.execute(
        select(MpvAward, Employee)
        .join(Employee, Employee.id == MpvAward.employee_id)
        .where(MpvAward.line_id == line_id)
        .order_by(MpvAward.period.desc())
    ).all()
    return [mpv_out(award, employee) for award, employee in rows]


@router.put("/lines/{line_id}/mpv/{period}", response_model=MpvOut)
def save_mpv(line_id: int, body: MpvIn, period: str = PERIOD_PATH, db: Session = Depends(get_db)) -> MpvOut:
    line_row(db, line_id)
    month = parse_period(period)
    if body.employee_pk is not None:
        employee = employee_by_pk(db, body.employee_pk)
    else:
        employee_no = (body.employee_id or "").strip()
        name = (body.name or "").strip()
        employee = db.scalar(select(Employee).where(Employee.employee_no == employee_no))
        if employee is None:
            employee = new_employee(employee_no, name)
            db.add(employee)
            db.flush()
        employee.name = name
        employee.dept = body.dept
        employee.supervisor = body.supervisor
        employee.work_phone = body.work_phone
        employee.position = body.position
        employee.photo_url = body.photo_url
    award = db.scalar(select(MpvAward).where(MpvAward.line_id == line_id, MpvAward.period == month))
    if award is None:
        award = MpvAward(line_id=line_id, period=month, employee_id=employee.id)
        db.add(award)
    award.employee_id = employee.id
    db.commit()
    return mpv_out(award, employee)


@router.delete("/lines/{line_id}/mpv/{period}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mpv(line_id: int, period: str = PERIOD_PATH, db: Session = Depends(get_db)) -> Response:
    line_row(db, line_id)
    award = db.scalar(
        select(MpvAward).where(MpvAward.line_id == line_id, MpvAward.period == parse_period(period))
    )
    if award is None:
        raise not_found("MPV bulan itu")
    db.delete(award)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def employee_lines(db: Session) -> dict[int, str]:
    rows = db.execute(
        select(BoardMember.employee_id, Line.code, Workshop.name)
        .join(Board, Board.id == BoardMember.board_id)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .where(BoardMember.ended_at.is_(None))
    ).all()
    return {row[0]: f"{row[1]} ({row[2]})" for row in rows}


def employee_out(employee: Employee, line_label: str | None) -> EmployeeOut:
    return EmployeeOut(
        id=employee.id,
        employee_id=employee.employee_no,
        name=employee.name,
        role=employee.role,
        dept=employee.dept,
        position=employee.position,
        supervisor=employee.supervisor_name,
        supervisor_id=employee.supervisor_id,
        work_phone=employee.work_phone,
        photo_url=employee.photo_url,
        is_active=employee.is_active,
        must_change_password=employee.must_change_password,
        line_label=line_label,
    )


def check_supervisor(db: Session, supervisor_id: int | None, employee_id: int | None = None) -> None:
    if supervisor_id is None:
        return
    if employee_id is not None and supervisor_id == employee_id:
        raise conflict("Seseorang tidak bisa menjadi supervisor dirinya sendiri.")
    supervisor = db.get(Employee, supervisor_id)
    if supervisor is None:
        raise not_found("Supervisor")
    if supervisor.role != "supervisor":
        raise conflict(f"{supervisor.name} bukan supervisor. Ubah role-nya dulu di menu Pengguna.")
    if not supervisor.is_active:
        raise conflict(f"{supervisor.name} nonaktif, jadi tidak bisa dipilih sebagai supervisor.")


def subordinate_count(db: Session, employee_id: int) -> int:
    return db.scalar(select(func.count(Employee.id)).where(Employee.supervisor_id == employee_id)) or 0


def nik_taken(db: Session, employee_no: str, exclude_id: int | None = None) -> bool:
    query = select(Employee.id).where(Employee.employee_no == employee_no)
    if exclude_id is not None:
        query = query.where(Employee.id != exclude_id)
    return db.scalar(query) is not None


@router.get("/employees", response_model=list[EmployeeOut])
def list_employees(db: Session = Depends(get_db)) -> list[EmployeeOut]:
    lines = employee_lines(db)
    employees = db.scalars(select(Employee).order_by(Employee.name, Employee.id))
    return [employee_out(e, lines.get(e.id)) for e in employees]


@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(body: EmployeeIn, db: Session = Depends(get_db)) -> EmployeeOut:
    employee_no = body.employee_id.strip()
    if nik_taken(db, employee_no):
        raise conflict(f"NIK '{employee_no}' sudah dipakai karyawan lain.")
    check_supervisor(db, body.supervisor_id)
    employee = new_employee(
        employee_no,
        body.name.strip(),
        role=body.role,
        dept=body.dept,
        position=body.position,
        supervisor_id=body.supervisor_id,
        work_phone=body.work_phone,
        photo_url=body.photo_url,
    )
    db.add(employee)
    db.commit()
    return employee_out(employee, None)


@router.patch("/employees/{employee_pk}", response_model=EmployeeOut)
def update_employee(employee_pk: int, body: EmployeeUpdate, db: Session = Depends(get_db)) -> EmployeeOut:
    employee = db.get(Employee, employee_pk)
    if employee is None:
        raise not_found("Pengguna")
    sent = body.model_fields_set
    line_label = employee_lines(db).get(employee.id)
    if "employee_id" in sent and body.employee_id is not None:
        employee_no = body.employee_id.strip()
        if nik_taken(db, employee_no, employee.id):
            raise conflict(f"NIK '{employee_no}' sudah dipakai karyawan lain.")
        employee.employee_no = employee_no
        if employee.must_change_password:
            reset_password(employee)
    if "name" in sent and body.name is not None:
        employee.name = body.name.strip()
    if "role" in sent and body.role is not None:
        if body.role != "supervisor" and employee.role == "supervisor":
            count = subordinate_count(db, employee.id)
            if count:
                raise conflict(f"{employee.name} masih jadi supervisor {count} orang. Pindahkan mereka dulu.")
        employee.role = body.role
    if "dept" in sent:
        employee.dept = body.dept
    if "position" in sent:
        employee.position = body.position
    if "supervisor_id" in sent:
        check_supervisor(db, body.supervisor_id, employee.id)
        employee.supervisor_id = body.supervisor_id
        employee.supervisor = None
    if "work_phone" in sent:
        employee.work_phone = body.work_phone
    if "photo_url" in sent:
        employee.photo_url = body.photo_url
    if "is_active" in sent and body.is_active is not None:
        if not body.is_active and line_label:
            raise conflict(f"{employee.name} masih aktif di lini {line_label}. Lepas dulu dari sana.")
        employee.is_active = body.is_active
    db.commit()
    return employee_out(employee, line_label)


@router.post("/employees/{employee_pk}/reset-password", response_model=EmployeeOut)
def reset_employee_password(
    employee_pk: int, body: ResetPasswordIn | None = None, db: Session = Depends(get_db)
) -> EmployeeOut:
    employee = db.get(Employee, employee_pk)
    if employee is None:
        raise not_found("Pengguna")
    reset_password(employee, body.password if body else None)
    db.commit()
    return employee_out(employee, employee_lines(db).get(employee.id))


@router.delete("/employees/{employee_pk}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_pk: int, db: Session = Depends(get_db)) -> Response:
    employee = db.get(Employee, employee_pk)
    if employee is None:
        raise not_found("Pengguna")
    count = subordinate_count(db, employee.id)
    if count:
        raise conflict(f"{employee.name} masih jadi supervisor {count} orang. Pindahkan mereka dulu.")
    active_in = employee_lines(db).get(employee.id)
    if active_in:
        raise conflict(f"{employee.name} masih aktif di lini {active_in}. Lepas dulu dari lini itu, baru bisa dihapus.")
    if db.scalar(select(MpvAward.id).where(MpvAward.employee_id == employee.id).limit(1)):
        raise conflict(f"{employee.name} pernah jadi MPV, jadi riwayatnya harus tetap ada. Nonaktifkan saja.")
    db.execute(delete(BoardMember).where(BoardMember.employee_id == employee.id))
    db.delete(employee)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
