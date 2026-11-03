from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import DmMeetingAttendance, DmMeetingSession, DmMeetingSummary
from app.services.joint_meetings import build_roster
from app.services.papercard_kpi import to_jakarta, working_days

SESSION_NUMBERS = (1, 2)
ATTENDANCE_PER_MEETING = 5
CONTENT_PER_MEETING = 10
MAX_ATTENDANCE = ATTENDANCE_PER_MEETING * len(SESSION_NUMBERS)
MAX_CONTENT = CONTENT_PER_MEETING * len(SESSION_NUMBERS)
MAX_CLOSE_LOOP = 10
MAX_TOTAL = MAX_ATTENDANCE + MAX_CONTENT + MAX_CLOSE_LOOP


@dataclass
class MeetingCheck:
    number: int
    held: bool
    required: int
    present: int
    complete: bool


@dataclass
class StandupDayScore:
    date: date
    final: bool
    attendance: int
    content: int
    close_loop: int
    problems: int
    problems_closed: int
    meetings: list[MeetingCheck]

    @property
    def total(self) -> int:
        return self.attendance + self.content + self.close_loop


def check_meeting(number: int, held: bool, required_ids: set[int], present_ids: set[int]) -> MeetingCheck:
    present = len(required_ids & present_ids)
    complete = held and bool(required_ids) and present == len(required_ids)
    return MeetingCheck(number, held, len(required_ids), present, complete)


def score_day(day: date, meetings: list[MeetingCheck], problems: int, problems_closed: int, today: date) -> StandupDayScore:
    complete = sum(1 for m in meetings if m.complete)
    return StandupDayScore(
        date=day,
        final=day < today,
        attendance=complete * ATTENDANCE_PER_MEETING,
        content=complete * CONTENT_PER_MEETING,
        close_loop=MAX_CLOSE_LOOP if problems > 0 and problems_closed == problems else 0,
        problems=problems,
        problems_closed=problems_closed,
        meetings=meetings,
    )


def line_standup(db: Session, line_id: int, start: date, end: date, shift: str, today: date) -> list[StandupDayScore]:
    sessions = list(db.scalars(
        select(DmMeetingSession).where(
            DmMeetingSession.line_id == line_id,
            DmMeetingSession.shift == shift,
            DmMeetingSession.date >= start,
            DmMeetingSession.date <= end,
            DmMeetingSession.session_number.in_(SESSION_NUMBERS),
            DmMeetingSession.status == "completed",
        )
    ))
    by_key = {(s.date, s.session_number): s for s in sessions}

    present: dict[int, set[int]] = {}
    if sessions:
        for attendance in db.scalars(
            select(DmMeetingAttendance).where(
                DmMeetingAttendance.session_id.in_([s.id for s in sessions]),
                DmMeetingAttendance.status == "present",
            )
        ):
            present.setdefault(attendance.session_id, set()).add(attendance.employee_id)

    default_roster = {item["employee_id"] for item in build_roster(db, [line_id])}

    problems: dict[date, list[DmMeetingSummary]] = {}
    for summary, session_date in db.execute(
        select(DmMeetingSummary, DmMeetingSession.date)
        .join(DmMeetingSession, DmMeetingSession.id == DmMeetingSummary.session_id)
        .where(
            DmMeetingSummary.line_id == line_id,
            DmMeetingSession.shift == shift,
            DmMeetingSession.date >= start,
            DmMeetingSession.date <= end,
        )
    ):
        problems.setdefault(session_date, []).append(summary)

    days = []
    for day in working_days(db, start, end):
        meetings = []
        for number in SESSION_NUMBERS:
            session = by_key.get((day, number))
            if session is None:
                meetings.append(check_meeting(number, False, default_roster, set()))
                continue
            required = {item["employee_id"] for item in session.roster} if session.roster is not None else default_roster
            meetings.append(check_meeting(number, True, required, present.get(session.id, set())))
        day_problems = problems.get(day, [])
        closed = sum(
            1 for p in day_problems
            if p.status == "resolved" and p.resolved_at is not None and to_jakarta(p.resolved_at).date() == day
        )
        days.append(score_day(day, meetings, len(day_problems), closed, today))
    return days


def average_scores(days: list[StandupDayScore]) -> dict | None:
    final = [d for d in days if d.final]
    if not final:
        return None
    n = len(final)
    return {
        "days": n,
        "attendance": round(sum(d.attendance for d in final) / n, 2),
        "content": round(sum(d.content for d in final) / n, 2),
        "close_loop": round(sum(d.close_loop for d in final) / n, 2),
        "total": round(sum(d.total for d in final) / n, 2),
    }
