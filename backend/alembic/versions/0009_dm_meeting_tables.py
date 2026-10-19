"""dm meeting tables

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-17
"""
import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. dm_meeting_sessions
    op.create_table(
        "dm_meeting_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("leader_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL")),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("shift", sa.String(16), nullable=False, server_default="Shift 1"),
        sa.Column("session_type", sa.String(16), nullable=False),
        sa.Column("session_number", sa.Integer(), nullable=False),
        sa.Column("scheduled_time", sa.String(8), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
        sa.Column("duration_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_dm_meeting_sessions_line_id", "dm_meeting_sessions", ["line_id"])
    op.create_index("ix_dm_meeting_sessions_date", "dm_meeting_sessions", ["date"])
    op.create_index("ix_dm_meeting_sessions_leader_id", "dm_meeting_sessions", ["leader_id"])
    op.create_index(
        "uq_dm_session_line_date_shift_num",
        "dm_meeting_sessions",
        ["line_id", "date", "shift", "session_number"],
        unique=True,
    )

    # 2. dm_meeting_attendances
    op.create_table(
        "dm_meeting_attendances",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("dm_meeting_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="present"),
        sa.Column("verification_method", sa.String(32), nullable=False, server_default="face_id_dummy"),
        sa.Column("face_confidence", sa.Float()),
        sa.Column("attended_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("notes", sa.Text()),
    )
    op.create_index("ix_dm_meeting_attendances_session_id", "dm_meeting_attendances", ["session_id"])
    op.create_index("ix_dm_meeting_attendances_employee_id", "dm_meeting_attendances", ["employee_id"])
    op.create_index(
        "uq_dm_attendance_session_employee",
        "dm_meeting_attendances",
        ["session_id", "employee_id"],
        unique=True,
    )

    # 3. dm_meeting_summaries
    op.create_table(
        "dm_meeting_summaries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("dm_meeting_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("problem", sa.Text(), nullable=False),
        sa.Column("pic_name", sa.String(120), nullable=False),
        sa.Column("pic_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL")),
        sa.Column("due_date", sa.String(32)),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_dm_meeting_summaries_session_id", "dm_meeting_summaries", ["session_id"])
    op.create_index("ix_dm_meeting_summaries_line_id", "dm_meeting_summaries", ["line_id"])

    # 4. dm_post_meetings
    op.create_table(
        "dm_post_meetings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("leader_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL")),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("shift", sa.String(16), nullable=False, server_default="Shift 1"),
        sa.Column("root_cause", sa.Text(), nullable=False),
        sa.Column("pdca_plan", sa.Text(), nullable=False),
        sa.Column("pdca_do", sa.Text(), nullable=False),
        sa.Column("pdca_check", sa.Text(), nullable=False),
        sa.Column("pdca_act", sa.Text(), nullable=False),
        sa.Column("follow_up_update", sa.Text()),
        sa.Column("status", sa.String(16), nullable=False, server_default="submitted"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_dm_post_meetings_line_id", "dm_post_meetings", ["line_id"])
    op.create_index("ix_dm_post_meetings_date", "dm_post_meetings", ["date"])
    op.create_index(
        "uq_dm_post_meeting_line_date_shift",
        "dm_post_meetings",
        ["line_id", "date", "shift"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("dm_post_meetings")
    op.drop_table("dm_meeting_summaries")
    op.drop_table("dm_meeting_attendances")
    op.drop_table("dm_meeting_sessions")
