"""employee position

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-15
"""
import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("position", sa.String(120)))
    op.execute(
        """
        UPDATE employees e SET position = s.position
        FROM (
            SELECT DISTINCT ON (employee_id) employee_id, position
            FROM board_members
            WHERE position IS NOT NULL AND position <> ''
            ORDER BY employee_id, (ended_at IS NULL) DESC, started_at DESC
        ) s
        WHERE e.id = s.employee_id
        """
    )
    op.execute(
        """
        UPDATE employees e SET position = s.position
        FROM (
            SELECT DISTINCT ON (employee_id) employee_id, position
            FROM mpv_awards
            WHERE position IS NOT NULL AND position <> ''
            ORDER BY employee_id, period DESC
        ) s
        WHERE e.id = s.employee_id AND e.position IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column("employees", "position")
