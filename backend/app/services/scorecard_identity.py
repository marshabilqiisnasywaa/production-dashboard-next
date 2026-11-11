from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Employee, LeaderAssignment

JAKARTA = ZoneInfo("Asia/Jakarta")


def local_date(value: datetime) -> date:
    return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).astimezone(JAKARTA).date()


def normalize(value: str) -> str:
    return " ".join(value.split()).casefold()


def assignment_on(assignments: list[LeaderAssignment], day: date) -> LeaderAssignment | None:
    day_start = datetime.combine(day, time.min, tzinfo=JAKARTA)
    eligible = [a for a in assignments if local_date(a.started_at) <= day and (
        a.ended_at is None or (a.ended_at if a.ended_at.tzinfo else a.ended_at.replace(tzinfo=timezone.utc)) > day_start
    )]
    return max(eligible, key=lambda a: (
        a.started_at.astimezone(timezone.utc) if a.started_at.tzinfo else a.started_at.replace(tzinfo=timezone.utc), a.id,
    )) if eligible else None


class ImportLeaderResolver:
    def __init__(self, db: Session):
        self.names: dict[str, set[int]] = {}
        self.assignments: dict[int, list[LeaderAssignment]] = {}
        for employee in db.scalars(select(Employee)):
            self.names.setdefault(normalize(employee.name), set()).add(employee.id)
        for assignment in db.scalars(select(LeaderAssignment).where(LeaderAssignment.kind == "line_leader")):
            self.assignments.setdefault(assignment.line_id, []).append(assignment)

    def resolve(self, name: str, line_id: int | None, day: date) -> int | None:
        matches = self.names.get(normalize(name), set())
        owner = assignment_on(self.assignments.get(line_id, []), day)
        if owner and (owner.employee_id in matches or normalize(owner.leader_name_snapshot or "") == normalize(name)):
            return owner.employee_id
        return next(iter(matches)) if len(matches) == 1 else None
