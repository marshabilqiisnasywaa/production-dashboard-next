from alembic import op
import sqlalchemy as sa


revision = "0047"
down_revision = "0046"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table, fk in (
        ("fivewhy_documents", "fk_fivewhy_documents_line"),
        ("fivewhy_analyses", "fivewhy_analyses_line_id_fkey"),
    ):
        op.add_column(table, sa.Column("line_code", sa.String(32), nullable=True))
        op.execute(sa.text(f"UPDATE {table} SET line_code = lines.code FROM lines WHERE {table}.line_id = lines.id"))
        op.drop_constraint(fk, table, type_="foreignkey")
        op.alter_column(table, "line_id", existing_type=sa.Integer(), nullable=True)
        op.create_foreign_key(fk, table, "lines", ["line_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    for table, fk in (
        ("fivewhy_documents", "fk_fivewhy_documents_line"),
        ("fivewhy_analyses", "fivewhy_analyses_line_id_fkey"),
    ):
        if op.get_bind().scalar(sa.text(f"SELECT COUNT(*) FROM {table} WHERE line_id IS NULL")):
            raise RuntimeError(f"Downgrade dibatalkan: {table} masih punya baris tanpa line.")
        op.drop_constraint(fk, table, type_="foreignkey")
        op.alter_column(table, "line_id", existing_type=sa.Integer(), nullable=False)
        op.create_foreign_key(fk, table, "lines", ["line_id"], ["id"], ondelete="RESTRICT")
        op.drop_column(table, "line_code")
