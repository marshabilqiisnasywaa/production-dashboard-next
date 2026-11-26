"""Add created_by_name to dm_meeting_summaries for direct-input problem attribution.

Revision ID: 0058
Revises: 0057
Create Date: 2026-11-26
"""
from alembic import op
import sqlalchemy as sa

revision = "0058"
down_revision = "0057"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dm_meeting_summaries",
        sa.Column("created_by_name", sa.String(length=120), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("dm_meeting_summaries", "created_by_name")
