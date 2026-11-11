from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Line, SqdipEntry
from app.services.scorecard_identity import ImportLeaderResolver

DIMENSIONS = ("Safety", "Quality", "Delivery", "Inventory", "Productivity")
POINTS_PER_DIMENSION = 6
MAX_TOTAL = POINTS_PER_DIMENSION * len(DIMENSIONS)


@dataclass
class SqdipCell:
    actual: float | None
    points: int


@dataclass
class SqdipRow:
    date: date
    line: str
    leader: str
    cells: list[SqdipCell]


@dataclass
class SqdipDayScore:
    date: date
    leader: str
    final: bool
    safety: int
    quality: int
    delivery: int
    inventory: int
    productivity: int
    actuals: list[float | None]

    @property
    def total(self) -> int:
        return self.safety + self.quality + self.delivery + self.inventory + self.productivity


def upsert_rows(db: Session, rows, file_name: str | None) -> tuple[int, int]:
    if not rows:
        return 0, 0
    first = min(row.date for row in rows)
    last = max(row.date for row in rows)
    existing = {
        (e.date, e.line_code, e.leader_name, e.dimension): e
        for e in db.scalars(select(SqdipEntry).where(SqdipEntry.date >= first, SqdipEntry.date <= last))
    }
    added = updated = 0
    resolver = ImportLeaderResolver(db)
    line_ids = dict(db.execute(select(Line.code, Line.id)).all())
    for row in rows:
        line = row.line.strip().upper()
        leader = row.leader.strip()
        leader_id = resolver.resolve(leader, line_ids.get(line), row.date)
        replaced = False
        for dimension, cell in zip(DIMENSIONS, row.cells):
            key = (row.date, line, leader, dimension)
            entry = existing.get(key)
            if entry is None:
                entry = SqdipEntry(
                    date=row.date, line_code=line, leader_name=leader, dimension=dimension,
                    actual=cell.actual, points=cell.points, source_file=file_name,
                )
                db.add(entry)
                existing[key] = entry
            else:
                replaced = True
                entry.actual = cell.actual
                entry.points = cell.points
                entry.source_file = file_name
            if entry.leader_employee_id is None or leader_id is not None:
                entry.leader_employee_id = leader_id
        if replaced:
            updated += 1
        else:
            added += 1
    db.commit()
    return added, updated


def list_rows(db: Session, start: date | None = None, end: date | None = None) -> list[SqdipRow]:
    stmt = select(SqdipEntry).order_by(SqdipEntry.date.desc(), SqdipEntry.line_code, SqdipEntry.leader_name)
    if start is not None:
        stmt = stmt.where(SqdipEntry.date >= start)
    if end is not None:
        stmt = stmt.where(SqdipEntry.date <= end)
    grouped: dict[tuple[date, str, str], dict[str, SqdipEntry]] = {}
    for entry in db.scalars(stmt):
        grouped.setdefault((entry.date, entry.line_code, entry.leader_name), {})[entry.dimension] = entry
    rows = []
    for (day, line, leader), by_dimension in grouped.items():
        cells = [
            SqdipCell(by_dimension[d].actual, by_dimension[d].points) if d in by_dimension else SqdipCell(None, 0)
            for d in DIMENSIONS
        ]
        rows.append(SqdipRow(day, line, leader, cells))
    return rows


def historical_lines(
    db: Session, known_codes: set[str], start: date | None = None, end: date | None = None
) -> list[tuple[str, str]]:
    stmt = select(SqdipEntry.line_code, SqdipEntry.leader_name).order_by(
        SqdipEntry.date.desc(), SqdipEntry.updated_at.desc()
    )
    if start is not None:
        stmt = stmt.where(SqdipEntry.date >= start)
    if end is not None:
        stmt = stmt.where(SqdipEntry.date <= end)
    latest: dict[str, str] = {}
    for code, leader in db.execute(stmt):
        if code.strip().upper() not in known_codes:
            latest.setdefault(code, leader)
    return sorted(latest.items())


def latest_import(db: Session) -> SqdipEntry | None:
    return db.scalar(select(SqdipEntry).order_by(SqdipEntry.updated_at.desc()).limit(1))


def line_sqdip(db: Session, line_code: str, start: date, end: date, today: date) -> list[SqdipDayScore]:
    entries = db.scalars(
        select(SqdipEntry).where(
            SqdipEntry.line_code == line_code,
            SqdipEntry.date >= start,
            SqdipEntry.date <= end,
        )
    )
    by_day: dict[date, dict[str, list[SqdipEntry]]] = {}
    for entry in entries:
        by_day.setdefault(entry.date, {}).setdefault(entry.leader_name, []).append(entry)

    days = []
    for day in sorted(by_day):
        leader, rows = max(by_day[day].items(), key=lambda item: max(e.updated_at for e in item[1]))
        points = {dimension: 0 for dimension in DIMENSIONS}
        actuals: dict[str, float | None] = {dimension: None for dimension in DIMENSIONS}
        for entry in rows:
            points[entry.dimension] = entry.points
            actuals[entry.dimension] = entry.actual
        days.append(SqdipDayScore(
            date=day, leader=leader, final=day < today,
            safety=points["Safety"], quality=points["Quality"], delivery=points["Delivery"],
            inventory=points["Inventory"], productivity=points["Productivity"],
            actuals=[actuals[dimension] for dimension in DIMENSIONS],
        ))
    return days


def average_scores(days: list[SqdipDayScore]) -> dict | None:
    final = [d for d in days if d.final]
    if not final:
        return None
    n = len(final)

    def avg(values) -> float:
        return round(sum(values) / n, 2)

    return {
        "days": n,
        "safety": avg(d.safety for d in final),
        "quality": avg(d.quality for d in final),
        "delivery": avg(d.delivery for d in final),
        "inventory": avg(d.inventory for d in final),
        "productivity": avg(d.productivity for d in final),
        "total": avg(d.total for d in final),
    }
