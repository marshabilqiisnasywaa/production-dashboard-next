"""attendance note audit

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-22
"""
import sqlalchemy as sa
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dm_meeting_attendances",
        sa.Column("note_by_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column("dm_meeting_attendances", sa.Column("note_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("dm_meeting_attendances", "note_at")
    op.drop_column("dm_meeting_attendances", "note_by_id")
