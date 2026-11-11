from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SqdipEntry(Base):
    __tablename__ = "sqdip_entries"
    __table_args__ = (
        CheckConstraint("points IN (0, 6)", name="ck_sqdip_entries_points"),
        Index("uq_sqdip_entry_date_line_leader_dim", "date", "line_code", "leader_name", "dimension", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date)
    line_code: Mapped[str] = mapped_column(String(32), index=True)
    leader_name: Mapped[str] = mapped_column(String(120))
    leader_employee_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", ondelete="RESTRICT"), nullable=True)
    dimension: Mapped[str] = mapped_column(String(16))  # "Safety", "Quality", "Delivery", "Inventory", "Productivity"
    actual: Mapped[float | None] = mapped_column(Float)
    points: Mapped[int] = mapped_column(Integer)  # 0 atau 6
    source_file: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
