from alembic import op
import sqlalchemy as sa

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "supervisor_workshops",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("workshop_id", sa.Integer(), sa.ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_supervisor_workshops_employee_id", "supervisor_workshops", ["employee_id"])
    op.create_index("ix_supervisor_workshops_workshop_id", "supervisor_workshops", ["workshop_id"])
    op.create_index("uq_supervisor_workshop", "supervisor_workshops", ["employee_id", "workshop_id"], unique=True)

    op.create_table(
        "workshop_meeting_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workshop_id", sa.Integer(), sa.ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False),
        sa.Column("host_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL")),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("label", sa.String(60)),
        sa.Column("scheduled_time", sa.String(8), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("ended_at", sa.DateTime(timezone=True)),
        sa.Column("duration_seconds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("roster", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_workshop_meeting_sessions_workshop_id", "workshop_meeting_sessions", ["workshop_id"])
    op.create_index("ix_workshop_meeting_sessions_host_id", "workshop_meeting_sessions", ["host_id"])
    op.create_index("ix_workshop_meeting_sessions_date", "workshop_meeting_sessions", ["date"])
    op.create_index("uq_workshop_session_workshop_date", "workshop_meeting_sessions", ["workshop_id", "date"], unique=True)

    op.create_table(
        "workshop_meeting_attendances",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("workshop_meeting_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="present"),
        sa.Column("verification_method", sa.String(32), nullable=False, server_default="face_id"),
        sa.Column("face_confidence", sa.Float()),
        sa.Column("attended_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("notes", sa.Text()),
        sa.Column("note_by_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL")),
        sa.Column("note_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_workshop_meeting_attendances_session_id", "workshop_meeting_attendances", ["session_id"])
    op.create_index("ix_workshop_meeting_attendances_employee_id", "workshop_meeting_attendances", ["employee_id"])
    op.create_index("uq_workshop_attendance_session_employee", "workshop_meeting_attendances", ["session_id", "employee_id"], unique=True)

    op.create_table(
        "workshop_meeting_summaries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("workshop_meeting_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("problem", sa.Text(), nullable=False),
        sa.Column("problem_categories", sa.JSON()),
        sa.Column("solution", sa.Text()),
        sa.Column("pic_name", sa.String(120), nullable=False),
        sa.Column("pic_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL")),
        sa.Column("due_date", sa.String(32)),
        sa.Column("line_code", sa.String(32)),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_workshop_meeting_summaries_session_id", "workshop_meeting_summaries", ["session_id"])
    op.create_index("ix_workshop_meeting_summaries_pic_id", "workshop_meeting_summaries", ["pic_id"])


def downgrade() -> None:
    op.drop_table("workshop_meeting_summaries")
    op.drop_table("workshop_meeting_attendances")
    op.drop_table("workshop_meeting_sessions")
    op.drop_table("supervisor_workshops")
