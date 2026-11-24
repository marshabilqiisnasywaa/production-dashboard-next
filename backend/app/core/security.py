from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject_id: int, kind: str = "admin", impersonated_by: str | None = None) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": str(subject_id), "k": kind, "exp": expires}
    if impersonated_by:
        payload["imp"] = impersonated_by
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_claims(token: str) -> tuple[str, int, str | None] | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        imp = payload.get("imp")
        return str(payload.get("k", "admin")), int(payload["sub"]), str(imp) if imp else None
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


def decode_access_token(token: str) -> tuple[str, int] | None:
    claims = decode_access_claims(token)
    return None if claims is None else claims[:2]
