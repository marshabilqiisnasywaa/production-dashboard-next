from collections import defaultdict

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload

from app.models import DmMeetingAttendance, DmMeetingSession, DmMeetingSummary, PapercardSubmission, PapercardTemplate
from app.services.joint_meetings import build_roster
from app.services.papercard_kpi import DEPARTMENTS, working_days
from app.services.problem_access import line_filter
from app.services.representatives import REPRESENTED_PREFIX
from app.services.standup_kpi import SESSION_NUMBERS


def load_scorecard_data(db, line_ids, start, end, shift):
    workdays = list(working_days(db, start, end))
    templates = defaultdict(dict)
    for template in db.scalars(select(PapercardTemplate).where(
        PapercardTemplate.line_id.in_(line_ids), PapercardTemplate.department.in_(DEPARTMENTS),
    )):
        templates[template.line_id][template.department] = template
    submissions = defaultdict(list)
    for submission in db.scalars(select(PapercardSubmission).where(
        PapercardSubmission.line_id.in_(line_ids), PapercardSubmission.shift == shift,
        PapercardSubmission.date.between(start, end), PapercardSubmission.department.in_(DEPARTMENTS),
    )):
        if submission.department in templates[submission.line_id]:
            submissions[submission.line_id].append(submission)

    sessions = defaultdict(list)
    session_ids = []
    for session in db.scalars(select(DmMeetingSession).where(
        DmMeetingSession.line_id.in_(line_ids), DmMeetingSession.shift == shift,
        DmMeetingSession.date.between(start, end), DmMeetingSession.session_number.in_(SESSION_NUMBERS),
        DmMeetingSession.status.in_(("pending", "in_progress", "completed")),
    )):
        sessions[session.line_id].append(session)
        session_ids.append(session.id)
    present = defaultdict(set)
    if session_ids:
        for attendance in db.scalars(select(DmMeetingAttendance).where(
            DmMeetingAttendance.session_id.in_(session_ids),
            or_(DmMeetingAttendance.status == "present", and_(
                DmMeetingAttendance.status == "absent",
                DmMeetingAttendance.notes.like(REPRESENTED_PREFIX + "%"),
            )),
        )):
            present[attendance.session_id].add(attendance.employee_id)
    rosters = defaultdict(set)
    for member in build_roster(db, line_ids):
        for line_id in member["line_ids"]:
            rosters[line_id].add(member["employee_id"])
    problems = defaultdict(lambda: defaultdict(list))
    for summary, session_date in db.execute(
        select(DmMeetingSummary, DmMeetingSession.date)
        .join(DmMeetingSession, DmMeetingSession.id == DmMeetingSummary.session_id)
        .options(selectinload(DmMeetingSummary.affected_lines))
        .where(line_filter(DmMeetingSummary, line_ids), DmMeetingSession.shift == shift, DmMeetingSession.date.between(start, end))
    ):
        affected = {item.line_id for item in summary.affected_lines} if summary.affected_lines else {summary.line_id}
        for line_id in affected:
            if line_id in line_ids:
                problems[line_id][session_date].append(summary)
    return (
        {line_id: (templates[line_id], submissions[line_id], workdays) for line_id in line_ids},
        {line_id: (sessions[line_id], present, rosters[line_id], problems[line_id], workdays) for line_id in line_ids},
    )
