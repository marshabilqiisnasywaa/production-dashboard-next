from datetime import date, datetime, timedelta, timezone
from io import BytesIO
import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

import jwt
from fastapi import HTTPException, UploadFile
from sqlalchemy import create_engine, select
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from alembic.migration import MigrationContext
from alembic.operations import Operations

from app.api import workshop_meetings as api
from app.api.deps import Principal
from app.api.public import get_workshop_team
from app.core.config import settings
from app.core.security import decode_access_token
from app.models import Employee, FaceTemplate, SupervisorWorkshop, Workshop, WorkshopMeetingAttendance, WorkshopMeetingSession, WorkshopMeetingSetting, WorkshopMeetingSummary
from app.schemas import PresensiCloseIn


class WorkshopGuestTests(TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        tables = [Employee, FaceTemplate, Workshop, SupervisorWorkshop, WorkshopMeetingSetting, WorkshopMeetingSession, WorkshopMeetingAttendance, WorkshopMeetingSummary]
        for model in tables:
            model.__table__.create(self.engine)
        self.db = Session(self.engine, expire_on_commit=False)
        self.workshops = [Workshop(name="WO 5"), Workshop(name="WO 6")]
        self.host = Employee(employee_no="HOST", name="Host", role="supervisor", dept="PROD", is_active=True)
        self.regular = Employee(employee_no="REGULAR", name="Regular", role="supervisor", dept="QC", is_active=True)
        self.guest = Employee(employee_no="GUEST", name="Guest", role="supervisor", dept="QC", is_active=True)
        self.db.add_all([*self.workshops, self.host, self.regular, self.guest])
        self.db.flush()
        self.db.add_all([
            SupervisorWorkshop(employee_id=self.host.id, workshop_id=self.workshops[0].id),
            SupervisorWorkshop(employee_id=self.regular.id, workshop_id=self.workshops[1].id, show_in_structure=False),
        ])
        self.session = WorkshopMeetingSession(workshop_id=self.workshops[0].id, date=date(2026, 11, 14), scheduled_time="16:00", status="pending")
        self.db.add(self.session)
        self.db.commit()
        self.principal = Principal(employee=self.host)
        self.prepared = api.prepare_session(self.session.id, self.db, self.principal)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def candidate(self):
        return api.guest_candidate(self.session, self.guest, "face_id", 0.7).guest_candidate

    def confirm(self, token):
        return api.confirm_guest(self.session.id, api.GuestConfirmIn(token=token), self.db, self.principal)

    def test_hidden_supervisor_still_in_combined_roster(self):
        self.assertEqual({p.employee_no for p in self.prepared.participants}, {"HOST", "REGULAR"})
        self.assertEqual(get_workshop_team(self.workshops[1].id, self.db).supervisors, [])
        self.assertEqual(len(get_workshop_team(self.workshops[0].id, self.db).supervisors), 1)

    def test_other_workshop_supervisor_and_hods_are_not_guests(self):
        hods = [Employee(employee_no=f"HOD{i}", name=f"HOD {i}", role="hod", is_active=True) for i in range(2)]
        self.db.add_all(hods)
        self.db.flush()
        for workshop, hod in zip(self.workshops, hods):
            workshop.hod = {"employee_id": hod.id, "name": hod.name, "position": "HOD"}
        self.session.roster = [item for item in self.session.roster if item["employee_id"] == self.host.id]
        self.db.commit()
        for employee, expected in [(self.regular, "WO 6"), (hods[0], "HOD · WO 5"), (hods[1], "HOD · WO 6")]:
            face = SimpleNamespace(yaw=0, embedding=None)
            match = SimpleNamespace(employee_id=employee.id, score=0.7)
            with patch.object(api, "extract_face", return_value=face), patch.object(api, "check_liveness", return_value=None), patch.object(api.matcher, "identify", return_value=match), patch.object(api.matcher, "reload"), patch.object(settings, "face_antispoof_enabled", False), patch.object(settings, "face_update_threshold", 1):
                result = api.scan_attendance(self.session.id, [UploadFile(filename="face.jpg", file=BytesIO(b"test"))], None, self.db, self.principal)
            self.assertIsNone(result.guest_candidate)
            self.assertFalse(result.attendance.is_guest)
            self.assertEqual(result.attendance.participant_label, expected)

    def test_all_assigned_workshops_are_listed_and_legacy_hod_is_recognized(self):
        self.db.add(SupervisorWorkshop(workshop_id=self.workshops[0].id, employee_id=self.regular.id))
        self.host.role = "hod"
        self.workshops[0].hod = {"name": self.host.name, "position": "HOD"}
        self.db.commit()
        is_guest, names, label = api.participant_context(self.db, self.regular)
        self.assertFalse(is_guest)
        self.assertEqual(names, ["WO 5", "WO 6"])
        self.assertEqual(label, "WO 5 · WO 6")
        self.assertEqual(api.participant_context(self.db, self.host)[2], "HOD · WO 5")

    def test_assignment_visibility_preserved_on_unrelated_edits(self):
        admin = Principal(employee=Employee(id=100, role="admin"))
        saved = api.save_assignment(self.workshops[1].id, api.WorkshopSupervisorsIn(employee_ids=[self.regular.id], responsibilities={self.regular.id: "QC"}), self.db, admin)
        self.assertFalse(saved.structure_visibility[self.regular.id])
        saved = api.save_assignment(self.workshops[1].id, api.WorkshopSupervisorsIn(employee_ids=[self.regular.id], structure_visibility={self.regular.id: True}), self.db, admin)
        self.assertTrue(saved.structure_visibility[self.regular.id])
        self.assertEqual(saved.responsibilities[self.regular.id], "QC")
        self.assertEqual(len(get_workshop_team(self.workshops[1].id, self.db).supervisors), 1)

    def test_guest_candidate_does_not_record_attendance_until_confirmed(self):
        candidate = self.candidate()
        self.assertEqual(candidate.name, "Guest")
        self.assertIsNone(self.db.scalar(select(WorkshopMeetingAttendance)))
        self.assertIsNone(decode_access_token(candidate.token))
        result = self.confirm(candidate.token)
        self.assertTrue(result.attendance.is_guest)
        self.assertEqual(result.attendance.verification_method, "face_id")
        repeated = self.confirm(candidate.token)
        self.assertTrue(repeated.already_present)
        self.assertEqual(len(self.db.scalars(select(WorkshopMeetingAttendance).where(WorkshopMeetingAttendance.session_id == self.session.id)).all()), 1)

    def test_guest_history_syncs_and_never_becomes_a_required_member(self):
        self.confirm(self.candidate().token)
        target = self.db.scalar(select(WorkshopMeetingSession).where(WorkshopMeetingSession.source_session_id == self.session.id))
        mapped = api.map_session(target, self.db)
        self.assertEqual(mapped.attendances[0].employee_no, "GUEST")
        self.assertTrue(mapped.attendances[0].is_guest)
        self.assertNotIn(self.guest.id, {p.employee_id for p in mapped.participants})
        api.close_presensi(self.session.id, PresensiCloseIn(absent_employee_nos=["HOST", "REGULAR"]), self.db, self.principal)
        mapped = api.map_session(self.session, self.db)
        self.assertEqual({a.employee_no: a.status for a in mapped.attendances}, {"HOST": "absent", "REGULAR": "absent", "GUEST": "present"})
        tomorrow = WorkshopMeetingSession(workshop_id=self.workshops[0].id, date=date(2026, 11, 15), scheduled_time="16:00", status="pending")
        self.db.add(tomorrow)
        self.db.commit()
        next_session = api.prepare_session(tomorrow.id, self.db, self.principal)
        self.assertNotIn("GUEST", {p.employee_no for p in next_session.participants})
        self.assertEqual(next_session.attendances, [])

    def test_guest_token_rejects_expiry_wrong_session_and_tampering(self):
        token = self.candidate().token
        claims = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        for override in ({"exp": datetime.now(timezone.utc) - timedelta(seconds=1)}, {"session_id": self.session.id + 1}, {"purpose": "other"}):
            bad = jwt.encode({**claims, **override}, settings.secret_key, algorithm="HS256")
            with self.assertRaises(HTTPException) as error:
                self.confirm(bad)
            self.assertEqual(error.exception.status_code, 400)
        with self.assertRaises(HTTPException):
            self.confirm(token + "broken")
        self.assertIsNone(self.db.scalar(select(WorkshopMeetingAttendance)))

    def test_guest_confirmation_rejects_other_host_inactive_user_and_completed_session(self):
        token = self.candidate().token
        with self.assertRaises(HTTPException):
            api.confirm_guest(self.session.id, api.GuestConfirmIn(token=token), self.db, Principal(employee=self.regular))
        self.guest.is_active = False
        self.db.commit()
        with self.assertRaises(HTTPException):
            self.confirm(token)
        self.guest.is_active = True
        self.session.status = "completed"
        self.db.commit()
        with self.assertRaises(HTTPException):
            self.confirm(token)
        self.assertIsNone(self.db.scalar(select(WorkshopMeetingAttendance)))

    def test_face_scan_requests_confirmation_for_guests_but_records_regular_members(self):
        for employee in (self.guest, self.regular):
            face = SimpleNamespace(yaw=0, embedding=None)
            match = SimpleNamespace(employee_id=employee.id, score=0.7)
            with patch.object(api, "extract_face", return_value=face), patch.object(api, "check_liveness", return_value=None), patch.object(api.matcher, "identify", return_value=match), patch.object(api.matcher, "reload"), patch.object(settings, "face_antispoof_enabled", False), patch.object(settings, "face_update_threshold", 1):
                result = api.scan_attendance(self.session.id, [UploadFile(filename="face.jpg", file=BytesIO(b"test"))], None, self.db, self.principal)
            if employee is self.guest:
                self.assertIsNotNone(result.guest_candidate)
                self.assertIsNone(result.attendance)
                self.assertIsNone(self.db.scalar(select(WorkshopMeetingAttendance)))
                confirmed = self.confirm(result.guest_candidate.token)
                self.assertEqual(confirmed.attendance.verification_method, "face_id")
                self.assertEqual(confirmed.attendance.face_confidence, 0.7)
            else:
                self.assertIsNone(result.guest_candidate)
                self.assertFalse(result.attendance.is_guest)
                self.assertEqual(result.attendance.status, "present")


class WorkshopMigrationTests(TestCase):
    def test_upgrade_preserves_existing_structure_and_attendance(self):
        path = Path(__file__).resolve().parents[1] / "alembic/versions/0043_workshop_structure_guests.py"
        spec = importlib.util.spec_from_file_location("workshop_migration", path)
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            for table in ("supervisor_workshops", "workshop_meeting_attendances"):
                connection.execute(text(f"CREATE TABLE {table} (id INTEGER PRIMARY KEY)"))
                connection.execute(text(f"INSERT INTO {table} (id) VALUES (1)"))
            with Operations.context(MigrationContext.configure(connection)):
                migration.upgrade()
                self.assertTrue(connection.scalar(text("SELECT show_in_structure FROM supervisor_workshops")))
                self.assertFalse(connection.scalar(text("SELECT is_guest FROM workshop_meeting_attendances")))
                migration.downgrade()
            for table in ("supervisor_workshops", "workshop_meeting_attendances"):
                self.assertEqual([column["name"] for column in inspect(connection).get_columns(table)], ["id"])
                self.assertEqual(connection.scalar(text(f"SELECT id FROM {table}")), 1)
        engine.dispose()
