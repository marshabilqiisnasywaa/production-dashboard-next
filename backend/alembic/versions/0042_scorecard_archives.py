"""Store final monthly Excel scorecards independently of live KPIs."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0042"
down_revision = "0041"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("scorecard_archives",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("history_import_batches.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("month", sa.Date(), nullable=False),
        sa.Column("scope", sa.String(16), nullable=False),
        sa.Column("line_code", sa.String(32), nullable=False),
        sa.Column("leader_name", sa.String(120), nullable=False),
        sa.Column("dm_name", sa.String(64), nullable=False),
        sa.Column("before", sa.Float(), nullable=False),
        sa.Column("current", sa.Float(), nullable=False),
        sa.Column("after", sa.Float(), nullable=False),
        sa.Column("total", sa.Float(), nullable=False),
        sa.Column("source_rank", sa.Integer(), nullable=True),
        sa.Column("data", postgresql.JSONB(), nullable=False),
    )
    op.create_index("ix_scorecard_archives_month", "scorecard_archives", ["month"])
    op.create_index("uq_scorecard_archive_identity", "scorecard_archives", ["month", "scope", "line_code", "leader_name", "dm_name"], unique=True)


def downgrade() -> None:
    op.drop_table("scorecard_archives")
