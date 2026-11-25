"""Create flowcharts table."""

import sqlalchemy as sa
from alembic import op

revision = "0052"
down_revision = "0051"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "flowcharts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("kind", sa.String(length=10), nullable=False),
        sa.Column("image_name", sa.String(length=100), nullable=True),
        sa.Column("board", sa.JSON(), nullable=True),
        sa.Column("phase", sa.String(length=10), server_default="during", nullable=False),
        sa.Column("subtitle", sa.String(length=200), server_default=sa.text("''"), nullable=False),
        sa.Column("purpose", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("scope", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("version", sa.String(length=20), server_default=sa.text("''"), nullable=False),
        sa.Column("owner", sa.String(length=120), server_default=sa.text("''"), nullable=False),
        sa.Column("approver", sa.String(length=120), server_default=sa.text("''"), nullable=False),
        sa.Column("status", sa.String(length=10), server_default="published", nullable=False),
        sa.Column("requirements", sa.JSON(), server_default=sa.text("'[]'::json"), nullable=False),
        sa.Column("contacts", sa.JSON(), server_default=sa.text("'[]'::json"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("flowcharts")
