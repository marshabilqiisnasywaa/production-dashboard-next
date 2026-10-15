"""employee role

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-15
"""
import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column("role", sa.String(16), nullable=False, server_default="member"),
    )
    op.create_check_constraint(
        "ck_employees_role", "employees", "role IN ('member', 'leader', 'supervisor')"
    )


def downgrade() -> None:
    op.drop_constraint("ck_employees_role", "employees", type_="check")
    op.drop_column("employees", "role")
