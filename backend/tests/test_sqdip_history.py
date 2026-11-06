import unittest
from datetime import date
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine, get_db
from app.main import app
from app.models import SqdipEntry
from app.services.sqdip import DIMENSIONS


class SqdipHistoryTests(unittest.TestCase):
    def setUp(self):
        connection = engine.connect()
        transaction = connection.begin()
        self.addCleanup(connection.close)
        self.addCleanup(transaction.rollback)
        schema = "test_sqdip_history_" + uuid4().hex
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(connection)
        self.db = Session(connection, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)
        for day, leader in ((date(2026, 9, 2), "Edi Prasetyo"), (date(2026, 9, 3), "Alif Maulana")):
            for dimension in DIMENSIONS:
                self.db.add(SqdipEntry(
                    date=day, line_code="TAC20601", leader_name=leader, dimension=dimension, actual=1.0, points=6,
                ))
        self.db.commit()
        app.dependency_overrides[get_db] = lambda: self.db
        self.addCleanup(app.dependency_overrides.clear)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def leaders(self, **params):
        response = self.client.get("/api/public/scorecard/leaders", params=params)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_unregistered_line_with_sqdip_data_is_listed_as_historical(self):
        listed = self.leaders(**{"from": "2026-09-01", "to": "2026-09-30"})
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0]["lineCode"], "TAC20601")
        self.assertTrue(listed[0]["historical"])
        self.assertEqual(listed[0]["leaderName"], "Alif Maulana")
        self.assertLess(listed[0]["lineId"], 0)

    def test_range_without_data_does_not_list_the_line(self):
        self.assertEqual(self.leaders(**{"from": "2026-10-01", "to": "2026-10-31"}), [])

    def test_sqdip_kpi_works_for_unregistered_line_code(self):
        response = self.client.get(
            "/api/public/sqdip-kpi", params={"line_code": "TAC20601", "from": "2026-09-01", "to": "2026-09-30"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        days = response.json()["days"]
        self.assertEqual([d["date"] for d in days], ["2026-09-02", "2026-09-03"])
        self.assertEqual([d["leader"] for d in days], ["Edi Prasetyo", "Alif Maulana"])
        self.assertEqual(days[0]["total"], 30)

    def test_sqdip_kpi_unknown_line_id_is_still_404(self):
        response = self.client.get(
            "/api/public/sqdip-kpi", params={"line_id": 999999, "from": "2026-09-01", "to": "2026-09-30"},
        )
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
