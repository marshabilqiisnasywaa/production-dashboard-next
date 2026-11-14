from alembic import op
import sqlalchemy as sa

revision = "0044"
down_revision = "0043"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for prefix in ("dm", "workshop"):
        parent = f"{prefix}_meeting_summaries"
        for kind in ("lines", "pics"):
            table = f"{prefix}_summary_{kind}"
            fields = [
                sa.Column("id", sa.Integer(), primary_key=True),
                sa.Column("summary_id", sa.Integer(), sa.ForeignKey(f"{parent}.id", ondelete="CASCADE"), nullable=False),
            ]
            if kind == "lines":
                fields += [sa.Column("line_id", sa.Integer(), sa.ForeignKey("lines.id", ondelete="SET NULL")), sa.Column("code", sa.String(32), nullable=False)]
            else:
                fields += [sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id", ondelete="SET NULL")), sa.Column("name", sa.String(120), nullable=False)]
            op.create_table(table, *fields)
            for column in ("summary_id", "line_id" if kind == "lines" else "employee_id"):
                op.create_index(f"ix_{table}_{column}", table, [column])
        if prefix == "dm":
            op.execute(sa.text("INSERT INTO dm_summary_lines (summary_id, line_id, code) SELECT s.id, l.id, COALESCE(NULLIF(s.line_code, ''), l.code) FROM dm_meeting_summaries s JOIN lines l ON l.id = s.line_id"))
        else:
            op.execute(sa.text("INSERT INTO workshop_summary_lines (summary_id, line_id, code) SELECT s.id, l.id, s.line_code FROM workshop_meeting_summaries s LEFT JOIN lines l ON l.code = s.line_code WHERE s.line_code IS NOT NULL AND s.line_code <> ''"))
        op.execute(sa.text(f"INSERT INTO {prefix}_summary_pics (summary_id, employee_id, name) SELECT id, pic_id, pic_name FROM {parent}"))


def downgrade() -> None:
    for prefix in ("workshop", "dm"):
        op.drop_table(f"{prefix}_summary_pics")
        op.drop_table(f"{prefix}_summary_lines")
