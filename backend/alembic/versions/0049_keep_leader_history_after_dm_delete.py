from alembic import op


revision = "0049"
down_revision = "0048"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("leader_assignments_dm_group_id_fkey", "leader_assignments", type_="foreignkey")
    op.create_foreign_key("leader_assignments_dm_group_id_fkey", "leader_assignments", "dm_groups", ["dm_group_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("leader_assignments_dm_group_id_fkey", "leader_assignments", type_="foreignkey")
    op.create_foreign_key("leader_assignments_dm_group_id_fkey", "leader_assignments", "dm_groups", ["dm_group_id"], ["id"], ondelete="RESTRICT")
