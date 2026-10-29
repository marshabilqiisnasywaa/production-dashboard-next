from datetime import datetime

from sqlalchemy import DateTime, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Workshop(Base):
    __tablename__ = "workshops"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    hod: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
