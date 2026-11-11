import importlib.util
import unittest
from datetime import date, datetime, timezone
from unittest.mock import patch
from uuid import uuid4
from pathlib import Path

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine, get_db
from app.main import app
from app.models import DmGroup, Employee, HistoricalEntry, HistoryImportBatch, LeaderAssignment, Line, PapercardSubmission, PapercardTemplate, SqdipEntry, Workshop
from app.schemas import SqdipRowIn
from app.schemas_history_import import HistoryImportIn
from app.services.history_import import commit_import
from app.services.leader_assignments import change_line_dm
from app.services.scorecard import scorecard_entries
from app.services.sqdip import upsert_rows


class ScorecardIdentityTests(unittest.TestCase):
    def setUp(self):
        connection = engine.connect()
        transaction = connection.begin()
        self.addCleanup(connection.close)
        self.addCleanup(transaction.rollback)
        schema = "test_scorecard_" + uuid4().hex
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(connection)
        self.connection = connection
        self.db = Session(connection, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)
        self.db.add_all([
            Workshop(id=1, name="Workshop 1"),
            Employee(id=1, employee_no="A", name="Budi", role="leader"),
            Employee(id=2, employee_no="B", name="Andi", role="leader"),
            Employee(id=9, employee_no="ADM", name="Admin", role="superadmin"),
        ])
        self.db.flush()
        self.db.add_all([DmGroup(id=1, workshop_id=1, name="DM A"), DmGroup(id=2, workshop_id=1, name="DM B")])
        self.db.flush()
        self.db.add_all([Line(id=i, workshop_id=1, dm_group_id=1, code=f"L{i}", name=f"Line {i}") for i in (1, 2)])
        self.db.flush()
        for i in (1, 2):
            self.db.add(PapercardTemplate(id=i, workshop_id=1, line_id=i, department="PROD", name="Daily"))
        self.assign(1, 1, 1, 8)
        self.assign(2, 1, 8)
        self.assign(1, 2, 8)
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        self.addCleanup(app.dependency_overrides.clear)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def assign(self, employee, line, start, end=None, dm=1):
        self.db.add(LeaderAssignment(
            employee_id=employee, kind="line_leader", line_id=line, dm_group_id=dm,
            leader_name_snapshot="Budi" if employee == 1 else "Andi", line_code_snapshot=f"L{line}",
            dm_name_snapshot="DM A" if dm == 1 else "DM B", created_by_employee_id=9,
            started_at=datetime(2026, 9, start, tzinfo=timezone.utc),
            ended_at=datetime(2026, 9, end, tzinfo=timezone.utc) if end else None,
        ))

    def entries(self, first=1, last=12):
        self.db.flush()
        return scorecard_entries(self.db, date(2026, 9, first), date(2026, 9, last), date(2026, 10, 1))

    def submit(self, day, employee, line=1):
        self.db.add(PapercardSubmission(
            template_id=line, line_id=line, employee_id=employee, department="PROD", date=date(2026, 9, day),
            submitted_at=datetime(2026, 9, day, 0, 30, tzinfo=timezone.utc), answers=[],
        ))

    def test_weekly_transfer_partitions_all_live_days_without_duplicates(self):
        self.submit(7, 1)
        self.submit(8, 2)
        entries = self.entries()
        old = next(e for e in entries if e.info.line_id == 1 and e.info.leader_id == 1)
        replacement = next(e for e in entries if e.info.line_id == 1 and e.info.leader_id == 2)
        moved = next(e for e in entries if e.info.line_id == 2 and e.info.leader_id == 1)
        self.assertEqual(max(d.date for d in old.papercard), date(2026, 9, 7))
        self.assertEqual(min(d.date for d in replacement.papercard), date(2026, 9, 8))
        self.assertTrue(all(d.date >= date(2026, 9, 8) for d in moved.standup))
        days = [d.date for e in (old, replacement) for d in e.papercard]
        self.assertEqual(len(days), len(set(days)))
        self.assertEqual(next(d.total for d in old.papercard if d.date.day == 7), 8)

    def test_retirement_and_role_change_preserve_historical_scores(self):
        before = [e.model_dump() for e in self.entries()]
        employee = self.db.get(Employee, 1)
        employee.is_active = False
        employee.role = "member"
        self.assertEqual([e.model_dump() for e in self.entries()], before)

    def test_historical_range_does_not_show_future_replacement(self):
        entries = self.entries(last=7)
        self.assertEqual({(e.info.leader_id, e.info.line_id) for e in entries}, {(1, 1)})

    def test_sqdip_keeps_multiple_leaders_on_same_date_and_unknown_line(self):
        for leader, employee, code in (("Budi", 1, "L1"), ("Andi", 2, "L1"), ("Archived", None, "OLD")):
            self.db.add(SqdipEntry(date=date(2026, 9, 7), line_code=code, leader_name=leader,
                                   leader_employee_id=employee, dimension="Safety", actual=0, points=6))
        entries = self.entries()
        self.assertEqual(sum(len(e.sqdip) for e in entries), 3)
        self.assertTrue(any(e.info.line_code == "OLD" and e.info.leader_name == "Archived" for e in entries))
        self.assertTrue(any(e.info.leader_id == 2 and e.sqdip and e.info.dm_name == "Perlu verifikasi DM" for e in entries))

    def test_september_sqdip_joins_historical_dm_before_assignment_history(self):
        for assignment in self.db.query(LeaderAssignment):
            assignment.started_at = datetime(2026, 11, 1, tzinfo=timezone.utc)
            if assignment.ended_at is not None:
                assignment.ended_at = datetime(2026, 11, 8, tzinfo=timezone.utc)
        self.db.flush()
        batch = HistoryImportBatch(file_name="september.xlsx", imported_by="Admin", added=1, updated=0, skipped=0)
        self.db.add(batch)
        self.db.flush()
        self.db.add(HistoricalEntry(batch_id=batch.id, line_id=1, date=date(2026, 9, 7), shift="Shift 1",
            kind="papercard_kpi", leader_name="BUDI", source_line="L1", source_dm="DM A",
            source_sheet="Score", source_row=1, data={"scores": [8, 14, 8], "leaderEmployeeId": 1}))
        self.db.add(SqdipEntry(date=date(2026, 9, 7), line_code="L1", leader_name="Budi",
                              leader_employee_id=1, dimension="Safety", actual=0, points=6))
        rows = [e for e in self.entries(last=7) if e.info.leader_id == 1 and e.info.line_id == 1]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].info.dm_name, "DM A")
        self.assertEqual(rows[0].before, 30)
        self.assertEqual(rows[0].after, 6)

    def test_conflicting_historical_dm_does_not_assign_sqdip_to_current_dm(self):
        batch = HistoryImportBatch(file_name="old.xlsx", imported_by="Admin", added=2, updated=0, skipped=0)
        self.db.add(batch)
        self.db.flush()
        for kind, dm in (("papercard_kpi", "Old DM 1"), ("standup_kpi", "Old DM 2")):
            self.db.add(HistoricalEntry(batch_id=batch.id, line_id=1, date=date(2026, 9, 7), shift="Shift 1",
                kind=kind, leader_name="Andi", source_line="L1", source_dm=dm, source_sheet="Score",
                source_row=1, data={"scores": [8, 10, 8], "leaderEmployeeId": 2}))
        self.db.add(SqdipEntry(date=date(2026, 9, 7), line_code="L1", leader_name="Andi",
                              leader_employee_id=2, dimension="Safety", actual=0, points=6))
        row = next(e for e in self.entries(last=7) if e.sqdip)
        self.assertEqual(row.info.dm_name, "Perlu verifikasi DM")
        self.assertEqual(row.after, 6)

    def test_imported_identity_survives_rename_and_retirement(self):
        row = SqdipRowIn(date=date(2026, 9, 7), line="L1", leader="Budi", cells=[{"actual": 0, "points": 6}] * 5)
        upsert_rows(self.db, [row], "test.xlsx")
        employee = self.db.get(Employee, 1)
        employee.name = "New name"
        employee.is_active = False
        archived = next(e for e in self.entries() if e.info.line_id == 1 and e.info.leader_id == 1)
        self.assertEqual(archived.info.leader_name, "Budi")
        self.assertEqual(archived.after, 30)

    def test_import_source_dm_is_preserved(self):
        batch = HistoryImportBatch(file_name="old.xlsx", imported_by="Admin", added=1, updated=0, skipped=0)
        self.db.add(batch)
        self.db.flush()
        self.db.add(HistoricalEntry(batch_id=batch.id, line_id=1, date=date(2026, 9, 7), shift="Shift 1",
            kind="papercard_kpi", leader_name="Retired leader", source_line="L1", source_dm="Old DM",
            source_sheet="Score", source_row=1, data={"scores": [8, 14, 8]}))
        archived = next(e for e in self.entries() if e.info.leader_name == "Retired leader")
        self.assertEqual(archived.info.dm_name, "Old DM")
        self.assertEqual(archived.before, 30)

    def test_history_import_binds_id_and_replacement_does_not_reuse_old_id(self):
        payload = {
            "file_name": "old.xlsx", "mode": "replace", "from_date": "2026-09-07", "to_date": "2026-09-07",
            "rows": [{"kind": "papercard_kpi", "date": "2026-09-07", "line": "L1", "leader": "Budi",
                      "dm": "DM A", "source_sheet": "Score", "source_row": 1, "scores": [8, 14, 8]}],
        }
        commit_import(self.db, HistoryImportIn.model_validate(payload), "Admin")
        entry = self.db.query(HistoricalEntry).one()
        self.assertEqual(entry.data["leaderEmployeeId"], 1)
        payload["rows"][0]["leader"] = "Unknown historical leader"
        commit_import(self.db, HistoryImportIn.model_validate(payload), "Admin")
        self.assertNotIn("leaderEmployeeId", entry.data)

    def test_dm_transfer_preserves_old_assignment_snapshot(self):
        line = self.db.get(Line, 1)
        old = next(a for a in self.db.query(LeaderAssignment).all() if a.employee_id == 2)
        with patch("app.services.leader_assignments.datetime") as clock:
            clock.now.return_value = datetime(2026, 9, 10, tzinfo=timezone.utc)
            change_line_dm(self.db, line, self.db.get(DmGroup, 2), self.db.get(Employee, 9))
        entries = [e for e in self.entries() if e.info.leader_id == 2]
        self.assertEqual({e.info.dm_name for e in entries}, {"DM A", "DM B"})
        self.assertEqual(old.dm_name_snapshot, "DM A")
        self.assertEqual(old.ended_at.day, 10)

    def test_release_during_day_retains_that_days_leader(self):
        assignment = next(a for a in self.db.query(LeaderAssignment).all() if a.employee_id == 2)
        assignment.ended_at = datetime(2026, 9, 10, 10, tzinfo=timezone.utc)
        rows = [e for e in self.entries() if e.info.leader_id == 2]
        self.assertEqual(max(d.date for e in rows for d in e.papercard), date(2026, 9, 10))

    def test_dm_removal_keeps_line_leader_and_previous_dm(self):
        with patch("app.services.leader_assignments.datetime") as clock:
            clock.now.return_value = datetime(2026, 9, 10, tzinfo=timezone.utc)
            change_line_dm(self.db, self.db.get(Line, 1), None, self.db.get(Employee, 9))
        entries = [e for e in self.entries() if e.info.leader_id == 2]
        self.assertEqual({e.info.dm_name for e in entries}, {"DM A", "Tanpa DM"})

    def test_endpoint_serializes_scoped_days(self):
        response = self.client.get("/api/public/scorecard/entries?from=2026-09-01&to=2026-09-12")
        self.assertEqual(response.status_code, 200, response.text)
        keys = [row["key"] for row in response.json()]
        self.assertEqual(len(keys), len(set(keys)))

    def test_migration_backfills_existing_identity(self):
        self.db.add(SqdipEntry(date=date(2026, 9, 7), line_code="L1", leader_name="Budi", dimension="Safety", points=6))
        self.db.commit()
        self.connection.execute(text("ALTER TABLE sqdip_entries DROP COLUMN leader_employee_id"))
        self.connection.execute(text("ALTER TABLE leader_assignments DROP COLUMN leader_name_snapshot"))
        spec = importlib.util.spec_from_file_location("scorecard_migration", Path(__file__).parents[1] / "alembic/versions/0041_scorecard_identity.py")
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        with Operations.context(MigrationContext.configure(self.connection)):
            migration.upgrade()
        self.assertEqual(self.connection.execute(text("SELECT leader_employee_id FROM sqdip_entries")).scalar(), 1)
