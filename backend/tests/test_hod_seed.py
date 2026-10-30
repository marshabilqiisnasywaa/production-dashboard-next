import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException, Request
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app import seed, seed_hod
from app.api.admin import create_employee, list_employees, list_roles, update_employee
from app.api.auth import login
from app.core.security import hash_password, verify_password
from app.db.base import Base
from app.db.session import engine
from app.models import Employee, User, Workshop
from app.schemas import EmployeeIn, EmployeeUpdate, LoginIn


class HodSeedTests(unittest.TestCase):
    def setUp(self):
        connection = engine.connect()
        transaction = connection.begin()
        self.addCleanup(connection.close)
        self.addCleanup(transaction.rollback)
        schema = "test_hod_seed_" + uuid4().hex
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(connection)
        self.db = Session(connection, autoflush=False, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)

    def seed(self, password="hod-password-123"):
        with patch.multiple(seed_hod, HOD_USERNAME="HOD001", HOD_NAME="Nama HOD", HOD_PASSWORD=password), patch.object(seed_hod, "SessionLocal", return_value=self.db):
            with patch.object(self.db, "close"):
                seed_hod.main()

    def seed_admin(self, password="admin-password-123"):
        with patch.multiple(seed, ADMIN_USERNAME="admin", ADMIN_PASSWORD=password), patch.object(seed, "SessionLocal", return_value=self.db):
            with patch.object(self.db, "close"):
                seed.main()

    def test_admin_seed_login_and_reset_keep_existing_workshops(self):
        self.seed_admin()
        admin = self.db.scalar(select(User).where(User.username == "admin"))
        original_id = admin.id
        request = Request({"type": "http", "client": ("127.0.0.1", 1234)})
        token = login(LoginIn(username="admin", password="admin-password-123"), request, self.db)
        self.assertEqual(token.kind, "admin")
        self.assertEqual(token.role, "superadmin")
        self.assertEqual(list(self.db.scalars(select(Workshop.id))), [])
        workshop = Workshop(name="Workshop manual")
        self.db.add(workshop)
        self.db.commit()
        workshop_ids = [workshop.id]
        admin.is_active = False
        self.db.commit()
        self.seed_admin("updated-admin-password")
        self.assertEqual(admin.id, original_id)
        self.assertTrue(admin.is_active)
        self.assertTrue(verify_password("updated-admin-password", admin.password_hash))
        self.assertFalse(verify_password("admin-password-123", admin.password_hash))
        self.assertEqual(list(self.db.scalars(select(Workshop.id).order_by(Workshop.id))), workshop_ids)

    def test_admin_seed_refuses_employee_username(self):
        self.db.add(Employee(employee_no="admin", name="Existing HOD", role="hod"))
        self.db.commit()
        with self.assertRaises(SystemExit):
            self.seed_admin()
        self.assertIsNone(self.db.scalar(select(User.id).where(User.username == "admin")))

    def test_admin_seed_rejects_invalid_credentials(self):
        for username, password in ((" ", "password-123"), ("x" * 65, "password-123"), ("admin", "short"), ("admin", "x" * 129)):
            with self.subTest(username=username), patch.multiple(seed, ADMIN_USERNAME=username, ADMIN_PASSWORD=password):
                with self.assertRaises(SystemExit):
                    seed.read_credentials()

    def test_seed_login_and_reset_preserve_hod_identity(self):
        self.seed()
        hod = self.db.scalar(select(Employee).where(Employee.employee_no == "HOD001"))
        original_id = hod.id
        self.assertTrue(verify_password("hod-password-123", hod.password_hash))
        request = Request({"type": "http", "client": ("127.0.0.1", 1234)})
        token = login(LoginIn(username="HOD001", password="hod-password-123"), request, self.db)
        self.assertEqual(token.role, "hod")
        self.assertEqual(token.kind, "employee")
        self.assertEqual(token.home, "/dm-dashboard/hod")
        self.assertFalse(token.must_change_password)
        hod.is_active = False
        self.db.commit()
        self.seed("updated-password-123")
        self.assertEqual(hod.id, original_id)
        self.assertTrue(hod.is_active)
        self.assertTrue(verify_password("updated-password-123", hod.password_hash))
        self.assertFalse(verify_password("hod-password-123", hod.password_hash))

    def test_seed_refuses_existing_employee_or_admin(self):
        employee = Employee(employee_no="HOD001", name="Member", role="member")
        self.db.add(employee)
        self.db.commit()
        with self.assertRaises(SystemExit):
            self.seed()
        self.assertEqual(employee.role, "member")
        self.db.delete(employee)
        self.db.add(User(username="HOD001", password_hash=hash_password("admin-password")))
        self.db.commit()
        with self.assertRaises(SystemExit):
            self.seed()

    def test_admin_cannot_create_or_promote_hod(self):
        with self.assertRaises(HTTPException) as created:
            create_employee(EmployeeIn(employee_id="HOD001", name="HOD", role="hod"), self.db)
        self.assertEqual(created.exception.status_code, 403)
        employee = Employee(employee_no="MEM001", name="Member", role="member")
        self.db.add(employee)
        self.db.commit()
        with self.assertRaises(HTTPException) as promoted:
            update_employee(employee.id, EmployeeUpdate(role="hod"), self.db)
        self.assertEqual(promoted.exception.status_code, 403)
        self.assertEqual(employee.role, "member")

    def test_hod_is_excluded_from_admin_lists(self):
        self.seed()
        self.db.add(Employee(employee_no="MEM001", name="Member", role="member"))
        self.db.commit()
        self.assertEqual([employee.employee_id for employee in list_employees(self.db)], ["MEM001"])
        self.assertNotIn("hod", [role.value for role in list_roles()])

    def test_invalid_credentials_are_rejected_before_database_changes(self):
        for username, name, password in (
            (" ", "HOD", "password-123"),
            ("HOD001", " ", "password-123"),
            ("HOD001", "HOD", "short"),
            ("HOD00001", "HOD", "HOD00001"),
        ):
            with self.subTest(username=username, name=name), patch.multiple(seed_hod, HOD_USERNAME=username, HOD_NAME=name, HOD_PASSWORD=password):
                with self.assertRaises(SystemExit):
                    seed_hod.read_credentials()
