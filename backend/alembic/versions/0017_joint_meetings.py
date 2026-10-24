import sqlalchemy as sa
from alembic import op

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("dm_meeting_sessions", sa.Column("meeting_scope", sa.String(8), nullable=False, server_default="line"))
    op.add_column("dm_meeting_sessions", sa.Column("source_session_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_dm_session_source", "dm_meeting_sessions", "dm_meeting_sessions", ["source_session_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_dm_meeting_sessions_source_session_id", "dm_meeting_sessions", ["source_session_id"])
    op.add_column("dm_meeting_sessions", sa.Column("dm_group_name", sa.String(120), nullable=True))
    op.add_column("dm_meeting_sessions", sa.Column("roster", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("dm_meeting_sessions", "roster")
    op.drop_column("dm_meeting_sessions", "dm_group_name")
    op.drop_index("ix_dm_meeting_sessions_source_session_id", table_name="dm_meeting_sessions")
    op.drop_constraint("fk_dm_session_source", "dm_meeting_sessions", type_="foreignkey")
    op.drop_column("dm_meeting_sessions", "source_session_id")
    op.drop_column("dm_meeting_sessions", "meeting_scope")
