from alembic import op
import sqlalchemy as sa

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "workshop_meeting_sessions",
        sa.Column(
            "source_session_id",
            sa.Integer(),
            sa.ForeignKey("workshop_meeting_sessions.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_workshop_meeting_sessions_source_session_id",
        "workshop_meeting_sessions",
        ["source_session_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_workshop_meeting_sessions_source_session_id", table_name="workshop_meeting_sessions")
    op.drop_column("workshop_meeting_sessions", "source_session_id")
