from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.roles import ROLES
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


def declared_capabilities(request: Request) -> set[str]:
    found: set[str] = set()
    stack = [getattr(request.scope.get("route"), "dependant", None)]
    while stack:
        node = stack.pop()
        if node is None:
            continue
        for sub in node.dependencies:
            capability = getattr(sub.call, "capability", None)
            if capability:
                found.add(capability)
            stack.append(sub)
    return found


def enforce_capabilities(request: Request, role_key: str) -> None:
    role = ROLES.get(role_key)
    if role is not None and not role.is_strict:
        return
    granted = role.capabilities if role is not None else frozenset()
    if not declared_capabilities(request) & granted:
        raise forbidden()


def get_principal(
    request: Request,
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
        enforce_capabilities(request, employee.role)
        return Principal(employee=employee)
    user = db.get(User, subject_id)
    if user is None or not user.is_active or user.role != "superadmin":
        raise invalid_session()
    return Principal(user=user)


def get_active_principal(principal: Principal = Depends(get_principal)) -> Principal:
    if principal.employee is not None and principal.employee.must_change_password:
        raise forbidden("Ganti password dulu sebelum memakai akun ini.")
    return principal


def require(capability: str, *, active: bool = True):
    source = get_active_principal if active else get_principal

    def dependency(principal: Principal = Depends(source)) -> Principal:
        if principal.is_admin:
            return principal
        role = ROLES.get(principal.role)
        if role is None or (role.is_strict and capability not in role.capabilities):
            raise forbidden()
        return principal

    dependency.capability = capability
    return dependency


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
