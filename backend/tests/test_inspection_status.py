import unittest
from datetime import date, datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

from app.api.papercards import get_inspection


DAY = date(2026, 9, 15)
JAKARTA = ZoneInfo("Asia/Jakarta")


class InspectionStatusTests(unittest.TestCase):
    def inspection(self, submitted_at, status="NG"):
        db = MagicMock()
        db.get.return_value = SimpleNamespace(id=1, code="TEST", model="Model")
        submission = SimpleNamespace(date=DAY, department="PROD", status=status,
                                     submitted_at=submitted_at, answers=[{"status": "NG"}])
        templates = [SimpleNamespace(department=d, window_end="08:15") for d in ("PROD", "ME", "PE", "QC")]
        db.scalars.side_effect = [SimpleNamespace(all=lambda: [submission]), SimpleNamespace(all=lambda: templates)]
        with patch("app.api.papercards.authorize_line"):
            return get_inspection(1, DAY, DAY, "Shift 1", db,
                                  SimpleNamespace(role="leader"))[0]

    def test_on_time_with_ng_findings_is_ok_in_inspection(self):
        row = self.inspection(datetime(2026, 9, 15, 8, 0, tzinfo=JAKARTA))
        self.assertEqual(row["statuses"]["leader"], "OK")
        self.assertEqual((row["submitted"], row["onTime"], row["total"]), (1, 1, 4))

    def test_late_is_ng_even_if_saved_status_is_ok(self):
        row = self.inspection(datetime(2026, 9, 15, 8, 16, tzinfo=JAKARTA), "OK")
        self.assertEqual(row["statuses"]["leader"], "NG")
        self.assertEqual((row["submitted"], row["onTime"]), (0, 0))

    def test_exact_deadline_is_on_time(self):
        row = self.inspection(datetime(2026, 9, 15, 8, 15, tzinfo=JAKARTA))
        self.assertEqual(row["statuses"]["leader"], "OK")

    def test_utc_timestamp_is_compared_in_jakarta(self):
        row = self.inspection(datetime(2026, 9, 15, 1, 15, tzinfo=timezone.utc))
        self.assertEqual(row["statuses"]["leader"], "OK")

    def test_naive_timestamp_uses_jakarta_time(self):
        row = self.inspection(datetime(2026, 9, 15, 8, 0))
        self.assertEqual(row["statuses"]["leader"], "OK")
