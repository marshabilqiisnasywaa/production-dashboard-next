"""Add category path and occurrence/response times to meeting summaries."""

import sqlalchemy as sa
from alembic import op

revision = "0054"
down_revision = "0053"
branch_labels = None
depends_on = None

TABLES = ("dm_meeting_summaries", "workshop_meeting_summaries")


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column("category_codes", sa.JSON(), nullable=True))
        op.add_column(table, sa.Column("occurred_at", sa.String(length=32), nullable=True))
        op.add_column(table, sa.Column("responded_at", sa.String(length=32), nullable=True))


def downgrade() -> None:
    for table in TABLES:
        op.drop_column(table, "responded_at")
        op.drop_column(table, "occurred_at")
        op.drop_column(table, "category_codes")
