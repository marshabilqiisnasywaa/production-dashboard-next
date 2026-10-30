from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.api.meetings import _absence_fields
from app.core.roles import ROLES
from app.db.session import get_db
from app.models import DmGroup, Board, BoardMember, DmMeetingAttendance, DmMeetingSession, Employee, Line, MpvAward, Workshop
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
    WorkshopHod,
    AttendanceRecapOut,
    RecapRowOut,
    RecapSessionOut,
    RoleOptionOut,
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
from app.services.face.enrollment import has_photo_template, photo_template_ids, sync_photo
from app.services.face.matcher import matcher

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


def conflict(message: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, message)


def not_found(what: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} tidak ditemukan.")


def workshop_out(db: Session, workshop: Workshop) -> WorkshopOut:
    count = db.scalar(select(func.count(Line.id)).where(Line.workshop_id == workshop.id))
    return WorkshopOut(id=workshop.id, name=workshop.name, line_count=count or 0)


@router.get("/workshops/{workshop_id}/hod", response_model=WorkshopHod | None)
def get_workshop_hod(workshop_id: int, db: Session = Depends(get_db)):
    workshop = db.get(Workshop, workshop_id)
    if workshop is None:
        raise not_found("Workshop")
    return workshop.hod


@router.put("/workshops/{workshop_id}/hod", response_model=WorkshopHod)
def save_workshop_hod(workshop_id: int, body: WorkshopHod, db: Session = Depends(get_db)):
    workshop = db.get(Workshop, workshop_id)
    if workshop is None:
        raise not_found("Workshop")
    workshop.hod = body.model_dump()
    db.commit()
    return body


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
    if db.scalar(select(DmGroup.id).where(DmGroup.workshop_id == workshop_id).limit(1)):
        raise conflict("Workshop masih punya DM. Hapus DM kosong terlebih dahulu.")
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
    group = db.get(DmGroup, body.dm_group_id) if body.dm_group_id is not None else None
    if group is None or group.workshop_id != workshop.id:
        raise HTTPException(400, "Pilih DM dalam workshop ini sebelum membuat lini.")
    code = body.code.strip()
    if code_taken(db, code):
        raise conflict(f"Kode lini '{code}' sudah dipakai.")
    slug = pick_slug(db, body.slug, f"{workshop.name} {code}")
    line = Line(
        workshop_id=workshop.id,
        dm_group_id=group.id,
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
    target_workshop_id = body.workshop_id if body.workshop_id is not None else line.workshop_id
    group_id = body.dm_group_id if "dm_group_id" in sent else line.dm_group_id
    group = db.get(DmGroup, group_id) if group_id is not None else None
    if group_id is not None and (group is None or group.workshop_id != target_workshop_id):
        raise HTTPException(400, "DM harus berada di workshop yang sama dengan lini.")
    if "dm_group_id" in sent:
        line.dm_group_id = group_id
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
    else:
        employee_no = (body.employee_id or "").strip()
        name = (body.name or "").strip()
        employee = db.scalar(select(Employee).where(Employee.employee_no == employee_no))
        if employee is None:
            employee = new_employee(employee_no, name)
            db.add(employee)
            db.flush()
        else:
            employee.name = name
        employee.dept = body.dept
        employee.supervisor = body.supervisor
        employee.work_phone = body.work_phone
        if body.position is not None:
            employee.position = body.position
        if body.photo_url is not None:
            employee.photo_url = body.photo_url

    already_in_board = db.scalar(
        select(BoardMember.id).where(
            BoardMember.board_id == board.id,
            BoardMember.employee_id == employee.id,
            BoardMember.ended_at.is_(None),
        )
    )
    if already_in_board:
        raise conflict(f"{employee.name} sudah terdaftar aktif di lini ini.")
    target_dept = (body.target_dept or "").strip().upper()
    employee_dept = (employee.dept or "").strip().upper()
    if target_dept and employee_dept != target_dept:
        raise conflict(
            f"Ditolak: {employee.name} dari departemen {employee_dept or 'tanpa departemen'}, "
            f"hanya petugas departemen {target_dept} yang bisa mengisi atau mewakili papercard {target_dept}."
        )
    has_other_line = db.scalar(
        select(BoardMember.id).where(
            BoardMember.employee_id == employee.id,
            BoardMember.ended_at.is_(None),
        )
    )
    member = BoardMember(
        board_id=board.id,
        employee_id=employee.id,
        sort_order=body.sort_order,
        is_substitute=bool(has_other_line),
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


def employee_lines(db: Session) -> dict[int, list[str]]:
    rows = db.execute(
        select(BoardMember.employee_id, Line.code, Workshop.name)
        .join(Board, Board.id == BoardMember.board_id)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .where(BoardMember.ended_at.is_(None))
        .order_by(Line.code)
    ).all()
    res: dict[int, list[str]] = {}
    for emp_id, line_code, workshop_name in rows:
        label = f"{line_code} ({workshop_name})"
        res.setdefault(emp_id, []).append(label)
    return res


def employee_out(
    employee: Employee,
    line_labels: list[str] | None = None,
    face_enrolled: bool = False,
    face_message: str | None = None,
) -> EmployeeOut:
    labels = line_labels or []
    line_label = ", ".join(labels) if labels else None
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
        line_labels=labels,
        face_enrolled=face_enrolled,
        face_message=face_message,
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


@router.get("/roles", response_model=list[RoleOptionOut])
def list_roles() -> list[RoleOptionOut]:
    return [RoleOptionOut(value=key, label=role.label) for key, role in ROLES.items() if key != "hod"]


@router.get("/employees", response_model=list[EmployeeOut])
def list_employees(db: Session = Depends(get_db)) -> list[EmployeeOut]:
    lines = employee_lines(db)
    enrolled = photo_template_ids(db)
    employees = db.scalars(select(Employee).where(Employee.role != "hod").order_by(Employee.name, Employee.id))
    return [employee_out(e, lines.get(e.id, []), e.id in enrolled) for e in employees]


@router.post("/employees", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(body: EmployeeIn, db: Session = Depends(get_db)) -> EmployeeOut:
    if body.role == "hod":
        raise HTTPException(403, "Akun HOD hanya bisa dibuat lewat seeder.")
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
    db.flush()
    face_message = sync_photo(db, employee) if employee.photo_url else None
    db.commit()
    matcher.reload(db)
    return employee_out(employee, [], bool(employee.photo_url) and face_message is None, face_message)


@router.patch("/employees/{employee_pk}", response_model=EmployeeOut)
def update_employee(employee_pk: int, body: EmployeeUpdate, db: Session = Depends(get_db)) -> EmployeeOut:
    employee = db.get(Employee, employee_pk)
    if employee is None:
        raise not_found("Pengguna")
    if body.role == "hod" and employee.role != "hod":
        raise HTTPException(403, "Akun HOD hanya bisa dibuat lewat seeder.")
    sent = body.model_fields_set
    emp_lines = employee_lines(db).get(employee.id, [])
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
        if not body.is_active and emp_lines:
            raise conflict(f"{employee.name} masih aktif di lini {', '.join(emp_lines)}. Lepas dulu dari sana.")
        employee.is_active = body.is_active
    face_message = sync_photo(db, employee) if "photo_url" in sent else None
    db.commit()
    matcher.reload(db)
    return employee_out(employee, emp_lines, has_photo_template(db, employee.id), face_message)


@router.post("/employees/{employee_pk}/reset-password", response_model=EmployeeOut)
def reset_employee_password(
    employee_pk: int, body: ResetPasswordIn | None = None, db: Session = Depends(get_db)
) -> EmployeeOut:
    employee = db.get(Employee, employee_pk)
    if employee is None:
        raise not_found("Pengguna")
    reset_password(employee, body.password if body else None)
    db.commit()
    return employee_out(employee, employee_lines(db).get(employee.id, []), has_photo_template(db, employee.id))


@router.delete("/employees/{employee_pk}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(employee_pk: int, db: Session = Depends(get_db)) -> Response:
    employee = db.get(Employee, employee_pk)
    if employee is None:
        raise not_found("Pengguna")
    count = subordinate_count(db, employee.id)
    if count:
        raise conflict(f"{employee.name} masih jadi supervisor {count} orang. Pindahkan mereka dulu.")
    active_in = employee_lines(db).get(employee.id, [])
    if active_in:
        raise conflict(f"{employee.name} masih aktif di lini {', '.join(active_in)}. Lepas dulu dari lini itu, baru bisa dihapus.")
    if db.scalar(select(MpvAward.id).where(MpvAward.employee_id == employee.id).limit(1)):
        raise conflict(f"{employee.name} pernah jadi MPV, jadi riwayatnya harus tetap ada. Nonaktifkan saja.")
    db.execute(delete(BoardMember).where(BoardMember.employee_id == employee.id))
    db.delete(employee)
    db.commit()
    matcher.reload(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# @router.get("/attendance-recap", response_model=AttendanceRecapOut)
# def attendance_recap(
#     date_val: date = Query(..., alias="date"),
#     line_id: int | None = None,
#     db: Session = Depends(get_db),
# ) -> AttendanceRecapOut:
#     stmt = (
#         select(DmMeetingSession, Line.code)
#         .join(Line, Line.id == DmMeetingSession.line_id)
#         .where(DmMeetingSession.date == date_val)
#         .order_by(Line.code, DmMeetingSession.session_number)
#     )
#     if line_id is not None:
#         stmt = stmt.where(DmMeetingSession.line_id == line_id)
#     found = db.execute(stmt).all()

#     team_size = dict(
#         db.execute(
#             select(Board.line_id, func.count(BoardMember.id))
#             .join(BoardMember, BoardMember.board_id == Board.id)
#             .where(BoardMember.ended_at.is_(None))
#             .group_by(Board.line_id)
#         ).all()
#     )
#     home_lines_set: dict[int, set[int]] = {}
#     home_lines_code: dict[int, list[str]] = {}
#     for emp_id, l_id, l_code in db.execute(
#         select(BoardMember.employee_id, Line.id, Line.code)
#         .join(Board, Board.id == BoardMember.board_id)
#         .join(Line, Line.id == Board.line_id)
#         .where(BoardMember.ended_at.is_(None))
#         .order_by(Line.code)
#     ).all():
#         home_lines_set.setdefault(emp_id, set()).add(l_id)
#         home_lines_code.setdefault(emp_id, []).append(l_code)

#     sessions = [
#         RecapSessionOut(
#             id=s.id,
#             line_id=s.line_id,
#             line_code=code,
#             session_number=s.session_number,
#             label=s.label,
#             scheduled_time=s.scheduled_time,
#             status=s.status,
#             started_at=s.started_at,
#             ended_at=s.ended_at,
#             team_size=sum(s.line_id in item["line_ids"] for item in s.roster) if s.roster is not None else team_size.get(s.line_id, 0),
#         )
#         for s, code in found
#     ]

#     by_session = {s.id: (s, code) for s, code in found}
#     rows: list[RecapRowOut] = []
#     if by_session:
#         attendances = db.execute(
#             select(DmMeetingAttendance, Employee)
#             .join(Employee, Employee.id == DmMeetingAttendance.employee_id)
#             .where(DmMeetingAttendance.session_id.in_(list(by_session)))
#             .order_by(DmMeetingAttendance.attended_at)
#         ).all()
#         for a, emp in attendances:
#             session, code = by_session[a.session_id]
#             snapshot = next((item for item in session.roster or [] if item["employee_id"] == emp.id), None)
#             if session.roster is not None:
#                 if snapshot is None or session.line_id not in snapshot["line_ids"]:
#                     continue
#                 is_member_of_session_line = True
#                 home_label = ", ".join(snapshot["line_codes"])
#             else:
#                 is_member_of_session_line = session.line_id in home_lines_set.get(emp.id, set())
#                 home_label = ", ".join(home_lines_code.get(emp.id, [])) or None
#             reason, note = _absence_fields(a)
#             rows.append(
#                 RecapRowOut(
#                     session_id=session.id,
#                     line_id=session.line_id,
#                     line_code=code,
#                     session_number=session.session_number,
#                     employee_no=emp.employee_no,
#                     name=emp.name,
#                     dept=emp.dept,
#                     position=emp.position,
#                     status=a.status,
#                     absence_reason=reason,
#                     absence_note=note,
#                     attended_at=a.attended_at,
#                     is_guest=a.status == "present" and not is_member_of_session_line,
#                     home_line=home_label,
#                 )
#             )

#     return AttendanceRecapOut(date=date_val, sessions=sessions, rows=rows)
