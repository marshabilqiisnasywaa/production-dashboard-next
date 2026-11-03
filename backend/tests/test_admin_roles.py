import unittest
from unittest.mock import MagicMock
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.admin import (
    create_employee,
    delete_employee,
    list_roles,
    reset_employee_password,
    update_employee,
)
from app.api.auth import change_password, login
from app.api.deps import Principal, get_active_principal, get_current_admin, get_principal
from app.core.security import create_access_token, hash_password, verify_password
from app.db.base import Base
from app.db.session import engine
from app.models import Employee
from app.schemas import ChangePasswordIn, EmployeeIn, EmployeeUpdate, LoginIn


class AdminRoleTests(unittest.TestCase):
    def setUp(self):
        connection = engine.connect()
        transaction = connection.begin()
        self.addCleanup(connection.close)
        self.addCleanup(transaction.rollback)
        schema = "test_admin_roles_" + uuid4().hex
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(connection)
        self.db = Session(connection, autoflush=False, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)
        self.superadmin = Employee(
            employee_no="root", name="Root", role="superadmin",
            password_hash=hash_password("root-password"), must_change_password=False,
        )
        self.db.add(self.superadmin)
        self.db.commit()
        self.admin = self.make("ADM1", "admin")

    def make(self, nik, role, actor=None, dept=None):
        created = create_employee(
            EmployeeIn(employee_id=nik, name=f"Nama {nik}", role=role, dept=dept), self.db, actor or self.superadmin
        )
        return self.db.get(Employee, created.id)

    def request(self):
        request = MagicMock(spec=Request)
        request.client = None
        return request

    def status_of(self, call):
        with self.assertRaises(HTTPException) as caught:
            call()
        return caught.exception.status_code

    def test_created_admin_is_an_employee_with_name_dept_and_forced_password_change(self):
        admin = self.make("ADM2", "admin", dept="PE")
        self.assertEqual((admin.role, admin.dept, admin.name), ("admin", "PE", "Nama ADM2"))
        self.assertTrue(admin.must_change_password)
        self.assertTrue(verify_password("ADM2", admin.password_hash))

    def test_only_superadmin_can_create_superadmin(self):
        self.assertEqual(self.status_of(lambda: self.make("ROOT2", "superadmin", actor=self.admin)), 403)
        created = self.make("ROOT2", "superadmin", actor=self.superadmin)
        self.assertEqual((created.role, created.must_change_password), ("superadmin", True))

    def test_admin_can_create_admin_and_hod(self):
        self.assertEqual(self.make("ADM3", "admin", actor=self.admin).role, "admin")
        self.assertEqual(self.make("HOD9", "hod", actor=self.admin, dept="QC").role, "hod")

    def test_admin_cannot_touch_superadmin(self):
        self.assertEqual(self.status_of(lambda: update_employee(self.superadmin.id, EmployeeUpdate(is_active=False), self.db, self.admin)), 403)
        self.assertEqual(self.status_of(lambda: reset_employee_password(self.superadmin.id, None, self.db, self.admin)), 403)
        self.assertEqual(self.status_of(lambda: delete_employee(self.superadmin.id, self.db, self.admin)), 403)
        member = self.make("MEM1", "member")
        self.assertEqual(self.status_of(lambda: update_employee(member.id, EmployeeUpdate(role="superadmin"), self.db, self.admin)), 403)
        self.assertTrue(verify_password("root-password", self.superadmin.password_hash))

    def test_superadmin_can_manage_other_superadmin(self):
        other = self.make("ROOT2", "superadmin")
        update_employee(other.id, EmployeeUpdate(is_active=False), self.db, self.superadmin)
        self.assertFalse(other.is_active)
        reset_employee_password(other.id, None, self.db, self.superadmin)
        self.assertTrue(other.must_change_password)

    def test_nobody_can_remove_themselves(self):
        for actor in (self.admin, self.superadmin):
            with self.subTest(actor=actor.employee_no):
                self.assertEqual(self.status_of(lambda: update_employee(actor.id, EmployeeUpdate(is_active=False), self.db, actor)), 400)
                self.assertEqual(self.status_of(lambda: update_employee(actor.id, EmployeeUpdate(role="member"), self.db, actor)), 400)
                self.assertEqual(self.status_of(lambda: delete_employee(actor.id, self.db, actor)), 400)

    def test_role_list_hides_superadmin_from_admin(self):
        self.assertNotIn("superadmin", [role.value for role in list_roles(self.admin)])
        self.assertIn("admin", [role.value for role in list_roles(self.admin)])
        self.assertIn("superadmin", [role.value for role in list_roles(self.superadmin)])

    def test_first_login_blocks_admin_until_password_changed(self):
        token = login(LoginIn(username="ADM1", password="ADM1"), self.request(), self.db)
        self.assertEqual((token.kind, token.role, token.must_change_password), ("admin", "admin", True))
        self.assertEqual(token.home, "/dm-dashboard/admin")

        self.assertEqual(self.status_of(lambda: get_current_admin(Principal(employee=self.admin))), 403)
        self.assertEqual(self.status_of(lambda: get_active_principal(Principal(employee=self.admin))), 403)

        change_password(ChangePasswordIn(current_password="ADM1", new_password="my-own-password-1"), Principal(employee=self.admin), self.db)
        self.assertFalse(self.admin.must_change_password)
        self.assertIs(get_current_admin(Principal(employee=self.admin)), self.admin)
        again = login(LoginIn(username="ADM1", password="my-own-password-1"), self.request(), self.db)
        self.assertFalse(again.must_change_password)

    def test_non_admin_is_not_admin(self):
        member = self.make("MEM1", "member")
        member.must_change_password = False
        self.assertFalse(Principal(employee=member).is_admin)
        self.assertEqual(self.status_of(lambda: get_current_admin(Principal(employee=member))), 403)

    def test_legacy_admin_token_kind_is_rejected(self):
        creds = MagicMock()
        creds.credentials = create_access_token(self.superadmin.id, "admin")
        self.assertEqual(self.status_of(lambda: get_principal(MagicMock(spec=Request), creds, self.db)), 401)

    def test_http_flow(self):
        from fastapi.testclient import TestClient

        from app.db.session import get_db
        from app.main import app

        app.dependency_overrides[get_db] = lambda: self.db
        self.addCleanup(app.dependency_overrides.clear)
        client = TestClient(app)

        root = {"Authorization": "Bearer " + create_access_token(self.superadmin.id, "employee")}
        created = client.post(
            "/api/admin/employees",
            json={"employeeId": "ADM9", "name": "Admin Sembilan", "role": "admin", "dept": "PROD", "workPhone": "0812"},
            headers=root,
        )
        self.assertEqual((created.status_code, created.json()["role"], created.json()["dept"]), (201, "admin", "PROD"))

        logged = client.post("/api/auth/login", json={"username": "ADM9", "password": "ADM9"}).json()
        self.assertEqual((logged["kind"], logged["role"], logged["mustChangePassword"]), ("admin", "admin", True))
        ops = {"Authorization": "Bearer " + logged["accessToken"]}

        me = client.get("/api/auth/me", headers=ops).json()
        self.assertEqual((me["kind"], me["name"], me["mustChangePassword"]), ("admin", "Admin Sembilan", True))
        self.assertEqual(client.get("/api/admin/employees", headers=ops).status_code, 403)

        changed = client.post("/api/auth/change-password", json={"currentPassword": "ADM9", "newPassword": "my-own-password-1"}, headers=ops)
        self.assertEqual(changed.status_code, 204)
        self.assertEqual(client.get("/api/admin/employees", headers=ops).status_code, 200)
        roles = [role["value"] for role in client.get("/api/admin/roles", headers=ops).json()]
        self.assertIn("admin", roles)
        self.assertNotIn("superadmin", roles)

        hod = client.post("/api/admin/employees", json={"employeeId": "HOD77", "name": "HOD Quality", "role": "hod", "dept": "QC"}, headers=ops)
        self.assertEqual(hod.status_code, 201)
        denied = client.patch(f"/api/admin/employees/{self.superadmin.id}", json={"isActive": False}, headers=ops)
        self.assertEqual(denied.status_code, 403)
        sneaky = client.post("/api/admin/employees", json={"employeeId": "ROOT9", "name": "Sneaky", "role": "superadmin"}, headers=ops)
        self.assertEqual(sneaky.status_code, 403)

    def test_problem_rows_get_pic_department(self):
        from types import SimpleNamespace

        from app.services.problem_access import with_pic_dept

        budi = Employee(employee_no="ME1", name="Budi", role="member", dept="ME")
        siti = Employee(employee_no="QC1", name="Siti Rahma", role="member", dept="QC")
        self.db.add_all([budi, siti])
        self.db.commit()
        rows = [
            SimpleNamespace(pic_id=budi.id, pic_name="Budi", pic_dept=None),
            SimpleNamespace(pic_id=None, pic_name="  siti rahma ", pic_dept=None),
            SimpleNamespace(pic_id=None, pic_name="Tidak Ada", pic_dept=None),
        ]
        with_pic_dept(self.db, rows)
        self.assertEqual([row.pic_dept for row in rows], ["ME", "QC", None])


if __name__ == "__main__":
    unittest.main()
