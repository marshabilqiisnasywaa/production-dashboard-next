"""Preserve scorecard leader identities."""
from alembic import op
import sqlalchemy as sa

revision = "0041"
down_revision = "0040"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("leader_assignments", "dm_group_id", existing_type=sa.Integer(), nullable=True)
    op.add_column("leader_assignments", sa.Column("leader_name_snapshot", sa.String(120), nullable=True))
    op.execute("UPDATE leader_assignments SET leader_name_snapshot = employees.name FROM employees WHERE employees.id = leader_assignments.employee_id")
    op.add_column("sqdip_entries", sa.Column("leader_employee_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_sqdip_entries_leader_employee", "sqdip_entries", "employees", ["leader_employee_id"], ["id"], ondelete="RESTRICT")
    op.execute("""UPDATE sqdip_entries SET leader_employee_id = employees.id FROM employees
        WHERE lower(trim(employees.name)) = lower(trim(sqdip_entries.leader_name))
        AND (SELECT count(*) FROM employees e WHERE lower(trim(e.name)) = lower(trim(sqdip_entries.leader_name))) = 1""")
    op.execute("""UPDATE historical_entries SET data = jsonb_set(data, '{leaderEmployeeId}', to_jsonb(employees.id)) FROM employees
        WHERE lower(trim(employees.name)) = lower(trim(historical_entries.leader_name))
        AND (SELECT count(*) FROM employees e WHERE lower(trim(e.name)) = lower(trim(historical_entries.leader_name))) = 1""")


def downgrade() -> None:
    op.drop_constraint("fk_sqdip_entries_leader_employee", "sqdip_entries", type_="foreignkey")
    op.drop_column("sqdip_entries", "leader_employee_id")
    op.drop_column("leader_assignments", "leader_name_snapshot")
    op.alter_column("leader_assignments", "dm_group_id", existing_type=sa.Integer(), nullable=False)
