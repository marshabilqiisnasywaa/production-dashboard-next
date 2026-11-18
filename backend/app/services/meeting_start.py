from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException


JAKARTA = ZoneInfo("Asia/Jakarta")


def ensure_start_window(
    session_date: date,
    scheduled_time: str,
) -> None:
    scheduled_at = datetime.combine(
        session_date,
        time.fromisoformat(scheduled_time),
        tzinfo=JAKARTA,
    )
    allowed_at = scheduled_at - timedelta(minutes=15)

    if datetime.now(JAKARTA) < allowed_at:
        raise HTTPException(
            status_code=409,
            detail=(
                "Meeting baru bisa dimulai pada "
                f"{allowed_at:%d-%m-%Y %H:%M} WIB "
                "(15 menit sebelum jadwal)."
            ),
        )