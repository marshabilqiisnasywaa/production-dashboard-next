import secrets
import time
from dataclasses import dataclass

from app.core.config import settings


@dataclass
class Challenge:
    session_id: int
    direction: str
    expires_at: float


_challenges: dict[str, Challenge] = {}


def issue(session_id: int) -> tuple[str, str]:
    now = time.monotonic()
    for token in [t for t, c in _challenges.items() if c.expires_at < now]:
        _challenges.pop(token, None)
    token = secrets.token_urlsafe(16)
    direction = secrets.choice(["left", "right"])
    _challenges[token] = Challenge(session_id, direction, now + settings.face_challenge_seconds)
    return token, direction


def consume(token: str, session_id: int) -> Challenge | None:
    challenge = _challenges.pop(token, None)
    if challenge is None or challenge.session_id != session_id:
        return None
    if challenge.expires_at < time.monotonic():
        return None
    return challenge


def turned_enough(first_yaw: float, last_yaw: float, direction: str) -> bool:
    sign = settings.face_left_yaw_sign if direction == "left" else -settings.face_left_yaw_sign
    return sign * (last_yaw - first_yaw) >= settings.face_min_yaw_delta
