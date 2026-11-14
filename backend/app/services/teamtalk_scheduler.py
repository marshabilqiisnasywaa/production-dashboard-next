import asyncio
import logging
from datetime import date, datetime, time, timedelta
from typing import Set

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.services.summary_assignments import summary_metadata, display_lines, display_pics
from app.models import (
    DmMeetingSchedule,
    DmMeetingSession,
    DmMeetingSummary,
    DmNotificationSetting,
    Line,
    PapercardSubmission,
    PapercardTemplate,
    Workshop,
    WorkshopMeetingSession,
    WorkshopMeetingSetting,
)
from app.services.holidays import is_holiday
from app.services.meeting_schedule import Slot, parse_days, slots_for_day
from app.services.teamtalk import (
    notify_escalated_problems,
    notify_meeting_reminder,
    notify_papercard_deadline,
    notify_papercard_reminder,
    notify_workshop_meeting_reminder,
)

logger = logging.getLogger("teamtalk_scheduler")

# Cache memori agar tidak mengirim pesan ganda untuk event yang sama pada hari yang sama
_sent_events_cache: Set[str] = set()
_last_cache_cleanup_date: date | None = None

ESCALATION_WORK_START = time(8, 0)
ESCALATION_WORK_END = time(17, 0)
ESCALATION_BATCH_SIZE = 10
MEETING_START_GRACE_MINUTES = 5
PAPERCARD_DEADLINE_GRACE_MINUTES = 5


def _cleanup_old_cache(today: date):
    global _last_cache_cleanup_date, _sent_events_cache
    if _last_cache_cleanup_date != today:
        _sent_events_cache.clear()
        _last_cache_cleanup_date = today


def get_line_setting(db: Session, line_id: int) -> DmNotificationSetting | None:
    setting = db.scalar(select(DmNotificationSetting).where(DmNotificationSetting.line_id == line_id))
    if not setting:
        setting = db.scalar(select(DmNotificationSetting).order_by(DmNotificationSetting.updated_at.desc()))
    return setting


async def check_meeting_reminders(db: Session, now: datetime):
    today = now.date()
    lines = db.scalars(select(Line).where(Line.status != "stopped")).all()
    due_slots: list[dict] = []
    due_keys: list[str] = []
    start_slots: list[dict] = []
    start_keys: list[str] = []

    for line in lines:
        setting = get_line_setting(db, line.id)
        meeting_enabled = setting.meeting_enabled if setting else True
        reminder_mins = setting.meeting_reminder_minutes if setting else 15

        if not meeting_enabled:
            continue

        if is_holiday(db, today):
            held = db.scalars(select(DmMeetingSession).where(
                DmMeetingSession.line_id == line.id,
                DmMeetingSession.date == today,
                DmMeetingSession.status == "pending",
            )).all()
            slots = [Slot(s.session_number, s.label or "Sesi", s.scheduled_time) for s in held]
        else:
            slots = slots_for_day(db, line.id, today)
        for slot in slots:
            try:
                # slot.time berbentuk "HH:MM"
                sh, sm = [int(p) for p in slot.time.split(":")]
                target_dt = datetime(now.year, now.month, now.day, sh, sm)
                diff_sec = (target_dt - now).total_seconds()
                diff_min = diff_sec / 60.0

                entry = {
                    "line_code": line.code,
                    "session_label": slot.label,
                    "scheduled_time": slot.time,
                    "minutes_left": max(1, int(diff_min)),
                }

                # Pengingat pertama: sesuai menit yang diatur admin sebelum meeting
                if reminder_mins > 0 and 0 < diff_min <= reminder_mins:
                    event_key = f"meeting_{line.id}_{slot.label}_{today}"
                    if event_key not in _sent_events_cache:
                        due_slots.append(entry)
                        due_keys.append(event_key)
                # Pengingat kedua: tepat saat jam meeting, kecuali meeting sudah dimulai
                elif -MEETING_START_GRACE_MINUTES < diff_min <= 0:
                    event_key = f"meeting_start_{line.id}_{slot.label}_{today}"
                    if event_key not in _sent_events_cache:
                        already_started = db.scalar(select(DmMeetingSession.id).where(
                            DmMeetingSession.line_id == line.id,
                            DmMeetingSession.date == today,
                            DmMeetingSession.session_number == slot.number,
                            DmMeetingSession.status != "pending",
                        ))
                        if already_started is None:
                            start_slots.append(entry)
                            start_keys.append(event_key)
            except Exception as e:
                logger.error("Error saat evaluasi slot meeting %s: %s", slot, e)

    if due_slots:
        logger.info("Mengirim pengingat meeting untuk %d line", len(due_slots))
        if await notify_meeting_reminder(due_slots):
            _sent_events_cache.update(due_keys)
    if start_slots:
        logger.info("Mengirim pengingat jam meeting untuk %d line", len(start_slots))
        if await notify_meeting_reminder(start_slots, started=True):
            _sent_events_cache.update(start_keys)


async def check_workshop_meeting_reminders(db: Session, now: datetime):
    today = now.date()
    for setting in db.scalars(select(WorkshopMeetingSetting)):
        if not setting.is_active or not setting.reminder_enabled:
            continue
        held_today = db.scalar(select(WorkshopMeetingSession.id).where(
            WorkshopMeetingSession.workshop_id == setting.workshop_id,
            WorkshopMeetingSession.date == today,
        ))
        if is_holiday(db, today):
            if held_today is None:
                continue
        elif now.isoweekday() not in parse_days(setting.days):
            continue
        try:
            sh, sm = [int(p) for p in setting.time.split(":")]
            diff_min = (datetime(now.year, now.month, now.day, sh, sm) - now).total_seconds() / 60.0
            if not 0 <= diff_min <= setting.reminder_minutes:
                continue
            event_key = f"workshop_meeting_{setting.workshop_id}_{today}"
            if event_key in _sent_events_cache:
                continue
            session = db.scalar(select(WorkshopMeetingSession).where(
                WorkshopMeetingSession.workshop_id == setting.workshop_id,
                WorkshopMeetingSession.date == today,
            ))
            if session is not None and session.status != "pending":
                continue
            workshop = db.get(Workshop, setting.workshop_id)
            logger.info("Mengirim pengingat workshop meeting: %s", workshop.name if workshop else setting.workshop_id)
            sent = await notify_workshop_meeting_reminder(
                workshop_name=workshop.name if workshop else "-",
                scheduled_time=setting.time,
                minutes_left=max(1, int(diff_min)),
            )
            if sent:
                _sent_events_cache.add(event_key)
        except Exception as e:
            logger.error("Error saat evaluasi workshop meeting %s: %s", setting.workshop_id, e)


async def check_papercard_reminders(db: Session, now: datetime):
    today = now.date()
    lines = db.scalars(select(Line).where(Line.status != "stopped")).all()
    due_entries: list[dict] = []
    due_keys: list[str] = []
    missed_entries: list[dict] = []
    missed_keys: list[str] = []

    for line in lines:
        setting = get_line_setting(db, line.id)
        papercard_enabled = setting.papercard_enabled if setting else True
        reminder_mins = setting.papercard_reminder_minutes if setting else 15

        if not papercard_enabled:
            continue

        templates = db.scalars(select(PapercardTemplate).where(PapercardTemplate.line_id == line.id)).all()
        for tpl in templates:
            try:
                window_start = tpl.window_start or "07:30"
                window_end = tpl.window_end or "08:15"
                sh, sm = [int(p) for p in window_start.split(":")]
                eh, em = [int(p) for p in window_end.split(":")]
                start_min = (datetime(now.year, now.month, now.day, sh, sm) - now).total_seconds() / 60.0
                end_min = (datetime(now.year, now.month, now.day, eh, em) - now).total_seconds() / 60.0

                in_reminder = reminder_mins > 0 and 0 < start_min <= reminder_mins
                in_deadline = -PAPERCARD_DEADLINE_GRACE_MINUTES < end_min <= 0
                if in_reminder or in_deadline:
                    event_key = (
                        f"papercard_{line.id}_{tpl.department}_{today}"
                        if in_reminder
                        else f"papercard_end_{line.id}_{tpl.department}_{today}"
                    )
                    if event_key not in _sent_events_cache:
                        has_submission = db.scalar(
                            select(PapercardSubmission.id).where(
                                PapercardSubmission.line_id == line.id,
                                PapercardSubmission.department == tpl.department,
                                PapercardSubmission.date == today,
                            )
                        )
                        if not has_submission:
                            entry = {
                                "line_code": line.code,
                                "department": tpl.department,
                                "window_start": window_start,
                                "window_end": window_end,
                                "minutes_left": max(1, int(start_min)),
                            }
                            if in_reminder:
                                due_entries.append(entry)
                                due_keys.append(event_key)
                            else:
                                missed_entries.append(entry)
                                missed_keys.append(event_key)
            except Exception as e:
                logger.error("Error evaluasi papercard template %s: %s", tpl.id, e)

    if due_entries:
        logger.info("Mengirim pengingat papercard untuk %d line-departemen", len(due_entries))
        if await notify_papercard_reminder(due_entries):
            _sent_events_cache.update(due_keys)
    if missed_entries:
        logger.info("Mengirim pemberitahuan papercard belum submit untuk %d line-departemen", len(missed_entries))
        if await notify_papercard_deadline(missed_entries):
            _sent_events_cache.update(missed_keys)


async def check_escalated_reminders(db: Session, now: datetime):
    today = now.date()
    if now.isoweekday() > 5 or is_holiday(db, today):
        return
    if not ESCALATION_WORK_START <= now.time() < ESCALATION_WORK_END:
        return

    now_iso = now.strftime("%Y-%m-%dT%H:%M")
    stmt = (
        select(DmMeetingSummary)
        .where(
            DmMeetingSummary.status != "resolved",
            DmMeetingSummary.due_date.isnot(None),
            DmMeetingSummary.due_date < now_iso,
            or_(
                DmMeetingSummary.last_escalated_on.is_(None),
                DmMeetingSummary.last_escalated_on < today,
            ),
        )
        .order_by(DmMeetingSummary.due_date, DmMeetingSummary.id)
    )
    overdue_summaries = db.scalars(stmt).all()

    for start in range(0, len(overdue_summaries), ESCALATION_BATCH_SIZE):
        batch = overdue_summaries[start:start + ESCALATION_BATCH_SIZE]
        logger.info("Mengirim pengingat eskalasi untuk %d masalah overdue ke TeamTalk", len(batch))
        items = [
            {
                "line_code": display_lines(sm) or "-",
                "problem": sm.problem,
                "pic_name": display_pics(sm) or "-",
                "pics": summary_metadata(sm)["pics"],
                "pic_id": sm.pic_id,
                "due_date": sm.due_date,
            }
            for sm in batch
        ]
        if not await notify_escalated_problems(items):
            break
        for sm in batch:
            sm.last_escalated_on = today
        db.commit()


async def run_teamtalk_scheduler():
    """
    Background worker yang berjalan terus bersama uvicorn/FastAPI.
    Mengevaluasi pengingat setiap 60 detik.
    """
    logger.info("TeamTalk Notification Scheduler dimulai.")
    # Tunggu sebentar saat startup agar server siap
    await asyncio.sleep(5)

    while True:
        try:
            now = datetime.now()
            _cleanup_old_cache(now.date())

            with SessionLocal() as db:
                await check_meeting_reminders(db, now)
                await check_workshop_meeting_reminders(db, now)
                await check_papercard_reminders(db, now)
                await check_escalated_reminders(db, now)

        except Exception as exc:
            logger.error("Error pada TeamTalk scheduler loop: %s", exc)

        # Cek ulang setiap 60 detik
        await asyncio.sleep(60)
