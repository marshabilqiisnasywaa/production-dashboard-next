import asyncio
import logging
from datetime import date, datetime, timedelta
from typing import Set

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import DmMeetingSchedule, DmMeetingSummary, DmNotificationSetting, Line, PapercardSubmission, PapercardTemplate
from app.services.meeting_schedule import slots_for_day
from app.services.teamtalk import notify_escalated_problems, notify_meeting_reminder, notify_papercard_reminder

logger = logging.getLogger("teamtalk_scheduler")

# Cache memori agar tidak mengirim pesan ganda untuk event yang sama pada hari yang sama
_sent_events_cache: Set[str] = set()
_last_cache_cleanup_date: date | None = None
_last_escalation_alert_time: datetime | None = None

# Jeda pengingat eskalasi otomatis agar tidak spam (setiap 30 menit)
ESCALATION_ALERT_COOLDOWN_MINUTES = 30


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

    for line in lines:
        setting = get_line_setting(db, line.id)
        meeting_enabled = setting.meeting_enabled if setting else True
        reminder_mins = setting.meeting_reminder_minutes if setting else 15

        if not meeting_enabled or reminder_mins <= 0:
            continue

        slots = slots_for_day(db, line.id, today)
        for slot in slots:
            try:
                # slot.time berbentuk "HH:MM"
                sh, sm = [int(p) for p in slot.time.split(":")]
                target_dt = datetime(now.year, now.month, now.day, sh, sm)
                diff_sec = (target_dt - now).total_seconds()
                diff_min = diff_sec / 60.0

                # Jika waktu sekarang berada di antara 0 sampai reminder_mins sebelum meeting
                if 0 <= diff_min <= reminder_mins:
                    event_key = f"meeting_{line.id}_{slot.label}_{today}"
                    if event_key not in _sent_events_cache:
                        logger.info("Mengirim pengingat meeting: %s Line %s", slot.label, line.code)
                        sent = await notify_meeting_reminder(
                            line_code=line.code,
                            session_label=slot.label,
                            scheduled_time=slot.time,
                            minutes_left=max(1, int(diff_min)),
                        )
                        if sent:
                            _sent_events_cache.add(event_key)
            except Exception as e:
                logger.error("Error saat evaluasi slot meeting %s: %s", slot, e)


async def check_papercard_reminders(db: Session, now: datetime):
    today = now.date()
    lines = db.scalars(select(Line).where(Line.status != "stopped")).all()

    for line in lines:
        setting = get_line_setting(db, line.id)
        papercard_enabled = setting.papercard_enabled if setting else True
        reminder_mins = setting.papercard_reminder_minutes if setting else 15

        if not papercard_enabled or reminder_mins <= 0:
            continue

        # Cek template papercard untuk mengetahui jam batas pengisian (window_end)
        templates = db.scalars(select(PapercardTemplate).where(PapercardTemplate.line_id == line.id)).all()
        for tpl in templates:
            try:
                window_end = tpl.window_end or "08:15"
                eh, em = [int(p) for p in window_end.split(":")]
                target_dt = datetime(now.year, now.month, now.day, eh, em)
                diff_sec = (target_dt - now).total_seconds()
                diff_min = diff_sec / 60.0

                if 0 <= diff_min <= reminder_mins:
                    event_key = f"papercard_{line.id}_{tpl.department}_{today}"
                    if event_key not in _sent_events_cache:
                        # Cek apakah sudah ada submission untuk departemen ini
                        has_submission = db.scalar(
                            select(PapercardSubmission.id).where(
                                PapercardSubmission.line_id == line.id,
                                PapercardSubmission.department == tpl.department,
                                PapercardSubmission.date == today,
                            )
                        )
                        if not has_submission:
                            logger.info("Mengirim pengingat papercard Line %s Dept %s", line.code, tpl.department)
                            sent = await notify_papercard_reminder(
                                line_code=line.code,
                                shift=f"Papercard {tpl.department}",
                                pending_count=1,
                                minutes_left=max(1, int(diff_min)),
                            )
                            if sent:
                                _sent_events_cache.add(event_key)
            except Exception as e:
                logger.error("Error evaluasi papercard template %s: %s", tpl.id, e)


async def check_escalated_reminders(db: Session, now: datetime):
    global _last_escalation_alert_time

    # Cek jeda cooldown
    if _last_escalation_alert_time is not None:
        elapsed = (now - _last_escalation_alert_time).total_seconds() / 60.0
        if elapsed < ESCALATION_ALERT_COOLDOWN_MINUTES:
            return

    # Ambil masalah yang statusnya belum selesai dan sudah melewati due date
    now_iso = now.strftime("%Y-%m-%dT%H:%M")
    stmt = (
        select(DmMeetingSummary)
        .where(
            DmMeetingSummary.status != "resolved",
            DmMeetingSummary.due_date.isnot(None),
            DmMeetingSummary.due_date < now_iso,
        )
        .order_by(DmMeetingSummary.id.desc())
    )
    overdue_summaries = db.scalars(stmt).all()

    if overdue_summaries:
        logger.info("Ditemukan %d masalah overdue, mengirim pengingat eskalasi ke TeamTalk", len(overdue_summaries))
        items = [
            {
                "line_code": sm.line_code or "-",
                "problem": sm.problem,
                "pic_name": sm.pic_name or "-",
                "due_date": sm.due_date,
            }
            for sm in overdue_summaries[:5]  # Batasi 5 item teratas agar pesan tidak terlalu panjang
        ]
        sent = await notify_escalated_problems(items)
        if sent:
            _last_escalation_alert_time = now


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
                await check_papercard_reminders(db, now)
                await check_escalated_reminders(db, now)

        except Exception as exc:
            logger.error("Error pada TeamTalk scheduler loop: %s", exc)

        # Cek ulang setiap 60 detik
        await asyncio.sleep(60)
