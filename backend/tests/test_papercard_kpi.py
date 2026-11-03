import unittest
from datetime import date, datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from app.services.papercard_kpi import DEPARTMENTS, check_department, score_day

J = ZoneInfo("Asia/Jakarta")
DAY = date(2026, 9, 15)
WINDOW_END = "08:15"
LATER = date(2026, 9, 20)


def sub(hour=8, minute=0, ng=True, approved=True, approved_day=DAY):
    return SimpleNamespace(
        submitted_at=datetime(2026, 9, 15, hour, minute, tzinfo=J),
        answers=[{"status": "NG" if ng else "OK"}],
        approval_status="approved" if approved else "pending",
        approved_at=datetime(approved_day.year, approved_day.month, approved_day.day, 12, 0, tzinfo=J) if approved else None,
    )


def score(subs, today=LATER):
    checks = [check_department(DAY, d, s, WINDOW_END) for d, s in zip(DEPARTMENTS, subs)]
    return score_day(DAY, checks, today)


class PapercardKpiTests(unittest.TestCase):
    def test_all_perfect(self):
        result = score([sub(), sub(), sub(), sub()])
        self.assertEqual((result.on_time, result.registered, result.closed, result.total), (8, 14, 8, 30))

    def test_one_late_breaks_on_time_and_registered(self):
        result = score([sub(), sub(), sub(9, 0), sub()])
        self.assertEqual((result.on_time, result.registered, result.closed), (0, 0, 8))

    def test_missing_submission_zeroes_everything(self):
        result = score([sub(), sub(), sub(), None])
        self.assertEqual(result.total, 0)

    def test_no_finding_gives_zero_for_registered_and_closed(self):
        result = score([sub(ng=False)] * 4)
        self.assertEqual((result.on_time, result.registered, result.closed), (8, 0, 0))

    def test_not_approved_breaks_close_loop(self):
        result = score([sub(), sub(), sub(approved=False), sub()])
        self.assertEqual((result.on_time, result.registered, result.closed), (8, 14, 0))

    def test_approved_next_day_does_not_count(self):
        result = score([sub(), sub(), sub(approved_day=date(2026, 9, 16)), sub()])
        self.assertEqual(result.closed, 0)

    def test_today_is_not_final(self):
        self.assertFalse(score([sub()] * 4, today=DAY).final)
        self.assertTrue(score([sub()] * 4).final)

    def test_no_templates_scores_zero(self):
        self.assertEqual(score_day(DAY, [], LATER).total, 0)


if __name__ == "__main__":
    unittest.main()
