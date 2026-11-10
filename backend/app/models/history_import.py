from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class HistoryImportBatch(Base):
    __tablename__ = "history_import_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    file_name: Mapped[str] = mapped_column(String(255))
    imported_by: Mapped[str] = mapped_column(String(120))
    added: Mapped[int] = mapped_column(Integer)
    updated: Mapped[int] = mapped_column(Integer)
    skipped: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class HistoricalEntry(Base):
    __tablename__ = "historical_entries"
    __table_args__ = (
        Index("uq_historical_entry_kind_line_date_shift", "kind", "line_id", "date", "shift", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("history_import_batches.id", ondelete="RESTRICT"))
    kind: Mapped[str] = mapped_column(String(32))
    line_id: Mapped[int] = mapped_column(ForeignKey("lines.id", ondelete="RESTRICT"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    shift: Mapped[str] = mapped_column(String(16))
    leader_name: Mapped[str] = mapped_column(String(120))
    source_line: Mapped[str] = mapped_column(String(32))
    source_dm: Mapped[str | None] = mapped_column(String(64))
    source_sheet: Mapped[str] = mapped_column(String(120))
    source_row: Mapped[int] = mapped_column(Integer)
    data: Mapped[dict] = mapped_column(JSONB)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
