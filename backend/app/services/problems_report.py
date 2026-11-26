from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    AbnormalCategory,
    DmMeetingSession,
    DmMeetingSummary,
    Line,
    PapercardSubmission,
    PapercardTemplate,
    WorkshopMeetingSession,
    WorkshopMeetingSummary,
)
from app.schemas import (
    PublicAbnormalCategoryOut,
    PublicMeetingProblemOut,
    PublicPapercardProblemOut,
    PublicProblemsReportOut,
)
from app.services.summary_assignments import display_lines, summary_metadata


def _index_template_items(template_data: dict[str, Any] | None) -> dict[str, tuple[str, str]]:
    """Map item id -> (category_name, item_title) from a papercard template JSON."""
    indexed: dict[str, tuple[str, str]] = {}
    if not isinstance(template_data, dict):
        return indexed
    categories = template_data.get("categories")
    if not isinstance(categories, list):
        return indexed
    for cat in categories:
        if not isinstance(cat, dict):
            continue
        cat_name = str(cat.get("name") or cat.get("title") or "").strip()
        # Support direct items[] and nested groups[].items[]
        item_lists: list[Any] = []
        if isinstance(cat.get("items"), list):
            item_lists.append(cat["items"])
        if isinstance(cat.get("groups"), list):
            for group in cat["groups"]:
                if isinstance(group, dict) and isinstance(group.get("items"), list):
                    item_lists.append(group["items"])
        for items in item_lists:
            for item in items:
                if not isinstance(item, dict):
                    continue
                item_id = str(item.get("id") or "").strip()
                item_title = str(item.get("title") or item.get("label") or item.get("name") or "").strip()
                if item_id:
                    indexed[item_id] = (cat_name, item_title)
    return indexed


def _clean_text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def build_problems_report(db: Session, start: date, end: date) -> PublicProblemsReportOut:
    # 1. Active 3-code abnormal categories catalog (Code 1 / Code 2 / Code 3)
    category_rows = list(
        db.scalars(
            select(AbnormalCategory)
            .where(AbnormalCategory.is_active.is_(True))
            .order_by(AbnormalCategory.level, AbnormalCategory.code)
        )
    )
    abnormal_categories = [
        PublicAbnormalCategoryOut(
            id=row.id,
            level=row.level,
            code=row.code,
            name=row.name,
            parent_id=row.parent_id,
        )
        for row in category_rows
    ]

    # 2. Papercard NG items within [start, end]
    submissions_stmt = (
        select(PapercardSubmission, Line.code)
        .outerjoin(Line, Line.id == PapercardSubmission.line_id)
        .where(
            PapercardSubmission.date >= start,
            PapercardSubmission.date <= end,
        )
        .order_by(PapercardSubmission.date.desc(), PapercardSubmission.id.desc())
    )
    submission_rows = list(db.execute(submissions_stmt).all())

    template_ids = {sub.template_id for sub, _ in submission_rows if sub.template_id is not None}
    template_items_by_id: dict[int, dict[str, tuple[str, str]]] = {}
    if template_ids:
        for tpl in db.scalars(select(PapercardTemplate).where(PapercardTemplate.id.in_(template_ids))):
            template_items_by_id[tpl.id] = _index_template_items(tpl.template_data)

    papercard_problems: list[PublicPapercardProblemOut] = []
    for sub, line_code in submission_rows:
        if not isinstance(sub.answers, list):
            continue
        tpl_index = template_items_by_id.get(sub.template_id, {}) if sub.template_id is not None else {}
        for answer in sub.answers:
            if not isinstance(answer, dict) or answer.get("status") != "NG":
                continue
            item_id = _clean_text(answer.get("itemId") or answer.get("id"))
            tpl_cat, tpl_title = tpl_index.get(item_id, ("", ""))
            category = _clean_text(answer.get("categoryName")) or tpl_cat or "Pemeriksaan"
            title = (
                _clean_text(answer.get("title"))
                or _clean_text(answer.get("itemTitle"))
                or tpl_title
                or item_id
                or "Temuan NG"
            )
            cause = _clean_text(answer.get("cause")) or None
            solution = _clean_text(answer.get("solution")) or None
            papercard_problems.append(
                PublicPapercardProblemOut(
                    date=sub.date,
                    line_code=line_code,
                    department=sub.department,
                    category=category,
                    title=title,
                    cause=cause,
                    solution=solution,
                )
            )

    # 3. DM Line & Workshop Meeting Problems within [start, end]
    dm_stmt = (
        select(DmMeetingSummary, DmMeetingSession)
        .join(DmMeetingSession, DmMeetingSession.id == DmMeetingSummary.session_id)
        .options(
            selectinload(DmMeetingSummary.affected_lines),
            selectinload(DmMeetingSummary.assigned_pics),
        )
        .where(
            DmMeetingSession.date >= start,
            DmMeetingSession.date <= end,
        )
        .order_by(DmMeetingSession.date.desc(), DmMeetingSummary.id.desc())
    )
    ws_stmt = (
        select(WorkshopMeetingSummary, WorkshopMeetingSession)
        .join(WorkshopMeetingSession, WorkshopMeetingSession.id == WorkshopMeetingSummary.session_id)
        .options(
            selectinload(WorkshopMeetingSummary.affected_lines),
            selectinload(WorkshopMeetingSummary.assigned_pics),
        )
        .where(
            WorkshopMeetingSession.date >= start,
            WorkshopMeetingSession.date <= end,
        )
        .order_by(WorkshopMeetingSession.date.desc(), WorkshopMeetingSummary.id.desc())
    )

    meeting_problems: list[PublicMeetingProblemOut] = []

    def append_summary(sm: DmMeetingSummary | WorkshopMeetingSummary, session: DmMeetingSession | WorkshopMeetingSession, prefix: str = "") -> None:
        meta = summary_metadata(sm)
        pic_names = [pic["name"] for pic in meta["pics"] if pic.get("name")]
        session_label = f"{prefix}{session.label}" if prefix else session.label
        meeting_problems.append(
            PublicMeetingProblemOut(
                date=session.date,
                session_label=session_label,
                line_code=display_lines(sm),
                problem=sm.problem,
                categories=list(sm.problem_categories) if sm.problem_categories else None,
                category_codes=list(sm.category_codes) if sm.category_codes else None,
                solution=sm.solution,
                pic_names=pic_names,
                due_date=sm.due_date,
                status=sm.status,
                occurred_at=sm.occurred_at,
                responded_at=sm.responded_at,
            )
        )

    for sm, session in db.execute(dm_stmt).all():
        append_summary(sm, session)

    for sm, session in db.execute(ws_stmt).all():
        append_summary(sm, session, prefix="Workshop · ")

    meeting_problems.sort(key=lambda item: (item.date, item.line_code or ""), reverse=True)

    return PublicProblemsReportOut(
        papercard=papercard_problems,
        meeting=meeting_problems,
        abnormal_categories=abnormal_categories,
    )
