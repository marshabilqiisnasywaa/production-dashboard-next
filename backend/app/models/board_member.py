from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class BoardMember(Base):
    __tablename__ = "board_members"
    __table_args__ = (
        Index(
            "uq_board_members_active_board_employee",
            "board_id",
            "employee_id",
            unique=True,
            postgresql_where=text("ended_at IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("boards.id", ondelete="RESTRICT"), index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="RESTRICT"))
    position: Mapped[str | None] = mapped_column(String(120))
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
