from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LeaderAssignment(Base):
    __tablename__ = "leader_assignments"

    __table_args__ = (
        CheckConstraint(
            "(created_by_employee_id IS NOT NULL AND created_by_user_id IS NULL) OR "
            "(created_by_employee_id IS NULL AND created_by_user_id IS NOT NULL)",
            name="ck_leader_assignments_creator",
        ),
        CheckConstraint(
            "kind IN ('line_leader', 'dm_leader')",
            name="ck_leader_assignments_kind",
        ),
        CheckConstraint(
            """
            (kind = 'line_leader' AND line_id IS NOT NULL)
            OR
            (kind = 'dm_leader' AND line_id IS NULL)
            """,
            name="ck_leader_assignments_target",
        ),
        CheckConstraint(
            "ended_at IS NULL OR ended_at > started_at",
            name="ck_leader_assignments_period",
        ),
        Index(
            "uq_leader_assignments_active_dm",
            "dm_group_id",
            unique=True,
            postgresql_where=text(
                "kind = 'dm_leader' AND ended_at IS NULL"
            ),
        ),
        Index(
            "uq_leader_assignments_active_line",
            "line_id",
            unique=True,
            postgresql_where=text(
                "kind = 'line_leader' AND ended_at IS NULL"
            ),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        index=True,
    )

    kind: Mapped[str] = mapped_column(String(20))

    dm_group_id: Mapped[int | None] = mapped_column(
        ForeignKey("dm_groups.id", ondelete="RESTRICT"),
        index=True,
        nullable=True,
    )

    line_id: Mapped[int | None] = mapped_column(
        ForeignKey("lines.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    dm_name_snapshot: Mapped[str] = mapped_column(String(120))
    leader_name_snapshot: Mapped[str | None] = mapped_column(String(120), nullable=True)

    line_code_snapshot: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
    )

    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_by_employee_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id", ondelete="RESTRICT"),
        index=True,
    )

    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
