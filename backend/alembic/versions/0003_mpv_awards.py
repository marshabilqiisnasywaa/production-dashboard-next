"""mpv awards with monthly history

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-13
"""
import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mpv_awards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("period", sa.Date(), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("position", sa.String(120)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("line_id", "period", name="uq_mpv_awards_line_period"),
    )
    op.execute(
        """
        INSERT INTO mpv_awards (line_id, period, employee_id, position)
        SELECT b.line_id, date_trunc('month', now() - interval '1 month')::date, bm.employee_id, bm.position
        FROM board_members bm
        JOIN boards b ON b.id = bm.board_id
        WHERE bm.is_mpv AND bm.ended_at IS NULL
        ON CONFLICT DO NOTHING
        """
    )
    op.execute("UPDATE board_members SET ended_at = now() WHERE is_mpv AND ended_at IS NULL")
    op.drop_column("board_members", "is_mpv")


def downgrade() -> None:
    op.add_column(
        "board_members",
        sa.Column("is_mpv", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.drop_table("mpv_awards")
