"""Track substitute team members and substitute papercard fills."""

import sqlalchemy as sa
from alembic import op

revision = "0050"
down_revision = "0049"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "board_members",
        sa.Column("replaces_member_id", sa.Integer(), sa.ForeignKey("board_members.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column(
        "papercard_submissions",
        sa.Column("replaced_employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("papercard_submissions", "replaced_employee_id")
    op.drop_column("board_members", "replaces_member_id")
