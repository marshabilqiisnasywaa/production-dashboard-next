from alembic import op
import sqlalchemy as sa


revision = "0036"
down_revision = "0035"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dm_meeting_summaries", sa.Column("last_escalated_on", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("dm_meeting_summaries", "last_escalated_on")
