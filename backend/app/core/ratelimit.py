import math
import time
from threading import Lock

MAX_FAILURES = 5
WINDOW_SECONDS = 15 * 60
LOCK_SECONDS = 5 * 60

_lock = Lock()
_state: dict[str, dict[str, float]] = {}


def retry_after(key: str) -> int:
    with _lock:
        entry = _state.get(key)
        if not entry:
            return 0
        remaining = entry.get("locked_until", 0) - time.monotonic()
        return math.ceil(remaining) if remaining > 0 else 0


def record_failure(key: str) -> None:
    now = time.monotonic()
    with _lock:
        entry = _state.get(key)
        if entry is None or now - entry["first"] > WINDOW_SECONDS:
            entry = {"count": 0, "first": now, "locked_until": 0}
            _state[key] = entry
        entry["count"] += 1
        if entry["count"] >= MAX_FAILURES:
            entry["locked_until"] = now + LOCK_SECONDS
            entry["count"] = 0
            entry["first"] = now


def clear(key: str) -> None:
    with _lock:
        _state.pop(key, None)
