from datetime import date, datetime, timedelta
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch
import unittest
from uuid import uuid4

from fastapi import BackgroundTasks, HTTPException, UploadFile
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.admin import attendance_recap, create_line
from app.api.deps import Principal
from app.api.dm_groups import assign_line_to_group, delete_dm_group
from app.api.face_scan import open_session, scan_attendance
from app.api import face_scan
from app.api.meetings import close_presensi, end_session, list_sessions, prepare_session, save_absence_notes, start_session
from app.db.base import Base
from app.db.session import engine
from app.models import Board, BoardMember, DmGroup, DmMeetingAttendance, DmMeetingSession, Employee, Line, Workshop
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
        workshop = Workshop(name="Test Workshop")
        self.db.add(workshop)
        self.db.flush()
        self.group = DmGroup(workshop_id=workshop.id, name="DM A")
        self.db.add(self.group)
        self.db.flush()
        self.lines = [Line(workshop_id=workshop.id, dm_group_id=self.group.id, code=code, name=code) for code in ("501", "502")]
        self.db.add_all(self.lines)
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
        start_session(MeetingSessionStartIn(line_id=self.lines[0].id, date=self.day, session_number=1), self.db, self.host)
        self.assertEqual(self.target().status, "in_progress")
        result = end_session(self.source_id, MeetingSessionEndIn(summaries=[{"problem": "Test issue", "picName": self.employees[3].name, "picEmployeeNo": self.employees[3].employee_no, "lineCode": "502"}]), BackgroundTasks(), self.db, self.host)
        self.assertEqual(self.target().status, "completed")
        self.assertEqual(len(result.summaries), 1)
        self.assertEqual(result.summaries[0].line_id, self.lines[1].id)
        self.assertEqual(result.summaries[0].pic_id, self.employees[3].id)
        with self.assertRaises(HTTPException):
            end_session(self.source_id, MeetingSessionEndIn(), BackgroundTasks(), self.db, self.host)

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
