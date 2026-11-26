"""Recalculate SQDIP entry points from actual values and dimension targets."""

from alembic import op

revision = "0056"
down_revision = "0055"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE sqdip_entries
        SET points = CASE
            WHEN actual IS NULL THEN 0
            WHEN dimension = 'Safety' AND actual <= 0 + 1e-9 THEN 6
            WHEN dimension = 'Quality' AND actual >= 0.92 - 1e-9 THEN 6
            WHEN dimension = 'Delivery' AND actual >= 1.0 - 1e-9 THEN 6
            WHEN dimension = 'Inventory' AND actual <= 400.0 + 1e-9 THEN 6
            WHEN dimension = 'Productivity' AND actual >= 0.87 - 1e-9 THEN 6
            ELSE 0
        END
        """
    )


def downgrade() -> None:
    pass
