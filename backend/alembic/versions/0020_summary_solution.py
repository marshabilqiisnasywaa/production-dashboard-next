from alembic import op
import sqlalchemy as sa

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column(
        "dm_meeting_summaries",
        sa.Column("solution", sa.Text(), nullable=True),
    )

def downgrade() -> None:
    op.drop_column("dm_meeting_summaries", "solution")