from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FaceTemplate(Base):
    __tablename__ = "face_templates"
    __table_args__ = (
        CheckConstraint("source IN ('photo', 'camera')", name="ck_face_templates_source"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), index=True)
    embedding: Mapped[bytes] = mapped_column(LargeBinary)
    source: Mapped[str] = mapped_column(String(16))
    quality: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
