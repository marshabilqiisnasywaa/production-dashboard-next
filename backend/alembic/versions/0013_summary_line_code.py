"""meeting summary line code

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-21
"""
import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dm_meeting_summaries", sa.Column("line_code", sa.String(32), nullable=True))


def downgrade() -> None:
    op.drop_column("dm_meeting_summaries", "line_code")
