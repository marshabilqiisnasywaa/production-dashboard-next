from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SummaryLineFields:
    id: Mapped[int] = mapped_column(primary_key=True)
    line_id: Mapped[int | None] = mapped_column(ForeignKey("lines.id", ondelete="SET NULL"), index=True)
    code: Mapped[str] = mapped_column(String(32))


class SummaryPicFields:
    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="SET NULL"), index=True)
    name: Mapped[str] = mapped_column(String(120))


class DmSummaryLine(SummaryLineFields, Base):
    __tablename__ = "dm_summary_lines"
    summary_id: Mapped[int] = mapped_column(ForeignKey("dm_meeting_summaries.id", ondelete="CASCADE"), index=True)


class DmSummaryPic(SummaryPicFields, Base):
    __tablename__ = "dm_summary_pics"
    summary_id: Mapped[int] = mapped_column(ForeignKey("dm_meeting_summaries.id", ondelete="CASCADE"), index=True)


class WorkshopSummaryLine(SummaryLineFields, Base):
    __tablename__ = "workshop_summary_lines"
    summary_id: Mapped[int] = mapped_column(ForeignKey("workshop_meeting_summaries.id", ondelete="CASCADE"), index=True)


class WorkshopSummaryPic(SummaryPicFields, Base):
    __tablename__ = "workshop_summary_pics"
    summary_id: Mapped[int] = mapped_column(ForeignKey("workshop_meeting_summaries.id", ondelete="CASCADE"), index=True)
