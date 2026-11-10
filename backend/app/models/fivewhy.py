from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FiveWhyAnalysis(Base):
    __tablename__ = "fivewhy_analyses"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    line_id: Mapped[int] = mapped_column(ForeignKey("lines.id", ondelete="RESTRICT"), index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="RESTRICT"), index=True)
    revision: Mapped[int] = mapped_column(Integer, default=1)
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class FiveWhyDocument(Base):
    __tablename__ = "fivewhy_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    line_id: Mapped[int] = mapped_column(ForeignKey("lines.id", ondelete="RESTRICT"), index=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="RESTRICT"), index=True)
    pic_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="RESTRICT"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(40))
    source: Mapped[str] = mapped_column(String(10))
    url: Mapped[str | None] = mapped_column(String(2000))
    file_name: Mapped[str | None] = mapped_column(String(255))
    size: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
