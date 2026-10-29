"""Mark board members who cover another line."""

import sqlalchemy as sa
from alembic import op

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "board_members",
        sa.Column("is_substitute", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("board_members", "is_substitute")
