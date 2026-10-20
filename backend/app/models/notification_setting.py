from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DmNotificationSetting(Base):
    __tablename__ = "dm_notification_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    line_id: Mapped[int] = mapped_column(ForeignKey("lines.id", ondelete="CASCADE"), unique=True, index=True)
    papercard_reminder_minutes: Mapped[int] = mapped_column(Integer, default=15, server_default="15")
    papercard_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    meeting_reminder_minutes: Mapped[int] = mapped_column(Integer, default=15, server_default="15")
    meeting_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
