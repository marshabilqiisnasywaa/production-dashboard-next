from datetime import date, datetime, timezone
import unittest
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.api.admin import delete_line
from app.api.dm_groups import delete_dm_group
from app.db.base import Base
from app.db.session import engine
from app.models import Board, DmGroup, Employee, HistoricalEntry, Line, Workshop
from app.models.fivewhy import FiveWhyDocument
from app.models.history_import import HistoryImportBatch
from app.models.leader_assignment import LeaderAssignment


class DeleteLineKeepsHistoryTests(unittest.TestCase):
    def setUp(self):
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)
        schema = "test_line_delete_" + uuid4().hex
        self.connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        self.connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(self.connection)
        self.db = Session(self.connection, autoflush=False, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)
        self.leader = Employee(employee_no="L1", name="Leader", role="leader", must_change_password=False)
        workshop = Workshop(name="Test Workshop")
        self.db.add_all([self.leader, workshop])
        self.db.flush()
        self.line = Line(workshop_id=workshop.id, code="DEL0", name="Line Del")
        self.db.add(self.line)
        self.db.flush()
        self.db.add(Board(line_id=self.line.id, slug="del-0"))
        self.db.commit()

    def test_leader_history_imported_history_and_fivewhy_survive(self):
        started = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.db.add(LeaderAssignment(
            employee_id=self.leader.id, kind="line_leader", line_id=self.line.id,
            dm_name_snapshot="DM", line_code_snapshot="DEL0", started_at=started,
            created_by_employee_id=self.leader.id,
        ))
        batch = HistoryImportBatch(file_name="x.xlsx", imported_by="t", added=1, updated=0, skipped=0)
        self.db.add(batch)
        self.db.flush()
        self.db.add(HistoricalEntry(
            batch_id=batch.id, kind="papercard_status", line_id=self.line.id, date=date(2026, 1, 2),
            shift="Shift 1", leader_name="L", source_line="DEL0", source_sheet="s", source_row=1, data={},
        ))
        self.db.add(FiveWhyDocument(
            id=str(uuid4()), line_id=self.line.id, line_code="DEL0", created_by=self.leader.id,
            title="Doc", category="5why", source="simo", url="http://x",
        ))
        self.db.commit()

        delete_line(self.line.id, self.db)

        self.db.expire_all()
        self.assertIsNone(self.db.get(Line, self.line.id))
        assignment = self.db.scalar(select(LeaderAssignment))
        self.assertIsNone(assignment.line_id)
        self.assertEqual(assignment.line_code_snapshot, "DEL0")
        self.assertIsNotNone(assignment.ended_at)
        entry = self.db.scalar(select(HistoricalEntry))
        self.assertIsNone(entry.line_id)
        self.assertEqual(entry.source_line, "DEL0")
        document = self.db.scalar(select(FiveWhyDocument))
        self.assertIsNone(document.line_id)
        self.assertEqual(document.line_code, "DEL0")

    def test_deleting_dm_keeps_leader_history(self):
        group = DmGroup(workshop_id=self.line.workshop_id, name="DM Del")
        self.db.add(group)
        self.db.flush()
        self.db.add(LeaderAssignment(
            employee_id=self.leader.id, kind="dm_leader", dm_group_id=group.id,
            dm_name_snapshot="DM Del", started_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            created_by_employee_id=self.leader.id,
        ))
        self.db.commit()

        delete_dm_group(group.id, self.db, None)

        self.db.expire_all()
        self.assertIsNone(self.db.get(DmGroup, group.id))
        assignment = self.db.scalar(select(LeaderAssignment))
        self.assertIsNone(assignment.dm_group_id)
        self.assertEqual(assignment.dm_name_snapshot, "DM Del")
        self.assertIsNotNone(assignment.ended_at)


if __name__ == "__main__":
    unittest.main()
