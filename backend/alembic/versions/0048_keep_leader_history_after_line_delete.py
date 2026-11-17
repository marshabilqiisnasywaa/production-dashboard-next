from alembic import op
import sqlalchemy as sa


revision = "0048"
down_revision = "0047"
branch_labels = None
depends_on = None

TARGET_OLD = """
            (kind = 'line_leader' AND line_id IS NOT NULL)
            OR
            (kind = 'dm_leader' AND line_id IS NULL)
            """
TARGET_NEW = """
            (kind = 'line_leader' AND (line_id IS NOT NULL OR line_code_snapshot IS NOT NULL))
            OR
            (kind = 'dm_leader' AND line_id IS NULL)
            """


def upgrade() -> None:
    op.execute(sa.text(
        "UPDATE leader_assignments SET line_code_snapshot = lines.code "
        "FROM lines WHERE leader_assignments.line_id = lines.id AND leader_assignments.line_code_snapshot IS NULL"
    ))
    op.drop_constraint("ck_leader_assignments_target", "leader_assignments", type_="check")
    op.create_check_constraint("ck_leader_assignments_target", "leader_assignments", TARGET_NEW)
    op.drop_constraint("leader_assignments_line_id_fkey", "leader_assignments", type_="foreignkey")
    op.create_foreign_key("leader_assignments_line_id_fkey", "leader_assignments", "lines", ["line_id"], ["id"], ondelete="SET NULL")

    op.drop_constraint("historical_entries_line_id_fkey", "historical_entries", type_="foreignkey")
    op.alter_column("historical_entries", "line_id", existing_type=sa.Integer(), nullable=True)
    op.create_foreign_key("historical_entries_line_id_fkey", "historical_entries", "lines", ["line_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.scalar(sa.text("SELECT COUNT(*) FROM historical_entries WHERE line_id IS NULL")):
        raise RuntimeError("Downgrade dibatalkan: historical_entries masih punya baris tanpa line.")
    if bind.scalar(sa.text("SELECT COUNT(*) FROM leader_assignments WHERE kind = 'line_leader' AND line_id IS NULL")):
        raise RuntimeError("Downgrade dibatalkan: leader_assignments masih punya riwayat line yang sudah dihapus.")
    op.drop_constraint("historical_entries_line_id_fkey", "historical_entries", type_="foreignkey")
    op.alter_column("historical_entries", "line_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key("historical_entries_line_id_fkey", "historical_entries", "lines", ["line_id"], ["id"], ondelete="RESTRICT")

    op.drop_constraint("leader_assignments_line_id_fkey", "leader_assignments", type_="foreignkey")
    op.create_foreign_key("leader_assignments_line_id_fkey", "leader_assignments", "lines", ["line_id"], ["id"], ondelete="RESTRICT")
    op.drop_constraint("ck_leader_assignments_target", "leader_assignments", type_="check")
    op.create_check_constraint("ck_leader_assignments_target", "leader_assignments", TARGET_OLD)
