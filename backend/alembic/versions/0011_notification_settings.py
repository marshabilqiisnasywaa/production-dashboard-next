"""dm notification settings

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-19
"""
import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dm_notification_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("papercard_reminder_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("papercard_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("meeting_reminder_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("meeting_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_dm_notification_settings_line_id", "dm_notification_settings", ["line_id"])


def downgrade() -> None:
    op.drop_index("ix_dm_notification_settings_line_id", table_name="dm_notification_settings")
    op.drop_table("dm_notification_settings")
