from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.face_template import FaceTemplate

from app.db.base import Base


class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint("role IN ('member', 'leader', 'supervisor')", name="ck_employees_role"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_no: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(16), default="member", server_default="member")
    dept: Mapped[str | None] = mapped_column(String(120))
    position: Mapped[str | None] = mapped_column(String(120))
    supervisor: Mapped[str | None] = mapped_column(String(120))
    supervisor_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), index=True)
    work_phone: Mapped[str | None] = mapped_column(String(32))
    photo_url: Mapped[str | None] = mapped_column(Text)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    supervisor_ref: Mapped["Employee | None"] = relationship(
        "Employee", remote_side=[id], foreign_keys=[supervisor_id], lazy="joined"
    )

    @property
    def supervisor_name(self) -> str | None:
        return self.supervisor_ref.name if self.supervisor_ref is not None else self.supervisor
