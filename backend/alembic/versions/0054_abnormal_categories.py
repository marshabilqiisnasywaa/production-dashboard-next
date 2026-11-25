"""Create abnormal_categories table."""

import sqlalchemy as sa
from alembic import op

revision = "0054"
down_revision = "0053"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "abnormal_categories" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "abnormal_categories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=24), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["abnormal_categories.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("level", "code", name="uq_abnormal_categories_level_code"),
    )
    op.create_index("ix_abnormal_categories_code", "abnormal_categories", ["code"])
    op.create_index("ix_abnormal_categories_parent_id", "abnormal_categories", ["parent_id"])


def downgrade() -> None:
    op.drop_index("ix_abnormal_categories_parent_id", table_name="abnormal_categories")
    op.drop_index("ix_abnormal_categories_code", table_name="abnormal_categories")
    op.drop_table("abnormal_categories")
