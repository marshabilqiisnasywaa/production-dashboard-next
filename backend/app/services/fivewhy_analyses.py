from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Principal
from app.models import Line
from app.models.fivewhy import FiveWhyAnalysis
from app.services.fivewhy import leader_line_ids
from app.services.team_slots import team_department

JAKARTA = ZoneInfo("Asia/Jakarta")
MAJOR_DOWNTIME_MINUTES = 30
ROOT_CAUSE_PREVIEW = 160
BRIEF_PREVIEW = 200
COUNTERMEASURE_PREVIEW = 5
SOLUTION_STAGES = ("rencana", "dikerjakan", "dipantau", "standar")
STANDARD_DEPARTMENTS = ("PROD", "ME", "PE", "QC")


def can_edit(principal: Principal, row: FiveWhyAnalysis, leader_lines: set[int] | None = None) -> bool:
    if principal.is_admin:
        return True
    employee = principal.employee
    if employee is None or principal.role not in ("leader", "member"):
        return False
    if row.created_by == employee.id:
        return True
    return principal.role == "leader" and row.line_id is not None and row.line_id in (leader_lines or set())


def editor_lines(db: Session, principal: Principal) -> set[int]:
    if principal.is_admin:
        return {line.id for line in db.scalars(select(Line))}
    if principal.employee is None or principal.role != "leader":
        return set()
    return leader_line_ids(db, principal.employee.id)


def next_nomor(db: Session, now: datetime) -> str:
    prefix = f"5W-{now.astimezone(JAKARTA).strftime('%y%m%d')}-"
    last = 0
    for nomor in db.scalars(select(FiveWhyAnalysis.nomor).where(FiveWhyAnalysis.nomor.like(f"{prefix}%"))):
        tail = nomor[len(prefix):]
        if tail.isdigit():
            last = max(last, int(tail))
    return f"{prefix}{last + 1:02d}"


def empty_data(line_code: str, pengusul: str, now: datetime, analysis_id: str) -> dict:
    return {
        "abnormal": {
            "label": "", "line": line_code, "pengusul": pengusul, "jenis": "",
            "categoryCodes": [], "categoryLabels": [], "respondedAt": "",
            "factors": {"man": "", "machine": "", "material": "", "method": "", "measurement": "", "environment": ""},
            "sumberAbnormal": [], "sumberLainnya": "", "tingkatPengaruh": [], "pengaruhLainnya": "",
            "summary": {
                "when": now.astimezone(JAKARTA).strftime("%Y-%m-%dT%H:%M"), "where": line_code,
                "what": "", "who": "", "how": "", "howMuch": "", "downtime": "", "shortTermSolution": "",
            },
        },
        "whys": [
            {"id": f"{analysis_id}-why-{level}", "level": level, "statement": "", "verification": "unverified", "evidence": [], "branches": []}
            for level in range(1, 6)
        ],
        "solutions": [],
    }

def can_flag_standard(principal: Principal) -> bool:
    employee = principal.employee
    return (
        employee is not None
        and principal.role == "supervisor"
        and team_department(employee.dept) == "PROD"
    )


def standard_out(data: dict) -> dict:
    """Flagged solutions only: {solution id: flag}. Stale ids (solution deleted) are dropped."""
    ids = {str(item.get("id")): item for item in section(data, "solutions", list) if isinstance(item, dict)}
    out = {}
    for solution_id, raw in section(section(data, "standard", dict), "items", dict).items():
        if solution_id in ids and isinstance(raw, dict) and raw.get("flagged"):
            out[solution_id] = {
                "flagged": True,
                "solutionText": brief(ids[solution_id].get("text"), 300),
                "department": str(raw.get("department") or ""),
                "note": str(raw.get("note") or ""),
                "flaggedBy": str(raw.get("flaggedBy") or ""),
                "flaggedAt": str(raw.get("flaggedAt") or ""),
                "applied": bool(raw.get("applied")),
                "appliedBy": str(raw.get("appliedBy") or ""),
                "appliedAt": str(raw.get("appliedAt") or ""),
            }
    return out

def section(data: dict, key: str, kind: type):
    value = data.get(key) if isinstance(data, dict) else None
    return value if isinstance(value, kind) else kind()


def is_major(abnormal: dict) -> bool:
    summary = section(abnormal, "summary", dict)
    try:
        return float(str(summary.get("downtime", "")).strip()) >= MAJOR_DOWNTIME_MINUTES
    except ValueError:
        return False


def root_cause_text(whys: list) -> str:
    for why in whys:
        if isinstance(why, dict) and why.get("verification") == "root":
            text = " ".join(str(why.get("statement", "")).split())
            return text[:ROOT_CAUSE_PREVIEW]
    return ""


def brief(value, limit: int = BRIEF_PREVIEW) -> str:
    return " ".join(str(value or "").split())[:limit]


def incident_brief(abnormal: dict) -> dict:
    summary = section(abnormal, "summary", dict)
    return {
        "occurredAt": brief(summary.get("when"), 40),
        "what": brief(summary.get("what")),
        "who": brief(summary.get("who"), 120),
        "how": brief(summary.get("how"), 300),
        "howMuch": brief(summary.get("howMuch"), 120),
        "where": brief(summary.get("where"), 100),
        "downtime": brief(summary.get("downtime"), 10),
        "shortTerm": brief(summary.get("shortTermSolution")),
    }


def countermeasures(solutions: list) -> list:
    return [
        {
            "text": brief(solution.get("text")),
            "pic": brief(solution.get("pic"), 100),
            "deadline": brief(solution.get("deadline"), 10),
            "type": solution.get("type") if solution.get("type") in ("short", "long") else "short",
            "done": solution.get("status") == "standar",
        }
        for solution in solutions[:COUNTERMEASURE_PREVIEW]
        if isinstance(solution, dict)
    ]


def solution_counts(solutions: list) -> dict:
    counts = {stage: 0 for stage in SOLUTION_STAGES}
    total = 0
    for solution in solutions:
        if isinstance(solution, dict):
            total += 1
            if solution.get("status") in counts:
                counts[solution["status"]] += 1
    return {**counts, "total": total}


def require_photos_owned(found: set[str], wanted: set[str]) -> None:
    missing = wanted - found
    if missing:
        raise HTTPException(422, "Ada foto yang tidak ditemukan pada analisis ini. Unggah ulang fotonya.")


def settle_category(db, row, abnormal: dict) -> tuple[list[str], list[str]]:
    from app.services.abnormal_categories import resolve_category_path

    codes = list(abnormal.get("categoryCodes") or [])
    while codes and not codes[-1]:
        codes.pop()
    if not codes:
        return [], []
    before = section(row.data, "abnormal", dict)
    stored_codes = section(before, "categoryCodes", list)
    stored_labels = section(before, "categoryLabels", list)
    if codes == stored_codes and len(stored_labels) == len(codes):
        return codes, stored_labels
    return resolve_category_path(db, codes)
