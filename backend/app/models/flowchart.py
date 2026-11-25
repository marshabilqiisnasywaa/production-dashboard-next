from datetime import date, datetime

import sqlalchemy as sa
from sqlalchemy import Date, DateTime, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Flowchart(Base):
    __tablename__ = "flowcharts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(10))
    image_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    board: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    phase: Mapped[str] = mapped_column(String(10), default="during", server_default="during")
    subtitle: Mapped[str] = mapped_column(String(200), default="", server_default="")
    purpose: Mapped[str] = mapped_column(Text, default="", server_default="")
    scope: Mapped[str] = mapped_column(Text, default="", server_default="")
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    version: Mapped[str] = mapped_column(String(20), default="", server_default="")
    owner: Mapped[str] = mapped_column(String(120), default="", server_default="")
    approver: Mapped[str] = mapped_column(String(120), default="", server_default="")
    status: Mapped[str] = mapped_column(String(10), default="published", server_default="published")
    requirements: Mapped[list] = mapped_column(JSON, default=list, server_default=sa.text("'[]'::json"))
    contacts: Mapped[list] = mapped_column(JSON, default=list, server_default=sa.text("'[]'::json"))
    sort_order: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
