from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.meetings import _absence_fields, _map_session
from app.api.workshop_meetings import map_session
from app.db.session import get_db
from app.models import (
    Board,
    BoardMember,
    DmMeetingAttendance,
    DmGroup,
    DmMeetingSession,
    Employee,
    LeaderAssignment,
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
    MeetingSessionOut,
    PapercardKpiOut,
    ScorecardLeaderOut,
    SqdipKpiOut,
    StandupKpiOut,
    WorkshopHod,
)
from app.services import sqdip as sqdip_service
from app.services import standup_kpi
from app.services.boards import public_board
from app.services.papercard_kpi import MAX_CLOSED, MAX_ON_TIME, MAX_REGISTERED, MAX_TOTAL, average_scores, line_kpi

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

@router.get("/sessions/{session_id}", response_model=MeetingSessionOut)
def get_public_session(session_id: int, db: Session = Depends(get_db)) -> MeetingSessionOut:
    session = db.get(DmMeetingSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesi meeting tidak ditemukan.")
    return _map_session(session, db)


@router.get("/workshop-sessions/{session_id}", response_model=MeetingSessionOut)
def get_public_workshop_session(session_id: int, db: Session = Depends(get_db)) -> MeetingSessionOut:
    session = db.get(WorkshopMeetingSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Sesi meeting tidak ditemukan.")
    return map_session(session, db)


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


def resolve_kpi_request(db: Session, line_id: int | None, line_code: str | None, from_date: date, to_date: date):
    today = datetime.now(ZoneInfo("Asia/Jakarta")).date()
    if from_date > to_date:
        raise HTTPException(status_code=400, detail="Tanggal awal tidak boleh melewati tanggal akhir.")
    if to_date > today:
        raise HTTPException(status_code=400, detail="Tanggal akhir tidak boleh di masa depan.")
    if (to_date - from_date).days > 365:
        raise HTTPException(status_code=400, detail="Rentang maksimal 366 hari.")
    if line_id is None and not line_code:
        raise HTTPException(status_code=400, detail="Isi line_id atau line_code.")
    line = db.get(Line, line_id) if line_id is not None else db.scalar(select(Line).where(Line.code == line_code))
    if line is None:
        raise HTTPException(status_code=404, detail="Lini tidak ditemukan.")
    return line, today


@router.get("/standup-kpi", response_model=StandupKpiOut)
def standup_kpi_endpoint(
    line_id: int | None = None,
    line_code: str | None = None,
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    shift: str = "Shift 1",
    db: Session = Depends(get_db),
) -> StandupKpiOut:
    line, today = resolve_kpi_request(db, line_id, line_code, from_date, to_date)
    days = standup_kpi.line_standup(db, line.id, from_date, to_date, shift, today)
    return StandupKpiOut(
        max_attendance=standup_kpi.MAX_ATTENDANCE,
        max_content=standup_kpi.MAX_CONTENT,
        max_close_loop=standup_kpi.MAX_CLOSE_LOOP,
        max_total=standup_kpi.MAX_TOTAL,
        days=days,
        average=standup_kpi.average_scores(days),
    )


@router.get("/sqdip-kpi", response_model=SqdipKpiOut)
def sqdip_kpi_endpoint(
    line_id: int | None = None,
    line_code: str | None = None,
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    db: Session = Depends(get_db),
) -> SqdipKpiOut:
    line, today = resolve_kpi_request(db, line_id, line_code, from_date, to_date)
    days = sqdip_service.line_sqdip(db, line.code, from_date, to_date, today)
    return SqdipKpiOut(
        max_per_dimension=sqdip_service.POINTS_PER_DIMENSION,
        max_total=sqdip_service.MAX_TOTAL,
        days=days,
        average=sqdip_service.average_scores(days),
    )


@router.get("/papercard-kpi", response_model=PapercardKpiOut)
def papercard_kpi(
    line_id: int | None = None,
    line_code: str | None = None,
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    shift: str = "Shift 1",
    db: Session = Depends(get_db),
) -> PapercardKpiOut:
    line, today = resolve_kpi_request(db, line_id, line_code, from_date, to_date)
    days = line_kpi(db, line.id, from_date, to_date, shift, today)
    return PapercardKpiOut(
        max_on_time=MAX_ON_TIME,
        max_registered=MAX_REGISTERED,
        max_closed=MAX_CLOSED,
        max_total=MAX_TOTAL,
        days=days,
        average=average_scores(days),
    )


@router.get("/scorecard/leaders", response_model=list[ScorecardLeaderOut])
def scorecard_leaders(db: Session = Depends(get_db)) -> list[ScorecardLeaderOut]:
    rows = db.execute(
        select(Line, Workshop, Employee, DmGroup)
        .join(LeaderAssignment, LeaderAssignment.line_id == Line.id)
        .join(Workshop, Workshop.id == Line.workshop_id)
        .join(Employee, Employee.id == LeaderAssignment.employee_id)
        .outerjoin(DmGroup, DmGroup.id == Line.dm_group_id)
        .where(
            LeaderAssignment.kind == "line_leader",
            LeaderAssignment.ended_at.is_(None),
            Employee.is_active.is_(True),
        )
        .order_by(Workshop.name, DmGroup.name, Line.code)
    ).all()
    return [
        ScorecardLeaderOut(
            line_id=line.id,
            line_code=line.code,
            line_name=line.name,
            model=line.model,
            workshop_id=workshop.id,
            workshop_name=workshop.name,
            dm_group_id=group.id if group else None,
            dm_name=group.name if group else None,
            leader_id=employee.id,
            leader_name=employee.name,
            leader_photo_url=employee.photo_url,
        )
        for line, workshop, employee, group in rows
    ]
