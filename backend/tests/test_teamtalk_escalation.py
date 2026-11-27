import asyncio
from datetime import datetime
import unittest
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine
from app.models import DmMeetingSchedule, DmMeetingSession, DmMeetingSummary, Employee, Line, PapercardSubmission, PapercardTemplate, Workshop
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
        self.db.add(DmMeetingSchedule(line_id=line.id, label="Sesi 1", time="10:00", days="1,2,3,4,5"))
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

    def test_meeting_reminded_once_before_start_only(self):
        teamtalk_scheduler._sent_events_cache.clear()
        before = self.run_meeting_check(datetime(2026, 11, 4, 9, 50))
        self.assertEqual(before.call_count, 1)
        self.assertFalse(before.call_args.kwargs.get("started", False))
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 4, 9, 55)).call_count, 0)
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 4, 10, 0, 20)).call_count, 0)
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 4, 10, 4)).call_count, 0)

    def run_papercard_check(self, now: datetime) -> tuple[AsyncMock, AsyncMock]:
        reminder = AsyncMock(return_value=True)
        deadline = AsyncMock(return_value=True)
        with patch.object(teamtalk_scheduler, "notify_papercard_reminder", reminder), \
                patch.object(teamtalk_scheduler, "notify_papercard_deadline", deadline):
            asyncio.run(teamtalk_scheduler.check_papercard_reminders(self.db, now))
        return reminder, deadline

    def add_papercard_template(self):
        line = self.db.scalar(select(Line))
        self.db.add(PapercardTemplate(workshop_id=line.workshop_id, line_id=line.id, department="PROD", name="PROD", window_start="08:00", window_end="08:15"))
        self.db.flush()
        return line

    def test_papercard_reminded_at_start_and_at_deadline(self):
        teamtalk_scheduler._sent_events_cache.clear()
        self.add_papercard_template()
        reminder, deadline = self.run_papercard_check(datetime(2026, 11, 4, 7, 44))
        self.assertEqual((reminder.call_count, deadline.call_count), (0, 0))
        reminder, deadline = self.run_papercard_check(datetime(2026, 11, 4, 7, 45))
        self.assertEqual((reminder.call_count, deadline.call_count), (1, 0))
        reminder, deadline = self.run_papercard_check(datetime(2026, 11, 4, 7, 50))
        self.assertEqual((reminder.call_count, deadline.call_count), (0, 0))
        reminder, deadline = self.run_papercard_check(datetime(2026, 11, 4, 8, 5))
        self.assertEqual((reminder.call_count, deadline.call_count), (0, 0))
        reminder, deadline = self.run_papercard_check(datetime(2026, 11, 4, 8, 15, 20))
        self.assertEqual((reminder.call_count, deadline.call_count), (0, 1))
        entry = deadline.call_args.args[0][0]
        self.assertEqual((entry["line_code"], entry["department"]), ("TEST0", "PROD"))
        reminder, deadline = self.run_papercard_check(datetime(2026, 11, 4, 8, 16, 20))
        self.assertEqual((reminder.call_count, deadline.call_count), (0, 0))
        reminder, deadline = self.run_papercard_check(datetime(2026, 11, 4, 8, 21))
        self.assertEqual((reminder.call_count, deadline.call_count), (0, 0))

    def test_no_schedule_means_no_notifications(self):
        teamtalk_scheduler._sent_events_cache.clear()
        line = self.add_papercard_template()
        self.db.execute(DmMeetingSchedule.__table__.delete().where(DmMeetingSchedule.line_id == line.id))
        self.db.flush()
        self.assertEqual(self.run_papercard_check(datetime(2026, 11, 4, 7, 45))[0].call_count, 0)
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 4, 9, 50)).call_count, 0)

    def test_weekend_is_off_unless_admin_schedules_it(self):
        teamtalk_scheduler._sent_events_cache.clear()
        line = self.add_papercard_template()
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 7, 9, 50)).call_count, 0)
        self.db.add(DmMeetingSchedule(line_id=line.id, label="Sesi Sabtu", time="09:00", days="6"))
        self.db.flush()
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 7, 8, 50)).call_count, 1)
        self.assertEqual(self.run_papercard_check(datetime(2026, 11, 7, 7, 45))[0].call_count, 1)
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 8, 8, 50)).call_count, 0)

    def test_schedule_without_days_defaults_to_weekdays(self):
        from app.services.meeting_schedule import parse_days

        self.assertEqual(parse_days(None), [1, 2, 3, 4, 5])
        self.assertEqual(parse_days(""), [1, 2, 3, 4, 5])
        self.assertEqual(parse_days("6,7"), [6, 7])

    def test_papercard_follows_dm_meeting_schedule(self):
        teamtalk_scheduler._sent_events_cache.clear()
        self.add_papercard_template()
        saturday = self.run_papercard_check(datetime(2026, 11, 7, 7, 45))
        self.assertEqual((saturday[0].call_count, saturday[1].call_count), (0, 0))
        saturday = self.run_papercard_check(datetime(2026, 11, 7, 8, 15, 20))
        self.assertEqual((saturday[0].call_count, saturday[1].call_count), (0, 0))
        wednesday = self.run_papercard_check(datetime(2026, 11, 4, 7, 45))
        self.assertEqual(wednesday[0].call_count, 1)

    def test_reminders_only_for_running_lines(self):
        teamtalk_scheduler._sent_events_cache.clear()
        line = self.add_papercard_template()
        for status in ("idle", "stopped"):
            line.status = status
            self.db.flush()
            reminder, deadline = self.run_papercard_check(datetime(2026, 11, 4, 7, 45))
            self.assertEqual((reminder.call_count, deadline.call_count), (0, 0))
            self.assertEqual(self.run_meeting_check(datetime(2026, 11, 4, 9, 50)).call_count, 0)
        line.status = "running"
        self.db.flush()
        self.assertEqual(self.run_papercard_check(datetime(2026, 11, 4, 7, 45))[0].call_count, 1)
        self.assertEqual(self.run_meeting_check(datetime(2026, 11, 4, 9, 50)).call_count, 1)

    def run_complete_check(self, now: datetime) -> AsyncMock:
        notify = AsyncMock(return_value=True)
        with patch.object(teamtalk_scheduler, "notify_papercard_complete", notify), \
                patch.object(teamtalk_scheduler, "notify_papercard_reminder", AsyncMock(return_value=True)), \
                patch.object(teamtalk_scheduler, "notify_papercard_deadline", AsyncMock(return_value=True)):
            asyncio.run(teamtalk_scheduler.check_papercard_reminders(self.db, now))
        return notify

    def add_review_line(self, code, with_submission):
        base = self.db.scalar(select(Line))
        line = Line(workshop_id=base.workshop_id, code=code, name=code)
        self.db.add(line)
        self.db.flush()
        self.db.add(DmMeetingSchedule(line_id=line.id, label="Sesi 1", time="10:00", days="1,2,3,4,5"))
        self.db.add(PapercardTemplate(workshop_id=line.workshop_id, line_id=line.id, department="PROD", name="PROD", window_start="08:00", window_end="08:15"))
        self.db.flush()
        if with_submission:
            self.submit(line)
        return line

    def submit(self, line):
        supervisor = self.db.scalar(select(Employee).where(Employee.employee_no == "S-0001"))
        if supervisor is None:
            supervisor = Employee(employee_no="S-0001", name="Spv", role="supervisor", dept="PROD")
            self.db.add(supervisor)
            self.db.flush()
        employee = self.db.scalar(select(Employee).where(Employee.employee_no == "T-0002"))
        if employee is None:
            employee = Employee(employee_no="T-0002", name="Tester", supervisor_id=supervisor.id)
            self.db.add(employee)
            self.db.flush()
        self.db.add(PapercardSubmission(
            line_id=line.id, employee_id=employee.id, department="PROD", date=datetime(2026, 11, 4).date(),
            recipient_supervisor_id=supervisor.id,
        ))
        self.db.flush()

    def test_one_message_when_every_line_has_submitted(self):
        teamtalk_scheduler._sent_events_cache.clear()
        first = self.add_papercard_template()
        second = self.add_review_line("TEST1", with_submission=False)
        self.submit(first)
        self.assertEqual(self.run_complete_check(datetime(2026, 11, 4, 8, 5)).call_count, 0)
        self.submit(second)
        notify = self.run_complete_check(datetime(2026, 11, 4, 8, 6))
        self.assertEqual(notify.call_count, 1)
        entries = notify.call_args.args[0]
        self.assertEqual(sorted(e["line_code"] for e in entries), ["TEST0", "TEST1"])
        self.assertEqual(entries[0]["supervisor_names"], ["Spv"])
        self.assertEqual(entries[0]["supervisor_nos"], ["S-0001"])
        self.assertEqual(self.run_complete_check(datetime(2026, 11, 4, 8, 7)).call_count, 0)

    def test_deadline_sends_only_completed_lines_in_one_message(self):
        teamtalk_scheduler._sent_events_cache.clear()
        first = self.add_papercard_template()
        self.add_review_line("TEST1", with_submission=False)
        self.submit(first)
        self.assertEqual(self.run_complete_check(datetime(2026, 11, 4, 8, 14)).call_count, 0)
        notify = self.run_complete_check(datetime(2026, 11, 4, 8, 15))
        self.assertEqual(notify.call_count, 1)
        self.assertEqual([e["line_code"] for e in notify.call_args.args[0]], ["TEST0"])
        self.assertEqual(self.run_complete_check(datetime(2026, 11, 4, 8, 16)).call_count, 0)

    def test_complete_notification_skipped_when_nothing_awaits_review(self):
        teamtalk_scheduler._sent_events_cache.clear()
        line = self.add_papercard_template()
        employee = Employee(employee_no="T-0003", name="Tester")
        self.db.add(employee)
        self.db.flush()
        self.db.add(PapercardSubmission(line_id=line.id, employee_id=employee.id, department="PROD", date=datetime(2026, 11, 4).date(), approval_status="approved"))
        self.db.flush()
        self.assertEqual(self.run_complete_check(datetime(2026, 11, 4, 9, 0)).call_count, 0)

    def test_papercard_deadline_skipped_when_submitted(self):
        teamtalk_scheduler._sent_events_cache.clear()
        line = self.add_papercard_template()
        employee = Employee(employee_no="T-0001", name="Tester")
        self.db.add(employee)
        self.db.flush()
        self.db.add(PapercardSubmission(line_id=line.id, employee_id=employee.id, department="PROD", date=datetime(2026, 11, 4).date()))
        self.db.flush()
        reminder, deadline = self.run_papercard_check(datetime(2026, 11, 4, 8, 15, 20))
        self.assertEqual((reminder.call_count, deadline.call_count), (0, 0))

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

    def test_workshop_problem_is_escalated_once_per_day(self):
        from app.models import WorkshopMeetingSession, WorkshopMeetingSummary

        self.summary.status = "resolved"
        session = WorkshopMeetingSession(
            workshop_id=self.db.scalar(select(Workshop.id)), date=datetime(2026, 11, 4).date(),
            label="Workshop Meeting", scheduled_time="08:00",
        )
        self.db.add(session)
        self.db.flush()
        workshop_summary = WorkshopMeetingSummary(
            session_id=session.id, problem="Material kurang", pic_name="PIC Workshop",
            due_date="2026-11-04T09:10", line_code="TEST0", status="open",
        )
        self.db.add(workshop_summary)
        self.db.flush()
        notify = self.run_check(datetime(2026, 11, 4, 10, 0))
        self.assertEqual(notify.call_count, 1)
        self.assertEqual([item["problem"] for item in notify.call_args.args[0]], ["Material kurang"])
        self.assertEqual(workshop_summary.last_escalated_on, datetime(2026, 11, 4).date())
        self.assertEqual(self.run_check(datetime(2026, 11, 4, 10, 30)).call_count, 0)

    def test_failed_send_is_retried(self):
        failing = AsyncMock(return_value=False)
        with patch.object(teamtalk_scheduler, "notify_escalated_problems", failing):
            asyncio.run(teamtalk_scheduler.check_escalated_reminders(self.db, datetime(2026, 11, 4, 10, 0)))
        self.assertIsNone(self.summary.last_escalated_on)
        self.assertEqual(self.run_check(datetime(2026, 11, 4, 10, 1)).call_count, 1)

    def test_workshop_meeting_reminders_merged_when_same_time(self):
        from app.models import WorkshopMeetingSetting
        from app.services import teamtalk

        teamtalk_scheduler._sent_events_cache.clear()
        first = self.db.scalar(select(Workshop))
        second = Workshop(name="Second Workshop")
        self.db.add(second)
        self.db.flush()
        self.db.add(WorkshopMeetingSetting(workshop_id=first.id, time="08:30", days="1,2,3,4,5", reminder_minutes=15, is_active=True, reminder_enabled=True))
        self.db.add(WorkshopMeetingSetting(workshop_id=second.id, time="08:30", days="1,2,3,4,5", reminder_minutes=15, is_active=True, reminder_enabled=True))
        self.db.flush()

        send_mock = AsyncMock(return_value=True)
        with patch.object(teamtalk, "send_teamtalk_message", send_mock):
            asyncio.run(teamtalk_scheduler.check_workshop_meeting_reminders(self.db, datetime(2026, 11, 4, 8, 15)))
            self.assertEqual(send_mock.call_count, 1)
            msg = send_mock.call_args.args[0]
            self.assertIn("08:30", msg)
            self.assertIn("Test Workshop, Second Workshop", msg)
            asyncio.run(teamtalk_scheduler.check_workshop_meeting_reminders(self.db, datetime(2026, 11, 4, 8, 20)))
            self.assertEqual(send_mock.call_count, 1)


if __name__ == "__main__":
    unittest.main()
