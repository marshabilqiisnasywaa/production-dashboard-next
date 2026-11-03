from alembic import op
import sqlalchemy as sa


revision = "0035"
down_revision = "0034"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("papercard_submissions", sa.Column("recipient_supervisor_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "papercard_submissions_recipient_supervisor_id_fkey", "papercard_submissions", "employees",
        ["recipient_supervisor_id"], ["id"], ondelete="RESTRICT",
    )
    op.create_index("ix_papercard_submissions_recipient_supervisor_id", "papercard_submissions", ["recipient_supervisor_id"])


def downgrade() -> None:
    op.drop_index("ix_papercard_submissions_recipient_supervisor_id", table_name="papercard_submissions")
    op.drop_constraint("papercard_submissions_recipient_supervisor_id_fkey", "papercard_submissions", type_="foreignkey")
    op.drop_column("papercard_submissions", "recipient_supervisor_id")
