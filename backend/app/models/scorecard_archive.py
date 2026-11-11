from datetime import date

from sqlalchemy import Date, Float, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ScorecardArchive(Base):
    __tablename__ = "scorecard_archives"
    __table_args__ = (Index("uq_scorecard_archive_identity", "month", "scope", "line_code", "leader_name", "dm_name", unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int] = mapped_column(ForeignKey("history_import_batches.id", ondelete="RESTRICT"))
    month: Mapped[date] = mapped_column(Date, index=True)
    scope: Mapped[str] = mapped_column(String(16))
    line_code: Mapped[str] = mapped_column(String(32), default="")
    leader_name: Mapped[str] = mapped_column(String(120))
    dm_name: Mapped[str] = mapped_column(String(64))
    before: Mapped[float] = mapped_column(Float)
    current: Mapped[float] = mapped_column(Float)
    after: Mapped[float] = mapped_column(Float)
    total: Mapped[float] = mapped_column(Float)
    source_rank: Mapped[int | None] = mapped_column(Integer)
    data: Mapped[dict] = mapped_column(JSONB)
