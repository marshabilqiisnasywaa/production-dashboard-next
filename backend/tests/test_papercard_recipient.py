import unittest
from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import engine, get_db
from app.main import app
from app.models import Board, BoardMember, Employee, Line, PapercardSubmission, PapercardTemplate, Workshop


class PapercardRecipientTests(unittest.TestCase):
    def setUp(self):
        connection = engine.connect()
        transaction = connection.begin()
        self.addCleanup(connection.close)
        self.addCleanup(transaction.rollback)
        schema = "test_pc_recipient_" + uuid4().hex
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(connection)
        self.db = Session(connection, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)
        self.default = Employee(employee_no="SPV1", name="Supervisor Default", role="supervisor", dept="PROD", must_change_password=False)
        self.alternate = Employee(employee_no="SPV2", name="Supervisor Pengganti", role="supervisor", dept="PROD", must_change_password=False)
        self.other_dept = Employee(employee_no="SPV4", name="Supervisor PE", role="supervisor", dept="PE", must_change_password=False)
        self.inactive = Employee(employee_no="SPV3", name="Tidak Aktif", role="supervisor", is_active=False)
        self.member = Employee(employee_no="EMP", name="Pengisi", role="leader", dept="PROD", must_change_password=False)
        self.db.add_all([self.default, self.alternate, self.other_dept, self.inactive, self.member])
        self.db.flush()
        self.member.supervisor_id = self.default.id
        workshop = Workshop(name="Workshop")
        self.db.add(workshop)
        self.db.flush()
        self.workshop = workshop
        self.line = self.make_line("L1")
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        self.addCleanup(app.dependency_overrides.clear)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)
        self.day = datetime.now(ZoneInfo("Asia/Jakarta")).date().isoformat()

    def make_line(self, code):
        line = Line(workshop_id=self.workshop.id, name=code, code=code)
        self.db.add(line)
        self.db.flush()
        board = Board(line_id=line.id, slug=code.lower())
        self.db.add(board)
        self.db.flush()
        self.db.add_all([
            BoardMember(board_id=board.id, employee_id=self.member.id, sort_order=1),
            PapercardTemplate(workshop_id=self.workshop.id, line_id=line.id, department="PROD", name="Template", template_data={}),
        ])
        return line

    def headers(self, employee):
        return {"Authorization": "Bearer " + create_access_token(employee.id, "employee")}

    def submit(self, **extra):
        return self.client.post("/api/papercards/submissions", headers=self.headers(self.member), json={
            "lineId": self.line.id, "department": "PROD", "date": self.day, "shift": "Shift 1",
            "answers": [{"itemId": "q1", "status": "OK"}], **extra,
        })

    def overview(self, supervisor):
        response = self.client.get("/api/papercards/supervisor/overview", headers=self.headers(supervisor), params={"date": self.day})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["mySubordinates"]

    def approve(self, submission_id, employee, status="approved"):
        return self.client.post(f"/api/papercards/submissions/{submission_id}/approve", headers=self.headers(employee), json={"approvalStatus": status})

    def test_default_selection_and_active_options(self):
        response = self.client.get("/api/papercards/supervisors", headers=self.headers(self.member))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["defaultSupervisorId"], self.default.id)
        listed = {s["id"] for s in response.json()["supervisors"]}
        self.assertEqual(listed, {self.default.id, self.alternate.id})
        self.assertNotIn(self.other_dept.id, listed)
        created = self.submit()
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(created.json()["recipientSupervisorId"], self.default.id)
        self.assertEqual(created.json()["recipientSupervisorName"], self.default.name)

    def test_alternate_receives_card_and_only_recipient_can_approve(self):
        created = self.submit(recipientSupervisorId=self.alternate.id)
        self.assertEqual(created.status_code, 200, created.text)
        submission_id = created.json()["id"]
        self.assertEqual(self.member.supervisor_id, self.default.id)
        self.assertEqual(self.overview(self.default), [])
        received = self.overview(self.alternate)
        self.assertEqual(len(received), 1)
        self.assertEqual(received[0]["submission"]["id"], submission_id)
        self.assertFalse(received[0]["isMySubordinate"])
        for supervisor, expected in ((self.default, []), (self.alternate, [submission_id])):
            response = self.client.get("/api/papercards/submissions", headers=self.headers(supervisor))
            self.assertEqual([s["id"] for s in response.json()], expected)
        self.assertEqual(self.approve(submission_id, self.default).status_code, 403)
        self.assertEqual(self.approve(submission_id, self.member).status_code, 403)
        self.assertEqual(self.approve(submission_id, self.alternate).status_code, 200)

    def test_invalid_inactive_non_supervisor_and_self_recipient_rejected(self):
        for recipient_id in (999999, self.inactive.id, self.member.id):
            with self.subTest(recipient=recipient_id):
                self.assertEqual(self.submit(recipientSupervisorId=recipient_id).status_code, 400)
        self.assertEqual(list(self.db.scalars(select(PapercardSubmission))), [])

    def test_supervisor_from_other_dept_rejected(self):
        self.assertEqual(self.submit(recipientSupervisorId=self.other_dept.id).status_code, 400)
        self.assertEqual(list(self.db.scalars(select(PapercardSubmission))), [])

    def test_default_from_other_dept_requires_selection(self):
        self.member.supervisor_id = self.other_dept.id
        self.db.commit()
        listing = self.client.get("/api/papercards/supervisors", headers=self.headers(self.member)).json()
        self.assertIsNone(listing["defaultSupervisorId"])
        self.assertEqual(self.submit().status_code, 400)
        self.assertEqual(self.submit(recipientSupervisorId=self.alternate.id).status_code, 200)

    def test_no_default_requires_explicit_selection(self):
        self.member.supervisor_id = None
        self.db.commit()
        self.assertEqual(self.submit().status_code, 400)
        self.assertEqual(self.submit(recipientSupervisorId=self.alternate.id).status_code, 200)

    def test_recipient_persisted_when_profile_changes(self):
        created = self.submit()
        self.member.supervisor_id = self.alternate.id
        self.db.commit()
        self.assertEqual(self.overview(self.alternate), [])
        self.assertEqual(self.overview(self.default)[0]["submission"]["id"], created.json()["id"])
        again = self.submit()
        self.assertEqual(again.json()["recipientSupervisorId"], self.default.id)

    def test_rejected_revision_can_change_recipient_but_approved_card_is_locked(self):
        created = self.submit()
        submission_id = created.json()["id"]
        self.assertEqual(self.approve(submission_id, self.default, "rejected").status_code, 200)
        revised = self.submit(recipientSupervisorId=self.alternate.id)
        self.assertEqual(revised.status_code, 200, revised.text)
        self.assertEqual((revised.json()["id"], revised.json()["approvalStatus"]), (submission_id, "pending"))
        self.assertEqual(self.approve(submission_id, self.alternate).status_code, 200)
        self.assertEqual(self.submit(recipientSupervisorId=self.default.id).status_code, 400)

    def test_legacy_submission_uses_default_supervisor(self):
        created = self.submit()
        submission = self.db.get(PapercardSubmission, created.json()["id"])
        submission.recipient_supervisor_id = None
        self.db.commit()
        self.assertEqual(self.overview(self.default)[0]["submission"]["id"], submission.id)
        self.assertEqual(self.approve(submission.id, self.alternate).status_code, 403)
        self.assertEqual(self.approve(submission.id, self.default).status_code, 200)

    def test_recipient_overview_keeps_multiple_lines(self):
        second = self.make_line("L2")
        self.db.commit()
        self.assertEqual(self.submit(recipientSupervisorId=self.alternate.id).status_code, 200)
        self.assertEqual(self.submit(lineId=second.id, recipientSupervisorId=self.alternate.id).status_code, 200)
        received = self.overview(self.alternate)
        self.assertEqual({item["lineId"] for item in received}, {self.line.id, second.id})

    def test_member_cannot_open_supervisor_overview(self):
        self.assertEqual(self.client.get("/api/papercards/supervisor/overview", headers=self.headers(self.member)).status_code, 403)
