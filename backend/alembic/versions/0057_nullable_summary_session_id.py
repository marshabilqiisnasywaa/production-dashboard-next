"""Make dm_meeting_summaries.session_id and line_id nullable for direct problem input.

Revision ID: 0057_nullable_summary_session_id
Revises: 0056_recalculate_sqdip_points
Create Date: 2026-11-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0057"
down_revision = "0056"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "dm_meeting_summaries",
        "session_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.alter_column(
        "dm_meeting_summaries",
        "line_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "dm_meeting_summaries",
        "line_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.alter_column(
        "dm_meeting_summaries",
        "session_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
