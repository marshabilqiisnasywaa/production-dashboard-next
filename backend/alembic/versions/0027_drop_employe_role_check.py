"""drop employee role check

Revision ID: 0027
Revises: 0026
"""
from alembic import op

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("ck_employees_role", "employees", type_="check")


def downgrade() -> None:
    op.create_check_constraint(
        "ck_employees_role", "employees", "role IN ('member', 'leader', 'supervisor')"
    )
