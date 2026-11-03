import unittest
from datetime import date
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine
from fastapi.testclient import TestClient

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.main import app
from app.models import Line, Workshop
from app.schemas import SqdipRowIn
from app.services.sqdip import average_scores, line_sqdip, list_rows, upsert_rows

DAY = date(2026, 9, 15)
LATER = date(2026, 9, 20)


def row(day=DAY, line="tac20604", leader="Ahmad Riswanto", points=(6, 6, 6, 6, 6), actuals=(0, 0.95, 1, 300, 0.9)):
    return SqdipRowIn.model_validate({
        "date": day,
        "line": line,
        "leader": leader,
        "cells": [{"actual": a, "points": p} for a, p in zip(actuals, points)],
    })


class SqdipTests(unittest.TestCase):
    def setUp(self):
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        self.addCleanup(self.connection.close)
        self.addCleanup(self.transaction.rollback)
        schema = "test_sqdip_" + uuid4().hex
        self.connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        self.connection.execute(text(f'SET LOCAL search_path TO "{schema}"'))
        Base.metadata.create_all(self.connection)
        self.db = Session(self.connection, autoflush=False, expire_on_commit=False, join_transaction_mode="create_savepoint")
        self.addCleanup(self.db.close)

    def test_import_adds_then_updates(self):
        self.assertEqual(upsert_rows(self.db, [row()], "a.xlsx"), (1, 0))
        self.assertEqual(upsert_rows(self.db, [row(points=(6, 0, 6, 6, 6))], "b.xlsx"), (0, 1))
        rows = list_rows(self.db)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].line, "TAC20604")
        self.assertEqual([c.points for c in rows[0].cells], [6, 0, 6, 6, 6])

    def test_line_sqdip_scores_per_day(self):
        upsert_rows(self.db, [row(), row(day=date(2026, 9, 16), points=(6, 0, 6, 0, 6))], None)
        days = line_sqdip(self.db, "TAC20604", DAY, date(2026, 9, 16), LATER)
        self.assertEqual([d.total for d in days], [30, 18])
        self.assertTrue(all(d.final for d in days))
        average = average_scores(days)
        self.assertEqual((average["days"], average["total"], average["quality"]), (2, 24.0, 3.0))

    def test_today_is_not_final_and_skipped_in_average(self):
        upsert_rows(self.db, [row()], None)
        days = line_sqdip(self.db, "TAC20604", DAY, DAY, DAY)
        self.assertFalse(days[0].final)
        self.assertIsNone(average_scores(days))

    def test_other_line_is_not_mixed_in(self):
        upsert_rows(self.db, [row(line="TAC20605")], None)
        self.assertEqual(line_sqdip(self.db, "TAC20604", DAY, DAY, LATER), [])

    def test_rejects_invalid_points(self):
        with self.assertRaises(ValueError):
            row(points=(6, 3, 6, 6, 6))


    def test_http_import_then_public_kpi(self):
        workshop = Workshop(name="WS " + uuid4().hex[:6])
        self.db.add(workshop)
        self.db.flush()
        self.db.add(Line(workshop_id=workshop.id, code="TAC20604", name="Line 4"))
        self.db.flush()

        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_admin] = lambda: object()
        self.addCleanup(app.dependency_overrides.clear)
        client = TestClient(app)

        body = {
            "fileName": "sqdip.xlsx",
            "rows": [
                {"date": "2026-09-15", "line": "tac20604", "leader": "Ahmad Riswanto", "cells": [{"actual": 0, "points": 6}, {"actual": 0.9, "points": 0}, {"actual": 1, "points": 6}, {"actual": 300, "points": 6}, {"actual": 0.9, "points": 6}]},
            ],
        }
        imported = client.post("/api/sqdip/import", json=body)
        self.assertEqual((imported.status_code, imported.json()), (200, {"added": 1, "updated": 0}))
        self.assertEqual(client.post("/api/sqdip/import", json=body).json(), {"added": 0, "updated": 1})

        listed = client.get("/api/sqdip").json()
        self.assertEqual(listed["fileName"], "sqdip.xlsx")
        self.assertEqual(listed["rows"][0]["line"], "TAC20604")

        kpi = client.get("/api/public/sqdip-kpi?line_code=TAC20604&from=2026-09-14&to=2026-09-16")
        self.assertEqual(kpi.status_code, 200)
        day = kpi.json()["days"][0]
        self.assertEqual((day["total"], day["quality"], day["actuals"][1]), (24, 0, 0.9))
        self.assertEqual(kpi.json()["average"]["total"], 24.0)

    def test_http_rejects_invalid_points(self):
        app.dependency_overrides[get_db] = lambda: self.db
        app.dependency_overrides[get_current_admin] = lambda: object()
        self.addCleanup(app.dependency_overrides.clear)
        cells = [{"actual": 1, "points": 3}] * 5
        response = TestClient(app).post("/api/sqdip/import", json={"rows": [{"date": "2026-09-15", "line": "A", "leader": "B", "cells": cells}]})
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
