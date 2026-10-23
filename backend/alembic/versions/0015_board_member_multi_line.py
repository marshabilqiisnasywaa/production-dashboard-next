"""board member multi line

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-22
"""
import sqlalchemy as sa
from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("uq_board_members_active_employee", table_name="board_members")
    op.create_index(
        "uq_board_members_active_board_employee",
        "board_members",
        ["board_id", "employee_id"],
        unique=True,
        postgresql_where=sa.text("ended_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_board_members_active_board_employee", table_name="board_members")
    op.create_index(
        "uq_board_members_active_employee",
        "board_members",
        ["employee_id"],
        unique=True,
        postgresql_where=sa.text("ended_at IS NULL"),
    )
