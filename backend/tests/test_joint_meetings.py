from datetime import date, datetime, timedelta
from dataclasses import asdict
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch
import unittest
from uuid import uuid4

from fastapi import BackgroundTasks, HTTPException, UploadFile
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.api.admin import create_line
from app.api.public import attendance_recap
from app.api.deps import Principal
from app.api.dm_groups import assign_line_to_group, delete_dm_group
from app.api.face_scan import open_session, scan_attendance
from app.api import face_scan
from app.api.meetings import close_presensi, end_session, list_sessions, prepare_session, save_absence_notes, start_session, summary_options
from app.db.base import Base
from app.db.session import engine
from app.models.abnormal_category import AbnormalCategory
from app.models import Board, BoardMember, DmGroup, DmMeetingAttendance, DmMeetingSchedule, DmMeetingSession, Employee, Line, Workshop
from app.schemas import AbsenceNotesIn, DmGroupLineAssignIn, LineIn, MeetingPrepareIn, MeetingSessionEndIn, MeetingSessionStartIn, PresensiCloseIn
from app.services import joint_meetings


class JointMeetingTests(unittest.TestCase):
    def setUp(self):
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        schema = "test_dm_" + uuid4().hex
        self.connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        self.connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(self.connection)
        self.db = Session(self.connection, autoflush=False, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.day = date(2026, 10, 26)
        self.db.add(AbnormalCategory(level=1, code="P", name="Planning Losses"))
        self.db.flush()
        workshop = Workshop(name="Test Workshop")
        self.db.add(workshop)
        self.db.flush()
        self.group = DmGroup(workshop_id=workshop.id, name="DM A")
        self.db.add(self.group)
        self.db.flush()
        self.lines = [Line(workshop_id=workshop.id, dm_group_id=self.group.id, code=code, name=code) for code in ("501", "502")]
        self.db.add_all(self.lines)
        self.db.flush()
        for line in self.lines:
            self.db.add_all([
                DmMeetingSchedule(line_id=line.id, label="Sesi 1", time="10:00", days="1,2,3,4,5"),
                DmMeetingSchedule(line_id=line.id, label="Sesi 2", time="14:00", days="1,2,3,4,5"),
            ])
        self.db.flush()
        self.employees = [Employee(employee_no=f"TEST{i}", name=f"Person {i}", role="leader" if i < 2 else "member", dept="PROD", must_change_password=False) for i in range(4)]
        self.db.add_all(self.employees)
        self.db.flush()
        self.memberships = []
        for i, line in enumerate(self.lines):
            board = Board(line_id=line.id, slug=f"test-{i}")
            self.db.add(board)
            self.db.flush()
            for employee in (self.employees[i], self.employees[i + 2]):
                member = BoardMember(board_id=board.id, employee_id=employee.id)
                self.db.add(member)
                self.memberships.append(member)
        self.db.commit()
        self.host = Principal(employee=self.employees[0])
        self.other = Principal(employee=self.employees[1])
        self.sessions = list_sessions(self.lines[0].id, self.day, "Shift 1", self.db, self.host)
        self.source_id = self.sessions[0].id

    def tearDown(self):
        self.db.close()
        self.transaction.rollback()
        self.connection.close()

    def prepare(self, scope="dm"):
        return prepare_session(self.source_id, MeetingPrepareIn(scope=scope), self.db, self.host)

    def test_presensi_cannot_open_twenty_minutes_before_schedule(self):
        from app.services.meeting_start import JAKARTA

        session = self.db.get(DmMeetingSession, self.source_id)
        session.scheduled_time = "14:40"
        self.db.flush()
        with patch("app.services.meeting_start.datetime", wraps=datetime) as clock:
            clock.now.return_value = datetime.combine(self.day, datetime.min.time(), tzinfo=JAKARTA).replace(hour=14, minute=20)
            with self.assertRaises(HTTPException) as error:
                self.prepare()
            self.assertEqual(error.exception.status_code, 409)
            self.assertIn("14:25", error.exception.detail)
            self.assertIsNone(session.roster)
            clock.now.return_value = clock.now.return_value.replace(minute=25)
            result = self.prepare()
            self.assertTrue(result.roster_prepared)

    def test_start_requires_presensi_without_checking_time_again(self):
        session = self.db.get(DmMeetingSession, self.source_id)
        payload = MeetingSessionStartIn(line_id=session.line_id, date=session.date, session_number=session.session_number)
        with patch("app.api.meetings.ensure_start_window", side_effect=HTTPException(409, "Belum waktunya")) as guard:
            with self.assertRaises(HTTPException) as error:
                start_session(payload, BackgroundTasks(), self.db, self.host)
            self.assertEqual(error.exception.status_code, 409)
            guard.assert_not_called()
        self.assertEqual(session.status, "pending")
        self.prepare()
        with patch("app.api.meetings.ensure_start_window", side_effect=HTTPException(409, "Belum waktunya")) as guard:
            result = start_session(payload, BackgroundTasks(), self.db, self.host)
            guard.assert_not_called()
        self.assertEqual(result.status, "in_progress")

    def test_start_notifies_once_for_host_and_mirrored_lines(self):
        session = self.db.get(DmMeetingSession, self.source_id)
        payload = MeetingSessionStartIn(line_id=session.line_id, date=session.date, session_number=session.session_number)
        self.prepare()
        first = BackgroundTasks()
        start_session(payload, first, self.db, self.host)
        self.assertEqual(len(first.tasks), 1)
        entries, started = first.tasks[0].args
        self.assertTrue(started)
        self.assertEqual([entry["line_code"] for entry in entries], ["501", "502"])
        again = BackgroundTasks()
        start_session(payload, again, self.db, self.host)
        self.assertEqual(len(again.tasks), 0)

    def test_batch_standup_preserves_both_sessions_and_reads_latest_attendance(self):
        from app.services.scorecard_data import load_scorecard_data
        from app.services.standup_kpi import line_standup

        line_ids = [line.id for line in self.lines]
        def compare():
            _, loaded = load_scorecard_data(self.db, line_ids, self.day, self.day, "Shift 1")
            scores = []
            for line_id in line_ids:
                original = line_standup(self.db, line_id, self.day, self.day, "Shift 1", self.day)
                batched = line_standup(self.db, line_id, self.day, self.day, "Shift 1", self.day, loaded=loaded[line_id])
                self.assertEqual([asdict(day) for day in original], [asdict(day) for day in batched])
                self.assertEqual([meeting.number for meeting in batched[0].meetings], [1, 2])
                scores.extend(batched)
            return scores

        before = compare()
        source = self.db.get(DmMeetingSession, self.source_id)
        source.status = "completed"
        for employee in (self.employees[0], self.employees[2]):
            self.db.add(DmMeetingAttendance(session_id=source.id, employee_id=employee.id, status="present"))
        self.db.flush()
        after = compare()
        self.assertEqual(before[0].attendance, 0)
        self.assertEqual(after[0].attendance, 5)
        self.assertFalse(after[0].meetings[1].held)

    def target(self):
        return self.db.scalar(select(DmMeetingSession).where(DmMeetingSession.source_session_id == self.source_id))

    def scan(self, employee):
        source = open_session(self.db, self.host, self.source_id)
        joint_meetings.require_participant(self.db, source, employee.id)
        attendance = DmMeetingAttendance(session_id=source.id, employee_id=employee.id, status="present", verification_method="face_id", face_confidence=0.9)
        self.db.add(attendance)
        self.db.flush()
        joint_meetings.sync_attendance(self.db, source, attendance)
        self.db.commit()

    def test_line_meeting_rejects_other_line(self):
        result = self.prepare("line")
        self.assertEqual(len(result.participants), 2)
        self.assertIsNone(self.target())
        with self.assertRaises(HTTPException) as error:
            self.scan(self.employees[3])
        self.assertEqual(error.exception.status_code, 403)

    def test_joint_presensi_and_absence_notes_sync_to_home_line(self):
        result = self.prepare()
        self.assertEqual(len(result.participants), 4)
        self.scan(self.employees[3])
        close_presensi(self.source_id, PresensiCloseIn(absent_employee_nos=[e.employee_no for e in self.employees]), self.db, self.host)
        save_absence_notes(self.source_id, AbsenceNotesIn(items=[{"employeeNo": self.employees[1].employee_no, "reason": "sick", "note": "Rest"}]), self.db, self.host)
        target = self.target()
        rows = {a.employee_id: a for a in self.db.scalars(select(DmMeetingAttendance).where(DmMeetingAttendance.session_id == target.id))}
        self.assertEqual(rows[self.employees[3].id].status, "present")
        self.assertEqual(rows[self.employees[1].id].status, "sick")
        self.assertEqual(rows[self.employees[1].id].note_by_id, self.host.employee.id)
        recap = attendance_recap(self.day, None, self.db)
        self.assertEqual(len(recap.rows), 4)
        self.assertTrue(all(not row.is_guest for row in recap.rows))
        self.assertTrue(all(row.line_id == self.lines[1].id for row in recap.rows if row.employee_no in (self.employees[1].employee_no, self.employees[3].employee_no)))

    def test_start_end_and_problem_belong_to_affected_line(self):
        self.prepare()
        start_session(MeetingSessionStartIn(line_id=self.lines[0].id, date=self.day, session_number=1), BackgroundTasks(), self.db, self.host)
        self.assertEqual(self.target().status, "in_progress")
        result = end_session(self.source_id, MeetingSessionEndIn(summaries=[{"problem": "Test issue", "categoryCodes": ["P"], "occurredAt": "2026-10-26T08:00", "picName": self.employees[3].name, "picEmployeeNo": self.employees[3].employee_no, "lineCode": "502"}]), BackgroundTasks(), self.db, self.host)
        self.assertEqual(self.target().status, "completed")
        self.assertEqual(len(result.summaries), 1)
        self.assertEqual(result.summaries[0].line_id, self.lines[1].id)
        self.assertEqual(result.summaries[0].pic_id, self.employees[3].id)
        self.assertEqual(result.summaries[0].category_codes, ["P"])
        self.assertEqual(result.summaries[0].problem_categories, ["P-Planning Losses"])
        self.assertEqual((result.summaries[0].occurred_at, result.summaries[0].responded_at), ("2026-10-26T08:00", None))
        with self.assertRaises(HTTPException):
            end_session(self.source_id, MeetingSessionEndIn(), BackgroundTasks(), self.db, self.host)

    def test_summary_allows_line_and_pic_outside_meeting(self):
        outside_line = Line(workshop_id=self.lines[0].workshop_id, code="999", name="Outside")
        outside_pic = Employee(employee_no="OUTSIDE", name="Outside PIC", role="member", is_active=True)
        inactive = Employee(employee_no="INACTIVE", name="Inactive PIC", role="member", is_active=False)
        self.db.add_all([outside_line, outside_pic, inactive])
        self.db.commit()
        options = summary_options(self.db, self.host)
        self.assertIn("999", options.lines)
        self.assertIn(outside_pic.id, [user.id for user in options.users])
        self.assertNotIn(inactive.id, [user.id for user in options.users])
        with self.assertRaises(HTTPException) as denied:
            summary_options(self.db, Principal(employee=outside_pic))
        self.assertEqual(denied.exception.status_code, 403)
        self.prepare()
        start_session(MeetingSessionStartIn(line_id=self.lines[0].id, date=self.day, session_number=1), BackgroundTasks(), self.db, self.host)
        result = end_session(self.source_id, MeetingSessionEndIn(summaries=[{
            "problem": "Outside issue", "categoryCodes": ["P"], "occurredAt": "2026-10-26T08:00", "picName": "Old name", "picEmployeeNo": "OUTSIDE", "lineCode": "999",
        }]), BackgroundTasks(), self.db, self.host)
        self.assertEqual(result.status, "completed")
        self.assertEqual(len(result.summaries), 1)
        self.assertEqual(result.summaries[0].session_id, self.source_id)
        self.assertEqual(result.summaries[0].line_id, outside_line.id)
        self.assertEqual(result.summaries[0].pic_id, outside_pic.id)
        self.assertEqual(result.summaries[0].pic_name, outside_pic.name)

    def test_scan_endpoint_mirrors_once_and_rejects_outside_dm(self):
        self.prepare()
        employee = self.employees[3]
        fake_face = SimpleNamespace(embedding=None, yaw=0)
        with patch.object(face_scan, "extract_face", return_value=fake_face), patch.object(face_scan, "check_liveness", return_value=None), patch.object(face_scan.settings, "face_antispoof_enabled", False), patch.object(face_scan.matcher, "identify", return_value=SimpleNamespace(employee_id=employee.id, score=0.5)), patch.object(face_scan.matcher, "reload"):
            first = scan_attendance(self.source_id, [UploadFile(filename="frame.jpg", file=BytesIO(b"test"))], None, self.db, self.host)
            second = scan_attendance(self.source_id, [UploadFile(filename="frame.jpg", file=BytesIO(b"test"))], None, self.db, self.host)
        self.assertTrue(first.recognized)
        self.assertTrue(second.already_present)
        rows = list(self.db.scalars(select(DmMeetingAttendance).where(DmMeetingAttendance.employee_id == employee.id)))
        self.assertEqual(len(rows), 2)
        self.assertEqual({row.session_id for row in rows}, {self.source_id, self.target().id})
        outsider = Employee(employee_no="OUTSIDE", name="Outsider", role="member")
        self.db.add(outsider)
        self.db.commit()
        with patch.object(face_scan, "extract_face", return_value=fake_face), patch.object(face_scan, "check_liveness", return_value=None), patch.object(face_scan.settings, "face_antispoof_enabled", False), patch.object(face_scan.matcher, "identify", return_value=SimpleNamespace(employee_id=outsider.id, score=0.5)):
            with self.assertRaises(HTTPException) as error:
                scan_attendance(self.source_id, [UploadFile(filename="frame.jpg", file=BytesIO(b"test"))], None, self.db, self.host)
        self.assertEqual(error.exception.status_code, 403)

    def test_other_leader_cannot_take_over_or_scan(self):
        self.prepare()
        with self.assertRaises(HTTPException):
            open_session(self.db, self.other, self.source_id)
        with self.assertRaises(HTTPException) as error:
            prepare_session(self.target().id, MeetingPrepareIn(scope="dm"), self.db, self.other)
        self.assertEqual(error.exception.status_code, 409)

    def test_existing_line_meeting_blocks_joint_prepare(self):
        own = list_sessions(self.lines[1].id, self.day, "Shift 1", self.db, self.other)
        prepare_session(own[0].id, MeetingPrepareIn(scope="line"), self.db, self.other)
        with self.assertRaises(HTTPException) as error:
            self.prepare()
        self.assertEqual(error.exception.status_code, 409)

    def test_dm_meeting_skips_stopped_lines(self):
        self.lines[1].status = "stopped"
        self.db.commit()
        result = self.prepare()
        self.assertEqual({p.employee_id for p in result.participants}, {self.employees[0].id, self.employees[2].id})
        mirrored = self.db.scalars(select(DmMeetingSession).where(DmMeetingSession.source_session_id == self.source_id)).all()
        self.assertEqual(mirrored, [])

    def test_stopped_line_cannot_open_meeting(self):
        self.lines[0].status = "stopped"
        self.db.commit()
        with self.assertRaises(HTTPException) as error:
            self.prepare()
        self.assertEqual(error.exception.status_code, 409)

    def test_deduplicated_roster_and_frozen_history_after_transfer(self):
        first_board = self.memberships[0].board_id
        self.db.add(BoardMember(board_id=first_board, employee_id=self.employees[3].id))
        self.db.commit()
        result = self.prepare()
        self.assertEqual(len(result.participants), 4)
        self.assertEqual(next(p.line_codes for p in result.participants if p.employee_id == self.employees[3].id), ["501", "502"])
        self.scan(self.employees[1])
        for member in self.memberships:
            member.ended_at = datetime.now()
        self.db.commit()
        source = self.db.get(DmMeetingSession, self.source_id)
        self.assertEqual(len(joint_meetings.participants(self.db, source)), 4)
        self.assertEqual(joint_meetings.participant_line(source, self.employees[1].id), "502")
        recap = attendance_recap(self.day, None, self.db)
        self.assertEqual(len(recap.rows), 1)
        self.assertEqual(recap.rows[0].line_id, self.lines[1].id)
        self.assertEqual(recap.rows[0].home_line, "502")
        self.assertFalse(recap.rows[0].is_guest)

    def test_leader_next_week_uses_new_line_assignment(self):
        self.prepare()
        self.memberships[0].ended_at = datetime.now()
        self.db.add(BoardMember(board_id=self.memberships[2].board_id, employee_id=self.employees[0].id))
        self.db.commit()
        sessions = list_sessions(self.lines[1].id, self.day + timedelta(days=7), "Shift 1", self.db, self.host)
        result = prepare_session(sessions[0].id, MeetingPrepareIn(scope="dm"), self.db, self.host)
        self.assertEqual(result.line_id, self.lines[1].id)
        self.assertEqual(result.leader_id, self.employees[0].id)

    def test_group_with_lines_cannot_be_deleted_or_cross_workshop_assigned(self):
        with self.assertRaises(HTTPException):
            delete_dm_group(self.group.id, self.db, None)
        other_workshop = Workshop(name="Other Workshop")
        self.db.add(other_workshop)
        self.db.flush()
        other_group = DmGroup(workshop_id=other_workshop.id, name="Other DM")
        self.db.add(other_group)
        self.db.commit()
        with self.assertRaises(HTTPException):
            assign_line_to_group(self.lines[0].id, DmGroupLineAssignIn(group_id=other_group.id), self.db, None)
        with self.assertRaises(HTTPException):
            create_line(LineIn(workshop_id=other_workshop.id, dm_group_id=self.group.id, code="999", name="Invalid"), self.db)


if __name__ == "__main__":
    unittest.main()


class SummaryCategoryFieldTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        AbnormalCategory.__table__.create(self.engine)
        self.db = Session(self.engine, expire_on_commit=False)
        self.db.add(AbnormalCategory(level=1, code="P", name="Planning Losses"))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def body(self, **extra):
        from app.schemas import MeetingSummaryIn

        data = {"problem": "x", "picName": "A", "categoryCodes": ["P"], "occurredAt": "2026-10-26T08:00", **extra}
        return MeetingSummaryIn(**data)

    def test_response_is_optional_but_not_before_occurrence(self):
        from app.services.summary_assignments import resolve_category_fields

        fields = resolve_category_fields(self.db, self.body(respondedAt="2026-10-26T08:30"))
        self.assertEqual(fields["responded_at"], "2026-10-26T08:30")
        with self.assertRaises(HTTPException):
            resolve_category_fields(self.db, self.body(respondedAt="2026-10-26T07:59"))

    def test_occurrence_and_code_1_are_required(self):
        from app.services.summary_assignments import resolve_category_fields

        with self.assertRaises(HTTPException):
            resolve_category_fields(self.db, self.body(occurredAt=""))
        with self.assertRaises(HTTPException):
            resolve_category_fields(self.db, self.body(categoryCodes=[]))
