"""face templates

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-20
"""
import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "face_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="CASCADE"), nullable=False),
        sa.Column("embedding", sa.LargeBinary(), nullable=False),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("quality", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("source IN ('photo', 'camera')", name="ck_face_templates_source"),
    )
    op.create_index("ix_face_templates_employee_id", "face_templates", ["employee_id"])


def downgrade() -> None:
    op.drop_index("ix_face_templates_employee_id", table_name="face_templates")
    op.drop_table("face_templates")
