"""papercard tables

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-16
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. papercard_templates
    op.create_table(
        "papercard_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workshop_id", sa.Integer(), sa.ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False),
        sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("department", sa.String(32), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("version", sa.String(16), nullable=False, server_default="v1.0"),
        sa.Column("window_start", sa.String(8), nullable=False, server_default="07:30"),
        sa.Column("window_end", sa.String(8), nullable=False, server_default="08:15"),
        sa.Column("template_data", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_papercard_templates_workshop_id", "papercard_templates", ["workshop_id"])
    op.create_index("ix_papercard_templates_line_id", "papercard_templates", ["line_id"])
    op.create_index("ix_papercard_templates_department", "papercard_templates", ["department"])
    op.create_index(
        "uq_papercard_template_line_dept",
        "papercard_templates",
        ["line_id", "department"],
        unique=True,
    )

    # 2. papercard_submissions
    op.create_table(
        "papercard_submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("papercard_templates.id", ondelete="SET NULL")),
        sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("department", sa.String(32), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("shift", sa.String(16), nullable=False, server_default="Shift 1"),
        sa.Column("answers", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("abnormal_notes", sa.Text()),
        sa.Column("status", sa.String(16), nullable=False, server_default="submitted"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("approval_status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("supervisor_notes", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_papercard_submissions_line_id", "papercard_submissions", ["line_id"])
    op.create_index("ix_papercard_submissions_employee_id", "papercard_submissions", ["employee_id"])
    op.create_index("ix_papercard_submissions_department", "papercard_submissions", ["department"])
    op.create_index("ix_papercard_submissions_date", "papercard_submissions", ["date"])
    op.create_index(
        "uq_papercard_submission_line_dept_date_shift",
        "papercard_submissions",
        ["line_id", "department", "date", "shift"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_table("papercard_submissions")
    op.drop_table("papercard_templates")
