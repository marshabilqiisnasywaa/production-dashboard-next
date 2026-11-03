import unittest
from datetime import date

from app.services.standup_kpi import check_meeting, score_day

DAY = date(2026, 9, 15)
LATER = date(2026, 9, 20)
TEAM = {1, 2, 3, 4}


def meeting(number, held=True, present=TEAM):
    return check_meeting(number, held, TEAM, set(present))


def score(meetings, problems=0, closed=0, today=LATER):
    return score_day(DAY, meetings, problems, closed, today)


class StandupKpiTests(unittest.TestCase):
    def test_two_complete_meetings_and_closed(self):
        result = score([meeting(1), meeting(2)], problems=2, closed=2)
        self.assertEqual((result.attendance, result.content, result.close_loop, result.total), (10, 20, 10, 40))

    def test_one_complete_meeting_gives_half_attendance(self):
        result = score([meeting(1), meeting(2, held=False, present=())], problems=1, closed=1)
        self.assertEqual((result.attendance, result.content), (5, 10))

    def test_one_member_absent_breaks_that_meeting(self):
        result = score([meeting(1, present={1, 2, 3}), meeting(2)])
        self.assertEqual((result.attendance, result.content), (5, 10))

    def test_no_meeting_held(self):
        result = score([meeting(1, held=False, present=()), meeting(2, held=False, present=())])
        self.assertEqual(result.total, 0)

    def test_close_loop_needs_every_problem_closed_today(self):
        self.assertEqual(score([meeting(1)], problems=2, closed=1).close_loop, 0)
        self.assertEqual(score([meeting(1)], problems=2, closed=2).close_loop, 10)

    def test_no_problems_gives_zero_close_loop(self):
        self.assertEqual(score([meeting(1)], problems=0, closed=0).close_loop, 0)

    def test_empty_roster_is_never_complete(self):
        self.assertFalse(check_meeting(1, True, set(), set()).complete)

    def test_today_is_not_final(self):
        self.assertFalse(score([meeting(1)], today=DAY).final)


if __name__ == "__main__":
    unittest.main()
