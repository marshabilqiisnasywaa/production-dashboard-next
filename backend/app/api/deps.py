from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models import Employee, User
from app.services.accounts import active_line, active_lines, forbidden

bearer = HTTPBearer(auto_error=False)


@dataclass
class Principal:
    user: User | None = None
    employee: Employee | None = None

    @property
    def is_admin(self) -> bool:
        return self.user is not None

    @property
    def role(self) -> str:
        if self.user is not None:
            return "admin"
        assert self.employee is not None
        return self.employee.role


def invalid_session() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesi tidak valid, silakan login lagi.")


def get_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Principal:
    decoded = decode_access_token(credentials.credentials) if credentials else None
    if decoded is None:
        raise invalid_session()
    kind, subject_id = decoded
    if kind == "employee":
        employee = db.get(Employee, subject_id)
        if employee is None or not employee.is_active:
            raise invalid_session()
        return Principal(employee=employee)
    user = db.get(User, subject_id)
    if user is None or not user.is_active or user.role != "superadmin":
        raise invalid_session()
    return Principal(user=user)


def get_active_principal(principal: Principal = Depends(get_principal)) -> Principal:
    if principal.employee is not None and principal.employee.must_change_password:
        raise forbidden("Ganti password dulu sebelum memakai akun ini.")
    return principal


def get_current_admin(principal: Principal = Depends(get_principal)) -> User:
    if principal.user is None:
        raise forbidden("Hanya admin yang bisa membuka bagian ini.")
    return principal.user


def authorize_line(db: Session, principal: Principal, line_id: int) -> None:
    if principal.is_admin:
        return
    employee = principal.employee
    assert employee is not None
    if employee.role == "supervisor":
        raise forbidden("Cakupan supervisor belum diatur. Hubungi admin.")
    lines = active_lines(db, employee.id)
    if not any(l.id == line_id for _, l, _ in lines):
        raise forbidden()
