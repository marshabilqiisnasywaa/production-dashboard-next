from alembic import op
import sqlalchemy as sa

revision = "0038"
down_revision = "0037"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fivewhy_analyses",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_fivewhy_analyses_line_id", "fivewhy_analyses", ["line_id"])
    op.create_index("ix_fivewhy_analyses_created_by", "fivewhy_analyses", ["created_by"])
    op.create_table(
        "fivewhy_documents",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("analysis_id", sa.String(100), sa.ForeignKey("fivewhy_analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("category", sa.String(40), nullable=False),
        sa.Column("source", sa.String(10), nullable=False),
        sa.Column("url", sa.String(2000)),
        sa.Column("file_name", sa.String(255)),
        sa.Column("size", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_fivewhy_documents_analysis_id", "fivewhy_documents", ["analysis_id"])


def downgrade() -> None:
    op.drop_table("fivewhy_documents")
    op.drop_table("fivewhy_analyses")
