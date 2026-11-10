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
    HistoricalEntry,
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
from app.services import history_import
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


def check_kpi_range(from_date: date, to_date: date) -> date:
    today = datetime.now(ZoneInfo("Asia/Jakarta")).date()
    if from_date > to_date:
        raise HTTPException(status_code=400, detail="Tanggal awal tidak boleh melewati tanggal akhir.")
    if to_date > today:
        raise HTTPException(status_code=400, detail="Tanggal akhir tidak boleh di masa depan.")
    if (to_date - from_date).days > 365:
        raise HTTPException(status_code=400, detail="Rentang maksimal 366 hari.")
    return today


def resolve_kpi_request(db: Session, line_id: int | None, line_code: str | None, from_date: date, to_date: date):
    today = check_kpi_range(from_date, to_date)
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
    days, average = history_import.merge_kpi(db, line.id, from_date, to_date, shift, "standup_kpi", days, today)
    return StandupKpiOut(
        max_attendance=standup_kpi.MAX_ATTENDANCE,
        max_content=standup_kpi.MAX_CONTENT,
        max_close_loop=standup_kpi.MAX_CLOSE_LOOP,
        max_total=standup_kpi.MAX_TOTAL,
        days=days,
        average=average,
    )


@router.get("/sqdip-kpi", response_model=SqdipKpiOut)
def sqdip_kpi_endpoint(
    line_id: int | None = None,
    line_code: str | None = None,
    from_date: date = Query(alias="from"),
    to_date: date = Query(alias="to"),
    db: Session = Depends(get_db),
) -> SqdipKpiOut:
    today = check_kpi_range(from_date, to_date)
    if line_id is None and not line_code:
        raise HTTPException(status_code=400, detail="Isi line_id atau line_code.")
    line = db.get(Line, line_id) if line_id is not None else db.scalar(select(Line).where(Line.code == line_code))
    if line is None and line_id is not None:
        raise HTTPException(status_code=404, detail="Lini tidak ditemukan.")
    code = line.code if line is not None else line_code.strip().upper()
    days = sqdip_service.line_sqdip(db, code, from_date, to_date, today)
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
    days, average = history_import.merge_kpi(db, line.id, from_date, to_date, shift, "papercard_kpi", days, today)
    return PapercardKpiOut(
        max_on_time=MAX_ON_TIME,
        max_registered=MAX_REGISTERED,
        max_closed=MAX_CLOSED,
        max_total=MAX_TOTAL,
        days=days,
        average=average,
    )


@router.get("/scorecard/leaders", response_model=list[ScorecardLeaderOut])
def scorecard_leaders(
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
) -> list[ScorecardLeaderOut]:
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
    leaders = [
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
    history_query = select(HistoricalEntry, Line, Workshop, DmGroup).join(
        Line, Line.id == HistoricalEntry.line_id,
    ).join(Workshop, Workshop.id == Line.workshop_id).outerjoin(DmGroup, DmGroup.id == Line.dm_group_id).where(
        HistoricalEntry.kind.in_(("papercard_kpi", "standup_kpi")),
    )
    if from_date is not None:
        history_query = history_query.where(HistoricalEntry.date >= from_date)
    if to_date is not None:
        history_query = history_query.where(HistoricalEntry.date <= to_date)
    history_by_line = {}
    for entry, line, workshop, group in db.execute(history_query.order_by(HistoricalEntry.date)):
        item = history_by_line.setdefault(line.id, {"line": line, "workshop": workshop, "group": group, "names": set(), "dms": set(), "review": False})
        if "dm" in entry.data.get("mappingReviewFields", []) or (entry.data.get("mappingReview") and "mappingReviewFields" not in entry.data):
            item["review"] = True
        item["names"].add(entry.leader_name)
        if entry.source_dm:
            item["dms"].add(entry.source_dm)
    indexed = {leader.line_id: leader for leader in leaders}
    for line_id, item in history_by_line.items():
        line, workshop, group = item["line"], item["workshop"], item["group"]
        current = indexed.get(line_id)
        names = set(item["names"])
        if current and to_date is not None and to_date >= datetime.now(ZoneInfo("Asia/Jakarta")).date():
            names.add(current.leader_name)
        historical_name = " / ".join(sorted(names))
        dm_name = "Perlu verifikasi DM" if item["review"] else " / ".join(sorted(item["dms"])) or (group.name if group else None)
        if current:
            if current.leader_name != historical_name:
                current.leader_id = 0
                current.leader_photo_url = None
            current.leader_name = historical_name
            current.dm_name = dm_name
        else:
            leaders.append(ScorecardLeaderOut(
                line_id=line.id, line_code=line.code, line_name=line.name, model=line.model,
                workshop_id=workshop.id, workshop_name=workshop.name,
                dm_group_id=group.id if group else None, dm_name=dm_name,
                leader_id=0, leader_name=historical_name, leader_photo_url=None,
            ))
    known = {leader.line_code.strip().upper() for leader in leaders}
    for index, (code, leader_name) in enumerate(sqdip_service.historical_lines(db, known, from_date, to_date)):
        leaders.append(ScorecardLeaderOut(
            line_id=-(index + 1),
            line_code=code,
            line_name=code,
            model=None,
            workshop_id=0,
            workshop_name="Tanpa Workshop",
            dm_group_id=None,
            dm_name=None,
            leader_id=0,
            leader_name=leader_name,
            leader_photo_url=None,
            historical=True,
        ))
    return leaders


@router.get("/historical-attendance")
def historical_attendance(
    from_date: date = Query(alias="from"), to_date: date = Query(alias="to"),
    db: Session = Depends(get_db),
):
    check_kpi_range(from_date, to_date)
    rows = db.execute(select(HistoricalEntry, Line.code).join(Line, Line.id == HistoricalEntry.line_id).where(
        HistoricalEntry.kind == "attendance", HistoricalEntry.date >= from_date,
        HistoricalEntry.date <= to_date,
    ).order_by(HistoricalEntry.date.desc(), Line.code, HistoricalEntry.shift))
    return [{
        "id": entry.id, "kind": entry.kind, "date": entry.date, "line": code,
        "leader": entry.leader_name, "dm": entry.source_dm, "shift": entry.shift,
        "sourceSheet": entry.source_sheet, "sourceRow": entry.source_row, "data": entry.data,
    } for entry, code in rows]
