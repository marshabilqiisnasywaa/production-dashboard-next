from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Employee, Line, WorkshopMeetingSession, WorkshopMeetingSummary
from app.services.problem_access import is_pic, pic_filter
from app.schemas import myProblemOut

# Workshop problems share the problem list with DM problems. Their ids are sent negated so the
# two tables never collide and the status/solution endpoints can tell them apart.


def is_workshop_id(problem_id: int) -> bool:
    return problem_id < 0


def to_out(sm: WorkshopMeetingSummary, session: WorkshopMeetingSession) -> myProblemOut:
    return myProblemOut(
        id=-sm.id,
        session_id=-session.id,
        line_id=0,
        line_code=sm.line_code,
        date=session.date,
        session_label=session.label,
        problem=sm.problem,
        problem_categories=sm.problem_categories,
        solution=sm.solution,
        pic_name=sm.pic_name,
        pic_id=sm.pic_id,
        due_date=sm.due_date,
        status=sm.status,
    )


def _is_pic(sm: WorkshopMeetingSummary, employee: Employee) -> bool:
    return is_pic(sm, employee)


def for_pic(db: Session, employee: Employee) -> list[myProblemOut]:
    stmt = (
        select(WorkshopMeetingSummary, WorkshopMeetingSession)
        .join(WorkshopMeetingSession, WorkshopMeetingSession.id == WorkshopMeetingSummary.session_id)
        .where(
            pic_filter(WorkshopMeetingSummary, [employee.id], [employee.name.strip().lower()])
        )
        .order_by(WorkshopMeetingSession.date.desc(), WorkshopMeetingSummary.id.desc())
    )
    return [to_out(sm, s) for sm, s in db.execute(stmt).all()]


def unresolved_for_pics(db: Session, pic_ids: list[int] | None, pic_names: list[str] | None) -> list[myProblemOut]:
    stmt = (
        select(WorkshopMeetingSummary, WorkshopMeetingSession)
        .join(WorkshopMeetingSession, WorkshopMeetingSession.id == WorkshopMeetingSummary.session_id)
        .where(WorkshopMeetingSummary.status != "resolved")
    )
    if pic_ids is not None:
        stmt = stmt.where(
            pic_filter(WorkshopMeetingSummary, pic_ids, pic_names or [])
        )
    stmt = stmt.order_by(WorkshopMeetingSession.date.desc(), WorkshopMeetingSummary.id.desc())
    return [to_out(sm, s) for sm, s in db.execute(stmt).all()]


def for_lines(db: Session, line_ids: list[int] | None) -> list[myProblemOut]:
    stmt = select(WorkshopMeetingSummary, WorkshopMeetingSession).join(
        WorkshopMeetingSession, WorkshopMeetingSession.id == WorkshopMeetingSummary.session_id,
    )
    if line_ids is not None:
        stmt = stmt.where(WorkshopMeetingSummary.line_code.in_(
            select(Line.code).where(Line.id.in_(line_ids)),
        ))
    return [to_out(sm, session) for sm, session in db.execute(stmt).all()]


def _load(db: Session, problem_id: int) -> tuple[WorkshopMeetingSummary, WorkshopMeetingSession]:
    sm = db.get(WorkshopMeetingSummary, -problem_id)
    if sm is None:
        raise HTTPException(status_code=404, detail="Problem tidak ditemukan.")
    session = db.get(WorkshopMeetingSession, sm.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesi meeting tidak ditemukan.")
    return sm, session


def set_status(db: Session, employee: Employee | None, problem_id: int, status: str) -> myProblemOut:
    sm, session = _load(db, problem_id)
    if employee is not None and not _is_pic(sm, employee):
        raise HTTPException(status_code=403, detail="Hanya PIC yang bisa mengubah status problem.")
    if status == "resolved":
        if sm.status != "resolved":
            sm.resolved_at = datetime.now(timezone.utc)
    else:
        sm.resolved_at = None
    sm.status = status
    db.commit()
    db.refresh(sm)
    return to_out(sm, session)


def set_solution(db: Session, employee: Employee, problem_id: int, solution: str | None) -> myProblemOut:
    sm, session = _load(db, problem_id)
    if not _is_pic(sm, employee):
        raise HTTPException(status_code=403, detail="Hanya PIC masalah ini yang dapat mengisi solusi.")
    sm.solution = (solution or "").strip() or None
    db.commit()
    db.refresh(sm)
    return to_out(sm, session)
