"""employee login

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-15
"""
import bcrypt
import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("password_hash", sa.String(255)))
    op.add_column(
        "employees",
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default="true"),
    )
    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT id, employee_no FROM employees")).all()
    for employee_id, employee_no in rows:
        hashed = bcrypt.hashpw(employee_no.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        connection.execute(
            sa.text("UPDATE employees SET password_hash = :hash WHERE id = :id"),
            {"hash": hashed, "id": employee_id},
        )


def downgrade() -> None:
    op.drop_column("employees", "must_change_password")
    op.drop_column("employees", "password_hash")
