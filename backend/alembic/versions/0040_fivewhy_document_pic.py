from alembic import op
import sqlalchemy as sa

revision = "0040"
down_revision = "0039"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("fivewhy_documents", sa.Column("pic_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_fivewhy_documents_pic", "fivewhy_documents", "employees", ["pic_id"], ["id"], ondelete="RESTRICT")
    op.create_index("ix_fivewhy_documents_pic_id", "fivewhy_documents", ["pic_id"])


def downgrade() -> None:
    op.drop_index("ix_fivewhy_documents_pic_id", table_name="fivewhy_documents")
    op.drop_constraint("fk_fivewhy_documents_pic", "fivewhy_documents", type_="foreignkey")
    op.drop_column("fivewhy_documents", "pic_id")
