"""Store 5Why analyses on the server with a number, title, status and photo files."""

import re
from datetime import datetime
from zoneinfo import ZoneInfo

import sqlalchemy as sa
from alembic import op

revision = "0051"
down_revision = "0050"
branch_labels = None
depends_on = None

NUMBER = re.compile(r"^5W-\d{6}-\d{2,}$")


def upgrade() -> None:
    op.add_column("fivewhy_analyses", sa.Column("nomor", sa.String(32), nullable=True))
    op.add_column("fivewhy_analyses", sa.Column("title", sa.String(200), nullable=False, server_default=""))
    op.add_column("fivewhy_analyses", sa.Column("status", sa.String(20), nullable=False, server_default="draft"))
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, data, created_at FROM fivewhy_analyses ORDER BY created_at, id")).all()
    used: set[str] = set()
    daily: dict[str, int] = {}
    jakarta = ZoneInfo("Asia/Jakarta")
    for row in rows:
        data = row.data if isinstance(row.data, dict) else {}
        abnormal = data.get("abnormal") if isinstance(data.get("abnormal"), dict) else {}
        nomor = data.get("nomor") if isinstance(data.get("nomor"), str) else ""
        nomor = nomor.strip()
        if not NUMBER.match(nomor) or nomor in used:
            stamp = row.created_at.astimezone(jakarta).strftime("%y%m%d")
            daily[stamp] = daily.get(stamp, 0) + 1
            nomor = f"5W-{stamp}-{daily[stamp]:02d}"
            while nomor in used:
                daily[stamp] += 1
                nomor = f"5W-{stamp}-{daily[stamp]:02d}"
        used.add(nomor)
        label = abnormal.get("label") if isinstance(abnormal.get("label"), str) else ""
        status = data.get("analysisStatus")
        status = status if status in ("draft", "in_analysis", "done") else "draft"
        bind.execute(
            sa.text("UPDATE fivewhy_analyses SET nomor = :nomor, title = :title, status = :status WHERE id = :id"),
            {"nomor": nomor, "title": label.strip()[:200], "status": status, "id": row.id},
        )
    op.alter_column("fivewhy_analyses", "nomor", existing_type=sa.String(32), nullable=False)
    op.alter_column("fivewhy_analyses", "title", existing_type=sa.String(200), server_default=None)
    op.alter_column("fivewhy_analyses", "status", existing_type=sa.String(20), server_default=None)
    op.create_unique_constraint("uq_fivewhy_analyses_nomor", "fivewhy_analyses", ["nomor"])
    op.create_index("ix_fivewhy_analyses_status", "fivewhy_analyses", ["status"])
    op.create_table(
        "fivewhy_photos",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("analysis_id", sa.String(100), sa.ForeignKey("fivewhy_analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("employees.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(20), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_fivewhy_photos_analysis_id", "fivewhy_photos", ["analysis_id"])
    op.create_index("ix_fivewhy_photos_created_by", "fivewhy_photos", ["created_by"])


def downgrade() -> None:
    if op.get_bind().scalar(sa.text("SELECT COUNT(*) FROM fivewhy_photos")):
        raise RuntimeError("Downgrade dibatalkan: foto analisis 5Why masih ada. Cadangkan folder uploads/fivewhy/photos dan kosongkan tabel foto dulu.")
    op.drop_index("ix_fivewhy_photos_created_by", table_name="fivewhy_photos")
    op.drop_index("ix_fivewhy_photos_analysis_id", table_name="fivewhy_photos")
    op.drop_table("fivewhy_photos")
    op.drop_index("ix_fivewhy_analyses_status", table_name="fivewhy_analyses")
    op.drop_constraint("uq_fivewhy_analyses_nomor", "fivewhy_analyses", type_="unique")
    op.drop_column("fivewhy_analyses", "status")
    op.drop_column("fivewhy_analyses", "title")
    op.drop_column("fivewhy_analyses", "nomor")
