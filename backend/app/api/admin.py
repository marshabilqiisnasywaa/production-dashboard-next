from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models import Board, BoardMember, Employee, Line, MpvAward, Workshop
from app.schemas import (
    LineIn,
    LineOut,
    LineUpdate,
    MemberIn,
    MemberOut,
    MemberUpdate,
    MpvIn,
    MpvOut,
    WorkshopIn,
    WorkshopOut,
)
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


@router.post(
    "/lines/{line_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED
)
def add_member(line_id: int, body: MemberIn, db: Session = Depends(get_db)) -> MemberOut:
    board, _, _ = line_row(db, line_id)
    employee_no = body.employee_id.strip()
    employee = db.scalar(select(Employee).where(Employee.employee_no == employee_no))
    if employee is None:
        employee = Employee(employee_no=employee_no, name=body.name.strip())
        db.add(employee)
        db.flush()
    else:
        busy = employee_board_name(db, employee.id)
        if busy:
            raise conflict(f"{employee.name} masih aktif di lini {busy}. Lepas dulu dari sana.")
        employee.name = body.name.strip()
    employee.dept = body.dept
    employee.supervisor = body.supervisor
    employee.work_phone = body.work_phone
    if body.photo_url is not None:
        employee.photo_url = body.photo_url
    member = BoardMember(
        board_id=board.id,
        employee_id=employee.id,
        position=body.position,
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
        member.position = body.position
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
    employee_no = body.employee_id.strip()
    employee = db.scalar(select(Employee).where(Employee.employee_no == employee_no))
    if employee is None:
        employee = Employee(employee_no=employee_no, name=body.name.strip())
        db.add(employee)
        db.flush()
    employee.name = body.name.strip()
    employee.dept = body.dept
    employee.supervisor = body.supervisor
    employee.work_phone = body.work_phone
    employee.photo_url = body.photo_url
    award = db.scalar(select(MpvAward).where(MpvAward.line_id == line_id, MpvAward.period == month))
    if award is None:
        award = MpvAward(line_id=line_id, period=month, employee_id=employee.id)
        db.add(award)
    award.employee_id = employee.id
    award.position = body.position
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
