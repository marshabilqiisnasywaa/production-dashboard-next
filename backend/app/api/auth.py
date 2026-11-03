import math
from app.core.roles import ADMIN_ROLES, access_of


from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import Principal, get_principal, require
from app.core import ratelimit
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Employee
from app.schemas import ChangePasswordIn, LineRef, LoginIn, MeOut, TokenOut
from app.services.accounts import active_line, active_lines

router = APIRouter(prefix="/auth", tags=["auth"])

DUMMY_HASH = hash_password("tidak-dipakai")


def bad_credentials() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Username atau password salah.")


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)) -> TokenOut:
    username = body.username.strip()
    key = f"{request.client.host if request.client else '-'}|{username.lower()}"
    wait = ratelimit.retry_after(key)
    if wait:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Terlalu banyak percobaan. Coba lagi dalam {math.ceil(wait / 60)} menit.",
            headers={"Retry-After": str(wait)},
        )

    employee = db.scalar(select(Employee).where(Employee.employee_no == username))
    stored = employee.password_hash if employee and employee.password_hash else DUMMY_HASH
    matched = verify_password(body.password, stored)
    if employee is None or not employee.is_active or not employee.password_hash or not matched:
        ratelimit.record_failure(key)
        raise bad_credentials()

    ratelimit.clear(key)
    return TokenOut(
        access_token=create_access_token(employee.id, "employee"),
        username=employee.employee_no,
        kind="admin" if employee.role in ADMIN_ROLES else "employee",
        role=employee.role,
        name=employee.name,
        must_change_password=employee.must_change_password,
        dept=employee.dept,
        **access_of(employee.role),
    )


@router.get("/me", response_model=MeOut)
def me(principal: Principal = Depends(require("account.self", active=False)), db: Session = Depends(get_db)) -> MeOut:
    employee = principal.employee
    found_lines = active_lines(db, employee.id)
    lines_ref = [
        LineRef(
            id=line_row.id,
            code=line_row.code,
            name=line_row.name,
            workshop_name=workshop.name,
            slug=board.slug,
        )
        for board, line_row, workshop in found_lines
    ]
    primary_line = lines_ref[0] if lines_ref else None

    return MeOut(
        username=employee.employee_no,
        role=employee.role,
        kind="admin" if employee.role in ADMIN_ROLES else "employee",
        name=employee.name,
        must_change_password=employee.must_change_password,
        line=primary_line,
        lines=lines_ref,
        dept=employee.dept,
        position=employee.position,
        supervisor=employee.supervisor_name,
        work_phone=employee.work_phone,
        photo_url=employee.photo_url,
        **access_of(employee.role),
    )


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordIn,
    principal: Principal = Depends(require("account.self", active=False)),
    db: Session = Depends(get_db),
) -> Response:
    account = principal.employee
    if not account.password_hash or not verify_password(body.current_password, account.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password saat ini salah.")
    if body.new_password == body.current_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password baru harus berbeda dari yang lama.")
    if body.new_password == account.employee_no:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password baru tidak boleh sama dengan NIK.")
    account.password_hash = hash_password(body.new_password)
    account.must_change_password = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
