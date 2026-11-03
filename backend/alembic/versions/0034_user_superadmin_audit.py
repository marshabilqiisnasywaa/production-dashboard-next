from alembic import op
import sqlalchemy as sa


revision = "0034"
down_revision = "0033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("leader_assignments", sa.Column("created_by_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "leader_assignments_created_by_user_id_fkey", "leader_assignments", "users",
        ["created_by_user_id"], ["id"], ondelete="RESTRICT",
    )
    op.create_index("ix_leader_assignments_created_by_user_id", "leader_assignments", ["created_by_user_id"])
    op.alter_column("leader_assignments", "created_by_employee_id", existing_type=sa.Integer(), nullable=True)
    op.create_check_constraint(
        "ck_leader_assignments_creator", "leader_assignments",
        "(created_by_employee_id IS NOT NULL AND created_by_user_id IS NULL) OR "
        "(created_by_employee_id IS NULL AND created_by_user_id IS NOT NULL)",
    )


def downgrade() -> None:
    connection = op.get_bind()
    if connection.scalar(sa.text("SELECT count(*) FROM leader_assignments WHERE created_by_employee_id IS NULL")):
        raise RuntimeError("Riwayat yang dibuat superadmin users harus dipetakan ke employee sebelum downgrade.")
    op.drop_constraint("ck_leader_assignments_creator", "leader_assignments", type_="check")
    op.alter_column("leader_assignments", "created_by_employee_id", existing_type=sa.Integer(), nullable=False)
    op.drop_index("ix_leader_assignments_created_by_user_id", table_name="leader_assignments")
    op.drop_constraint("leader_assignments_created_by_user_id_fkey", "leader_assignments", type_="foreignkey")
    op.drop_column("leader_assignments", "created_by_user_id")
