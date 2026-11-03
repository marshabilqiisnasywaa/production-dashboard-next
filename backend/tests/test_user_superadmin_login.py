import unittest
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.base import Base
from app.db.session import engine, get_db
from app.main import app
from app.models import Board, DmGroup, Employee, LeaderAssignment, Line, User, Workshop


class UserSuperadminLoginTests(unittest.TestCase):
    def setUp(self):
        connection = engine.connect()
        transaction = connection.begin()
        self.addCleanup(connection.close)
        self.addCleanup(transaction.rollback)
        schema = "test_user_login_" + uuid4().hex
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(connection)
        self.db = Session(connection, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)
        self.user = User(username="root-" + uuid4().hex[:8], role="superadmin",
                         password_hash=hash_password("root-password-123"), must_change_password=False)
        self.db.add(self.user)
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        self.addCleanup(app.dependency_overrides.clear)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def login(self, username=None, password="root-password-123"):
        return self.client.post("/api/auth/login", json={"username": username or self.user.username, "password": password})

    def headers(self):
        logged = self.login()
        self.assertEqual(logged.status_code, 200)
        return {"Authorization": "Bearer " + logged.json()["accessToken"]}

    def test_login_and_admin_access_with_no_employees(self):
        headers = self.headers()
        token = headers["Authorization"].split()[1]
        self.assertEqual(decode_access_token(token), ("user", self.user.id))
        me = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me.status_code, 200)
        self.assertEqual((me.json()["username"], me.json()["role"], me.json()["kind"]),
                         (self.user.username, "superadmin", "admin"))
        self.assertEqual(me.json()["lines"], [])
        self.assertEqual(self.client.get("/api/admin/employees", headers=headers).json(), [])
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Employee)), 0)

    def test_employee_login_still_works(self):
        employee = Employee(employee_no="EMP-" + uuid4().hex[:8], name="Employee", role="member",
                            password_hash=hash_password("employee-password"), must_change_password=False)
        self.db.add(employee)
        self.db.commit()
        response = self.login(employee.employee_no, "employee-password")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(decode_access_token(response.json()["accessToken"]), ("employee", employee.id))
        headers = {"Authorization": "Bearer " + response.json()["accessToken"]}
        self.assertEqual(self.client.get("/api/auth/me", headers=headers).json()["name"], "Employee")
        self.assertEqual(self.client.get("/api/admin/employees", headers=headers).status_code, 403)

    def test_wrong_password_or_inactive_user_is_rejected(self):
        self.assertEqual(self.login(password="wrong-password").status_code, 401)
        self.user.is_active = False
        self.db.commit()
        self.assertEqual(self.login().status_code, 401)

    def test_user_table_only_accepts_superadmin(self):
        self.user.role = "admin"
        self.db.commit()
        self.assertEqual(self.login().status_code, 401)
        headers = {"Authorization": "Bearer " + create_access_token(self.user.id, "user")}
        self.assertEqual(self.client.get("/api/auth/me", headers=headers).status_code, 401)

    def test_same_username_uses_users_credentials_only(self):
        self.db.add(Employee(employee_no=self.user.username, name="Duplicate", role="superadmin",
                             password_hash=hash_password("different-password"), must_change_password=False))
        self.db.commit()
        self.assertEqual(self.login(password="different-password").status_code, 401)
        self.assertEqual(self.login().status_code, 200)
        self.user.is_active = False
        self.db.commit()
        self.assertEqual(self.login(password="different-password").status_code, 401)

    def test_password_change_updates_users_and_unlocks_admin_access(self):
        self.user.must_change_password = True
        self.db.commit()
        headers = self.headers()
        self.assertEqual(self.client.get("/api/auth/me", headers=headers).status_code, 200)
        self.assertEqual(self.client.get("/api/admin/employees", headers=headers).status_code, 403)
        changed = self.client.post("/api/auth/change-password", headers=headers,
                                   json={"currentPassword": "root-password-123", "newPassword": "changed-password-123"})
        self.assertEqual(changed.status_code, 204)
        self.assertTrue(verify_password("changed-password-123", self.user.password_hash))
        self.assertFalse(self.user.must_change_password)
        self.assertEqual(self.client.get("/api/admin/employees", headers=headers).status_code, 200)
        self.assertEqual(self.login().status_code, 401)
        self.assertEqual(self.login(password="changed-password-123").status_code, 200)

    def test_token_ids_cannot_cross_account_tables(self):
        headers = {"Authorization": "Bearer " + create_access_token(self.user.id, "employee")}
        self.assertEqual(self.client.get("/api/auth/me", headers=headers).status_code, 401)
        headers = self.headers()
        self.user.is_active = False
        self.db.commit()
        self.assertEqual(self.client.get("/api/auth/me", headers=headers).status_code, 401)

    def test_user_cannot_submit_as_arbitrary_employee(self):
        response = self.client.post("/api/papercards/submissions", headers=self.headers(), json={
            "lineId": 1, "department": "PROD", "date": "2026-11-03", "shift": "Shift 1", "answers": [],
        })
        self.assertEqual(response.status_code, 403, response.text)

    def test_user_can_manage_employee_with_same_numeric_id(self):
        employee = Employee(id=self.user.id, employee_no="OTHER", name="Other", role="member")
        self.db.add(employee)
        self.db.commit()
        response = self.client.patch(f"/api/admin/employees/{employee.id}", headers=self.headers(), json={"isActive": False})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(employee.is_active)
        self.assertTrue(self.user.is_active)

    def test_assignment_audit_keeps_user_identity_separate(self):
        employee = Employee(id=self.user.id, employee_no="LEADER", name="Leader", role="leader", dept="PROD")
        workshop = Workshop(name="Test Workshop")
        self.db.add_all([employee, workshop])
        self.db.flush()
        group = DmGroup(workshop_id=workshop.id, name="DM A")
        self.db.add(group)
        self.db.flush()
        line = Line(workshop_id=workshop.id, dm_group_id=group.id, code="TEST", name="Test")
        self.db.add(line)
        self.db.flush()
        self.db.add(Board(line_id=line.id, slug="test-line"))
        self.db.commit()
        response = self.client.post("/api/admin/leader-assignments", headers=self.headers(), json={
            "employee_id": employee.id, "kind": "line_leader", "dm_group_id": group.id,
            "line_id": line.id, "started_at": "2026-11-03T08:00:00+07:00",
        })
        self.assertEqual(response.status_code, 201, response.text)
        assignment = self.db.get(LeaderAssignment, response.json()["id"])
        self.assertEqual(assignment.created_by_user_id, self.user.id)
        self.assertIsNone(assignment.created_by_employee_id)
        self.assertEqual(self.client.get("/api/admin/leader-assignments/active", headers=self.headers(),
                                         params={"dm_group_id": group.id}).status_code, 200)
