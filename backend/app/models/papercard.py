from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PapercardTemplate(Base):
    __tablename__ = "papercard_templates"
    __table_args__ = (
        Index("uq_papercard_template_line_dept", "line_id", "department", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    workshop_id: Mapped[int] = mapped_column(ForeignKey("workshops.id", ondelete="CASCADE"), index=True)
    line_id: Mapped[int] = mapped_column(ForeignKey("lines.id", ondelete="CASCADE"), index=True)
    department: Mapped[str] = mapped_column(String(32), index=True)  # "PROD", "ME", "PE", "QC"
    name: Mapped[str] = mapped_column(String(120))
    version: Mapped[str] = mapped_column(String(16), default="v1.0", server_default="v1.0")
    window_start: Mapped[str] = mapped_column(String(8), default="07:30", server_default="07:30")
    window_end: Mapped[str] = mapped_column(String(8), default="08:15", server_default="08:15")
    template_data: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PapercardSubmission(Base):
    __tablename__ = "papercard_submissions"
    __table_args__ = (
        Index("uq_papercard_submission_line_dept_date_shift", "line_id", "department", "date", "shift", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("papercard_templates.id", ondelete="SET NULL"))
    line_id: Mapped[int] = mapped_column(ForeignKey("lines.id", ondelete="CASCADE"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="RESTRICT"), index=True)
    department: Mapped[str] = mapped_column(String(32), index=True)  # "PROD", "ME", "PE", "QC"
    date: Mapped[date] = mapped_column(Date, index=True)
    shift: Mapped[str] = mapped_column(String(16), default="Shift 1", server_default="Shift 1")
    answers: Mapped[list[Any]] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"))
    abnormal_notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="submitted", server_default="submitted")
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Supervisor approval fields
    approval_status: Mapped[str] = mapped_column(String(16), default="pending", server_default="pending")
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    supervisor_notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
