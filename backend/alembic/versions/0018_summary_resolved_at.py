from alembic import op
import sqlalchemy as sa

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column(
        "dm_meeting_summaries",
        sa.Column(
            "resolved_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

def downgrade() -> None:
    op.drop_column("dm_meeting_summaries", "resolved_at")