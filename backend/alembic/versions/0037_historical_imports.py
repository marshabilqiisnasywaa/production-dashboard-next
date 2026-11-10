from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0037"
down_revision = "0036"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "history_import_batches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("imported_by", sa.String(120), nullable=False),
        sa.Column("added", sa.Integer(), nullable=False),
        sa.Column("updated", sa.Integer(), nullable=False),
        sa.Column("skipped", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "historical_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("history_import_batches.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("shift", sa.String(16), nullable=False),
        sa.Column("leader_name", sa.String(120), nullable=False),
        sa.Column("source_line", sa.String(32), nullable=False),
        sa.Column("source_dm", sa.String(64)),
        sa.Column("source_sheet", sa.String(120), nullable=False),
        sa.Column("source_row", sa.Integer(), nullable=False),
        sa.Column("data", postgresql.JSONB(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_historical_entries_line_id", "historical_entries", ["line_id"])
    op.create_index("ix_historical_entries_date", "historical_entries", ["date"])
    op.create_index("uq_historical_entry_kind_line_date_shift", "historical_entries", ["kind", "line_id", "date", "shift"], unique=True)


def downgrade() -> None:
    op.drop_table("historical_entries")
    op.drop_table("history_import_batches")
