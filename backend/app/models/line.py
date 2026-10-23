from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.face_template import FaceTemplate

from app.db.base import Base


class Line(Base):
    __tablename__ = "lines"
    __table_args__ = (
        CheckConstraint("status IN ('running', 'idle', 'stopped')", name="ck_lines_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    workshop_id: Mapped[int] = mapped_column(ForeignKey("workshops.id", ondelete="RESTRICT"), index=True)
    dm_group_id: Mapped[int | None] = mapped_column(
        ForeignKey("dm_groups.id", ondelete="SET NULL"), nullable=True, index=True
    )
    code: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    model: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16), default="running", server_default="running")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    dm_group = relationship("DmGroup", back_populates="lines")
