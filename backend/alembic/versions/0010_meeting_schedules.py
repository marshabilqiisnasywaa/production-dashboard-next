"""dm meeting schedules

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-19
"""
import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dm_meeting_schedules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(60), nullable=False),
        sa.Column("time", sa.String(5), nullable=False),
        sa.Column("days", sa.String(20), nullable=False, server_default="1,2,3,4,5,6,7"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_dm_meeting_schedules_line_id", "dm_meeting_schedules", ["line_id"])
    op.add_column("dm_meeting_sessions", sa.Column("label", sa.String(60)))


def downgrade() -> None:
    op.drop_column("dm_meeting_sessions", "label")
    op.drop_index("ix_dm_meeting_schedules_line_id", table_name="dm_meeting_schedules")
    op.drop_table("dm_meeting_schedules")
