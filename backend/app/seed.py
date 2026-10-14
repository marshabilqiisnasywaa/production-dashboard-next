import argparse
import sys
from getpass import getpass

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import User, Workshop

DEFAULT_WORKSHOPS = ("Workshop 5", "Workshop 6")
MIN_PASSWORD_LENGTH = 8


def read_credentials() -> tuple[str, str]:
    parser = argparse.ArgumentParser(description="Create or reset the superadmin and default workshops.")
    parser.add_argument("--username", help="falls back to SEED_ADMIN_USERNAME in .env, then a prompt")
    parser.add_argument("--password", help="falls back to SEED_ADMIN_PASSWORD in .env, then a prompt")
    args = parser.parse_args()
    username = args.username or settings.seed_admin_username or input("Username superadmin [admin]: ").strip() or "admin"
    password = args.password or settings.seed_admin_password or getpass("Password superadmin: ")
    if len(password) < MIN_PASSWORD_LENGTH:
        sys.exit(f"Password minimal {MIN_PASSWORD_LENGTH} karakter.")
    return username, password


def main() -> None:
    username, password = read_credentials()
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == username))
        if user is None:
            db.add(User(username=username, password_hash=hash_password(password), role="superadmin"))
            print(f"Superadmin '{username}' dibuat.")
        else:
            user.password_hash = hash_password(password)
            user.role = "superadmin"
            user.is_active = True
            print(f"Password superadmin '{username}' diperbarui.")
        for name in DEFAULT_WORKSHOPS:
            if db.scalar(select(Workshop.id).where(Workshop.name == name)) is None:
                db.add(Workshop(name=name))
                print(f"Workshop '{name}' dibuat.")
        db.commit()


if __name__ == "__main__":
    main()
