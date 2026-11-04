import asyncio
from datetime import datetime
import unittest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine
from app.models import DmMeetingSession, DmMeetingSummary, Line, Workshop
from app.services import teamtalk_scheduler


class EscalationReminderTests(unittest.TestCase):
    def setUp(self):
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)
        schema = "test_escalation_" + uuid4().hex
        self.connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        self.connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(self.connection)
        self.db = Session(self.connection, autoflush=False, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)
        workshop = Workshop(name="Test Workshop")
        self.db.add(workshop)
        self.db.flush()
        line = Line(workshop_id=workshop.id, code="TEST0", name="Line 0")
        self.db.add(line)
        self.db.flush()
        session = DmMeetingSession(line_id=line.id, date=datetime(2026, 11, 4).date(), session_type="during_1", session_number=1, label="Sesi 1", scheduled_time="08:00")
        self.db.add(session)
        self.db.flush()
        self.summary = DmMeetingSummary(
            session_id=session.id, line_id=line.id, problem="Mesin overheat", pic_name="PIC",
            due_date="2026-11-04T09:10", line_code="TEST0", status="open",
        )
        self.db.add(self.summary)
        self.db.flush()

    def run_meeting_check(self, now: datetime) -> AsyncMock:
        notify = AsyncMock(return_value=True)
        with patch.object(teamtalk_scheduler, "notify_meeting_reminder", notify):
            asyncio.run(teamtalk_scheduler.check_meeting_reminders(self.db, now))
        return notify

    def test_meeting_reminded_twice_only(self):
        teamtalk_scheduler._sent_events_cache.clear()
        before = self.run_meeting_check(datetime(2026, 11, 4, 9, 50))
        self.assertEqual(before.call_count, 1)
        self.assertFalse(before.call_args.kwargs.get("started", False))
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 4, 9, 55)).call_count, 0)
        at_time = self.run_meeting_check(datetime(2026, 11, 4, 10, 0, 20))
        self.assertEqual(at_time.call_count, 1)
        self.assertTrue(at_time.call_args.kwargs["started"])
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 4, 10, 0, 50)).call_count, 0)
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 4, 10, 4)).call_count, 0)

    def test_meeting_start_reminder_skipped_when_already_started(self):
        teamtalk_scheduler._sent_events_cache.clear()
        session = self.db.scalar(select(DmMeetingSession))
        session.status = "in_progress"
        self.db.flush()
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 4, 10, 0, 20)).call_count, 0)

    def run_check(self, now: datetime) -> AsyncMock:
        notify = AsyncMock(return_value=True)
        with patch.object(teamtalk_scheduler, "notify_escalated_problems", notify):
            asyncio.run(teamtalk_scheduler.check_escalated_reminders(self.db, now))
        return notify

    def test_sends_once_per_working_day(self):
        self.assertEqual(self.run_check(datetime(2026, 11, 4, 10, 0)).call_count, 1)
        self.assertEqual(self.run_check(datetime(2026, 11, 4, 10, 30)).call_count, 0)
        self.assertEqual(self.run_check(datetime(2026, 11, 4, 16, 59)).call_count, 0)

    def test_reminds_again_next_working_day_morning(self):
        self.run_check(datetime(2026, 11, 4, 10, 0))
        self.assertEqual(self.run_check(datetime(2026, 11, 5, 7, 59)).call_count, 0)
        self.assertEqual(self.run_check(datetime(2026, 11, 5, 8, 0)).call_count, 1)

    def test_skips_outside_work_hours_and_weekends(self):
        self.assertEqual(self.run_check(datetime(2026, 11, 4, 7, 59)).call_count, 0)
        self.assertEqual(self.run_check(datetime(2026, 11, 4, 17, 0)).call_count, 0)
        self.assertEqual(self.run_check(datetime(2026, 11, 7, 10, 0)).call_count, 0)
        self.assertEqual(self.run_check(datetime(2026, 11, 9, 8, 0)).call_count, 1)

    def test_skips_resolved_and_not_yet_due(self):
        self.assertEqual(self.run_check(datetime(2026, 11, 4, 9, 0)).call_count, 0)
        self.summary.status = "resolved"
        self.db.flush()
        self.assertEqual(self.run_check(datetime(2026, 11, 4, 10, 0)).call_count, 0)

    def test_failed_send_is_retried(self):
        failing = AsyncMock(return_value=False)
        with patch.object(teamtalk_scheduler, "notify_escalated_problems", failing):
            asyncio.run(teamtalk_scheduler.check_escalated_reminders(self.db, datetime(2026, 11, 4, 10, 0)))
        self.assertIsNone(self.summary.last_escalated_on)
        self.assertEqual(self.run_check(datetime(2026, 11, 4, 10, 1)).call_count, 1)


if __name__ == "__main__":
    unittest.main()
