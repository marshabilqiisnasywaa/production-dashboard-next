"""Add category path and occurrence/response times to meeting summaries."""

import sqlalchemy as sa
from alembic import op

revision = "0055"
down_revision = "0054"
branch_labels = None
depends_on = None

TABLES = ("dm_meeting_summaries", "workshop_meeting_summaries")
COLUMNS = (
    ("category_codes", sa.JSON()),
    ("occurred_at", sa.String(length=32)),
    ("responded_at", sa.String(length=32)),
)


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for table in TABLES:
        existing = {column["name"] for column in inspector.get_columns(table)}
        for name, kind in COLUMNS:
            if name not in existing:
                op.add_column(table, sa.Column(name, kind, nullable=True))


def downgrade() -> None:
    for table in TABLES:
        for name, _ in reversed(COLUMNS):
            op.drop_column(table, name)
