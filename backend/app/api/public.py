from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.meetings import _absence_fields
from app.api.workshop_meetings import map_session
from app.db.session import get_db
from app.models import (
    Board,
    BoardMember,
    DmMeetingAttendance,
    DmMeetingSession,
    Employee,
    Line,
    Workshop,
    WorkshopMeetingSession,
    SupervisorWorkshop,
)
from app.schemas import (
    PublicAttendanceRecapOut,
    PublicBoardListItem,
    PublicBoardOut,
    RecapRowOut,
    RecapSessionOut,
    WorkshopRecapAttendanceOut,
    WorkshopRecapParticipantOut,
    WorkshopRecapSessionOut,
    CamelModel,
    WorkshopHod,
)
from app.services.boards import public_board

router = APIRouter(prefix="/public", tags=["public"])

class PublicWorkshopSupervisorOut(CamelModel):
    employee_id: int
    name: str
    position: str | None
    work_phone: str | None
    photo_url: str | None
    responsibility: str | None


class PublicWorkshopTeamOut(CamelModel):
    workshop_id: int
    workshop_name: str
    hod: WorkshopHod | None = None
    supervisors: list[PublicWorkshopSupervisorOut]


class PublicWorkshopListItem(CamelModel):
    id: int
    name: str


@router.get("/workshops", response_model=list[PublicWorkshopListItem])
def list_workshops(db: Session = Depends(get_db)) -> list[PublicWorkshopListItem]:
    return [
        PublicWorkshopListItem(id=workshop.id, name=workshop.name)
        for workshop in db.scalars(select(Workshop).order_by(Workshop.name, Workshop.id))
    ]


@router.get("/boards", response_model=list[PublicBoardListItem])
def list_boards(db: Session = Depends(get_db)) -> list[PublicBoardListItem]:
    rows = db.execute(
        select(Board, Line, Workshop)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .where(Board.is_active.is_(True))
        .order_by(Workshop.name, Line.code)
    ).all()
    return [
        PublicBoardListItem(
            slug=board.slug,
            workshop_id=workshop.id,
            line_code=line.code,
            line_name=line.name,
            workshop_name=workshop.name,
            status=line.status,
        )
        for board, line, workshop in rows
    ]


@router.get("/boards/{slug}", response_model=PublicBoardOut)
def get_board(slug: str, db: Session = Depends(get_db)) -> PublicBoardOut:
    row = db.execute(
        select(Board, Line, Workshop)
        .join(Line, Line.id == Board.line_id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .where(Board.slug == slug, Board.is_active.is_(True))
    ).first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Dashboard tidak ditemukan.")
    return public_board(db, *row)

@router.get(
    "/workshops/{workshop_id}/team",
    response_model=PublicWorkshopTeamOut,
)
def get_workshop_team(
    workshop_id: int,
    db: Session = Depends(get_db),
) -> PublicWorkshopTeamOut:
    workshop = db.get(Workshop, workshop_id)

    if workshop is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Workshop tidak ditemukan.",
        )

    rows = db.execute(
        select(SupervisorWorkshop, Employee)
        .join(
            Employee,
            Employee.id == SupervisorWorkshop.employee_id,
        )
        .where(
            SupervisorWorkshop.workshop_id == workshop.id,
            Employee.role == "supervisor",
            Employee.is_active.is_(True),
        )
        .order_by(SupervisorWorkshop.id)
    ).all()

    return PublicWorkshopTeamOut(
        workshop_id=workshop.id,
        workshop_name=workshop.name,
        hod=workshop.hod,
        supervisors=[
            PublicWorkshopSupervisorOut(
                employee_id=employee.id,
                name=employee.name,
                position=employee.position,
                work_phone=employee.work_phone,
                photo_url=employee.photo_url,
                responsibility=assignment.responsibility,
            )
            for assignment, employee in rows
        ],
    )

@router.get("/attendance-recap", response_model=PublicAttendanceRecapOut)
def attendance_recap(
    date_val: date = Query(..., alias="date"),
    line_id: int | None = None,
    db: Session = Depends(get_db),
) -> PublicAttendanceRecapOut:
    stmt = (
        select(DmMeetingSession, Line.code)
        .join(Line, Line.id == DmMeetingSession.line_id)
        .where(DmMeetingSession.date == date_val)
        .order_by(Line.code, DmMeetingSession.session_number)
    )
    if line_id is not None:
        stmt = stmt.where(DmMeetingSession.line_id == line_id)
    found = db.execute(stmt).all()

    team_size = dict(
        db.execute(
            select(Board.line_id, func.count(BoardMember.id))
            .join(BoardMember, BoardMember.board_id == Board.id)
            .where(BoardMember.ended_at.is_(None))
            .group_by(Board.line_id)
        ).all()
    )

    home_lines_set: dict[int, set[int]] = {}
    home_lines_code: dict[int, list[str]] = {}

    for emp_id, l_id, l_code in db.execute(
        select(BoardMember.employee_id, Line.id, Line.code)
        .join(Board, Board.id == BoardMember.board_id)
        .join(Line, Line.id == Board.line_id)
        .where(BoardMember.ended_at.is_(None))
        .order_by(Line.code)
    ).all():
        home_lines_set.setdefault(emp_id, set()).add(l_id)
        home_lines_code.setdefault(emp_id, []).append(l_code)

    sessions = [
        RecapSessionOut(
            id=s.id,
            line_id=s.line_id,
            line_code=code,
            session_number=s.session_number,
            label=s.label,
            scheduled_time=s.scheduled_time,
            status=s.status,
            started_at=s.started_at,
            ended_at=s.ended_at,
            team_size=(
                sum(s.line_id in item["line_ids"] for item in s.roster)
                if s.roster is not None
                else team_size.get(s.line_id, 0)
            ),
        )
        for s, code in found
    ]

    by_session = {s.id: (s, code) for s, code in found}
    rows: list[RecapRowOut] = []

    if by_session:
        attendances = db.execute(
            select(DmMeetingAttendance, Employee)
            .join(Employee, Employee.id == DmMeetingAttendance.employee_id)
            .where(DmMeetingAttendance.session_id.in_(list(by_session)))
            .order_by(DmMeetingAttendance.attended_at)
        ).all()

        for a, emp in attendances:
            session, code = by_session[a.session_id]
            snapshot = next(
                (
                    item
                    for item in session.roster or []
                    if item["employee_id"] == emp.id
                ),
                None,
            )

            if session.roster is not None:
                if snapshot is None or session.line_id not in snapshot["line_ids"]:
                    continue
                is_member_of_session_line = True
                home_label = ", ".join(snapshot["line_codes"])
            else:
                is_member_of_session_line = (
                    session.line_id in home_lines_set.get(emp.id, set())
                )
                home_label = ", ".join(home_lines_code.get(emp.id, [])) or None

            reason, note = _absence_fields(a)

            rows.append(
                RecapRowOut(
                    session_id=session.id,
                    line_id=session.line_id,
                    line_code=code,
                    session_number=session.session_number,
                    employee_no=emp.employee_no,
                    name=emp.name,
                    dept=emp.dept,
                    position=emp.position,
                    status=a.status,
                    absence_reason=reason,
                    absence_note=note,
                    attended_at=a.attended_at,
                    is_guest=a.status == "present" and not is_member_of_session_line,
                    home_line=home_label,
                )
            )

    workshop_sessions: list[WorkshopRecapSessionOut] = []

    if line_id is None:
        workshop_rows = db.scalars(
            select(WorkshopMeetingSession)
            .where(
                WorkshopMeetingSession.date == date_val,
                WorkshopMeetingSession.source_session_id.is_(None),
            )
            .order_by(
                WorkshopMeetingSession.workshop_id,
                WorkshopMeetingSession.id,
            )
        ).all()

        for workshop_session in workshop_rows:
            mapped = map_session(workshop_session, db)

            workshop_sessions.append(
                WorkshopRecapSessionOut(
                    id=mapped.id,
                    date=mapped.date,
                    scheduled_time=mapped.scheduled_time,
                    status=mapped.status,
                    participants=[
                        WorkshopRecapParticipantOut(
                            employee_no=p.employee_no,
                            name=p.name,
                            position=p.position,
                            dept=p.dept,
                        )
                        for p in mapped.participants
                    ],
                    attendances=[
                        WorkshopRecapAttendanceOut(
                            employee_id=a.employee_id,
                            employee_no=a.employee_no,
                            employee_name=a.employee_name,
                            position=a.position,
                            department=a.department,
                            status=a.status,
                            attended_at=a.attended_at,
                        )
                        for a in mapped.attendances
                    ],
                )
            )

    return PublicAttendanceRecapOut(
        date=date_val,
        sessions=sessions,
        rows=rows,
        workshop_sessions=workshop_sessions,
    )
