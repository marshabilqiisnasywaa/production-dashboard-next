import unittest
from datetime import date, datetime
from unittest.mock import patch

from fastapi import HTTPException

from app.services.meeting_start import JAKARTA, ensure_start_window


class MeetingStartTests(unittest.TestCase):
    def test_start_window_boundary(self):
        day = date(2026, 11, 18)
        for hour, minute, second, allowed in (
            (7, 44, 59, False),
            (7, 45, 0, True),
            (8, 0, 0, True),
            (9, 0, 0, True),
        ):
            with self.subTest(hour=hour, minute=minute, second=second):
                with patch("app.services.meeting_start.datetime", wraps=datetime) as clock:
                    clock.now.return_value = datetime(2026, 11, 18, hour, minute, second, tzinfo=JAKARTA)
                    if allowed:
                        ensure_start_window(day, "08:00")
                    else:
                        with self.assertRaises(HTTPException) as error:
                            ensure_start_window(day, "08:00")
                        self.assertEqual(error.exception.status_code, 409)


if __name__ == "__main__":
    unittest.main()
