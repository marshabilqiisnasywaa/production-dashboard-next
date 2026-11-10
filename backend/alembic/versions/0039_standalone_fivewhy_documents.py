from alembic import op
import sqlalchemy as sa

revision = "0039"
down_revision = "0038"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("fivewhy_documents", sa.Column("line_id", sa.Integer(), nullable=True))
    op.add_column("fivewhy_documents", sa.Column("created_by", sa.Integer(), nullable=True))
    op.execute(sa.text("UPDATE fivewhy_documents SET line_id = a.line_id, created_by = a.created_by FROM fivewhy_analyses a WHERE fivewhy_documents.analysis_id = a.id"))
    op.alter_column("fivewhy_documents", "line_id", nullable=False)
    op.alter_column("fivewhy_documents", "created_by", nullable=False)
    op.create_foreign_key("fk_fivewhy_documents_line", "fivewhy_documents", "lines", ["line_id"], ["id"], ondelete="RESTRICT")
    op.create_foreign_key("fk_fivewhy_documents_creator", "fivewhy_documents", "employees", ["created_by"], ["id"], ondelete="RESTRICT")
    op.create_index("ix_fivewhy_documents_line_id", "fivewhy_documents", ["line_id"])
    op.create_index("ix_fivewhy_documents_created_by", "fivewhy_documents", ["created_by"])
    op.drop_index("ix_fivewhy_documents_analysis_id", table_name="fivewhy_documents")
    op.drop_column("fivewhy_documents", "analysis_id")


def downgrade() -> None:
    if op.get_bind().scalar(sa.text("SELECT COUNT(*) FROM fivewhy_documents")):
        raise RuntimeError("Downgrade dibatalkan: dokumen mandiri masih ada. Cadangkan dan pindahkan dokumen sebelum downgrade.")
    op.add_column("fivewhy_documents", sa.Column("analysis_id", sa.String(100), nullable=False))
    op.create_foreign_key("fk_fivewhy_documents_analysis", "fivewhy_documents", "fivewhy_analyses", ["analysis_id"], ["id"], ondelete="CASCADE")
    op.create_index("ix_fivewhy_documents_analysis_id", "fivewhy_documents", ["analysis_id"])
    op.drop_index("ix_fivewhy_documents_created_by", table_name="fivewhy_documents")
    op.drop_index("ix_fivewhy_documents_line_id", table_name="fivewhy_documents")
    op.drop_constraint("fk_fivewhy_documents_creator", "fivewhy_documents", type_="foreignkey")
    op.drop_constraint("fk_fivewhy_documents_line", "fivewhy_documents", type_="foreignkey")
    op.drop_column("fivewhy_documents", "created_by")
    op.drop_column("fivewhy_documents", "line_id")
