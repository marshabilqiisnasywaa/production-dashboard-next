import re
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Board, BoardMember, Employee, Line, MpvAward, Workshop
from app.schemas import LineOut, MemberOut, MpvOut, PublicBoardOut

RESERVED_SLUGS = {"admin"}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def workshop_label(workshop_name: str) -> str:
    return f"DM TRIANGLE {workshop_name.upper()}"


def slug_taken(db: Session, slug: str, exclude_board_id: int | None = None) -> bool:
    query = select(Board.id).where(Board.slug == slug)
    if exclude_board_id is not None:
        query = query.where(Board.id != exclude_board_id)
    return slug in RESERVED_SLUGS or db.scalar(query) is not None


def pick_slug(db: Session, requested: str | None, fallback_source: str) -> str:
    if requested:
        slug = slugify(requested)
        if not slug or slug_taken(db, slug):
            raise HTTPException(status.HTTP_409_CONFLICT, f"Slug '{requested}' tidak tersedia.")
        return slug
    base = slugify(fallback_source) or "board"
    slug, counter = base, 2
    while slug_taken(db, slug):
        slug = f"{base}-{counter}"
        counter += 1
    return slug


def active_members(db: Session, board_id: int) -> list[tuple[BoardMember, Employee]]:
    rows = db.execute(
        select(BoardMember, Employee)
        .join(Employee, Employee.id == BoardMember.employee_id)
        .where(BoardMember.board_id == board_id, BoardMember.ended_at.is_(None))
        .order_by(BoardMember.sort_order, BoardMember.id)
    ).all()
    return [(row[0], row[1]) for row in rows]


def member_out(member: BoardMember, employee: Employee) -> MemberOut:
    return MemberOut(
        id=member.id,
        employee_id=employee.employee_no,
        name=employee.name,
        dept=employee.dept,
        supervisor=employee.supervisor,
        work_phone=employee.work_phone,
        photo_url=employee.photo_url,
        position=member.position,
        sort_order=member.sort_order,
    )


def month_start(day: date) -> date:
    return day.replace(day=1)


def previous_month_start(day: date) -> date:
    return month_start(month_start(day) - timedelta(days=1))


def period_label(period: date) -> str:
    return f"{period.year:04d}-{period.month:02d}"


def parse_period(value: str) -> date:
    year, month = value.split("-")
    return date(int(year), int(month), 1)


def mpv_out(award: MpvAward, employee: Employee) -> MpvOut:
    return MpvOut(
        id=award.id,
        period=period_label(award.period),
        employee_id=employee.employee_no,
        name=employee.name,
        dept=employee.dept,
        supervisor=employee.supervisor,
        work_phone=employee.work_phone,
        photo_url=employee.photo_url,
        position=award.position,
    )


def current_mpv(db: Session, line_id: int) -> MpvOut | None:
    row = db.execute(
        select(MpvAward, Employee)
        .join(Employee, Employee.id == MpvAward.employee_id)
        .where(MpvAward.line_id == line_id, MpvAward.period <= previous_month_start(date.today()))
        .order_by(MpvAward.period.desc())
        .limit(1)
    ).first()
    return mpv_out(row[0], row[1]) if row else None


def public_board(db: Session, board: Board, line: Line, workshop: Workshop) -> PublicBoardOut:
    return PublicBoardOut(
        slug=board.slug,
        line_code=line.code,
        line_name=line.name,
        model=line.model,
        status=line.status,
        slogan=board.slogan,
        line_label=board.line_label,
        line_label_zh=board.line_label_zh,
        workshop_label=workshop_label(workshop.name),
        values=list(board.values or []),
        team_photo_url=board.team_photo_url,
        members=[member_out(m, e) for m, e in active_members(db, board.id)],
        mpv=current_mpv(db, line.id),
    )


def line_out(db: Session, board: Board, line: Line, workshop: Workshop) -> LineOut:
    count = db.scalar(
        select(func.count(BoardMember.id)).where(
            BoardMember.board_id == board.id, BoardMember.ended_at.is_(None)
        )
    )
    return LineOut(
        id=line.id,
        board_id=board.id,
        workshop_id=workshop.id,
        workshop_name=workshop.name,
        code=line.code,
        name=line.name,
        model=line.model,
        status=line.status,
        slogan=board.slogan,
        line_label=board.line_label,
        line_label_zh=board.line_label_zh,
        values=list(board.values or []),
        team_photo_url=board.team_photo_url,
        slug=board.slug,
        member_count=count or 0,
    )
