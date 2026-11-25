"""Add document fields (phase, purpose, scope, owner, ...) to flowcharts.

Uses IF NOT EXISTS so it is safe on databases that already got these columns
from the earlier edited version of 0052.
"""

from alembic import op

revision = "0053"
down_revision = "0052"
branch_labels = None
depends_on = None

COLUMNS = {
    "phase": "VARCHAR(10) NOT NULL DEFAULT 'during'",
    "subtitle": "VARCHAR(200) NOT NULL DEFAULT ''",
    "purpose": "TEXT NOT NULL DEFAULT ''",
    "scope": "TEXT NOT NULL DEFAULT ''",
    "effective_date": "DATE",
    "version": "VARCHAR(20) NOT NULL DEFAULT ''",
    "owner": "VARCHAR(120) NOT NULL DEFAULT ''",
    "approver": "VARCHAR(120) NOT NULL DEFAULT ''",
    "status": "VARCHAR(10) NOT NULL DEFAULT 'published'",
    "requirements": "JSON NOT NULL DEFAULT '[]'::json",
    "contacts": "JSON NOT NULL DEFAULT '[]'::json",
}


def upgrade() -> None:
    for name, ddl in COLUMNS.items():
        op.execute(f"ALTER TABLE flowcharts ADD COLUMN IF NOT EXISTS {name} {ddl}")


def downgrade() -> None:
    for name in reversed(list(COLUMNS)):
        op.execute(f"ALTER TABLE flowcharts DROP COLUMN IF EXISTS {name}")