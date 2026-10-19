"""employee supervisor reference

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-16
"""
import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column("supervisor_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL")),
    )
    op.create_index("ix_employees_supervisor_id", "employees", ["supervisor_id"])


def downgrade() -> None:
    op.drop_index("ix_employees_supervisor_id", table_name="employees")
    op.drop_column("employees", "supervisor_id")
