"""create dm_groups table and add dm_group_id to lines

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-23
"""
import sqlalchemy as sa
from alembic import op

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create dm_groups table
    op.create_table(
        "dm_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "workshop_id",
            sa.Integer(),
            sa.ForeignKey("workshops.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(length=120), nullable=False, index=True),
        sa.Column("description", sa.Text(), server_default="", nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # 2. Add dm_group_id to lines
    op.add_column(
        "lines",
        sa.Column(
            "dm_group_id",
            sa.Integer(),
            sa.ForeignKey("dm_groups.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("lines", "dm_group_id")
    op.drop_table("dm_groups")
