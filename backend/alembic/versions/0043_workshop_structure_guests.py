from alembic import op
import sqlalchemy as sa

revision = "0043"
down_revision = "0042"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("supervisor_workshops", sa.Column("show_in_structure", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("workshop_meeting_attendances", sa.Column("is_guest", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("workshop_meeting_attendances", "is_guest")
    op.drop_column("supervisor_workshops", "show_in_structure")
