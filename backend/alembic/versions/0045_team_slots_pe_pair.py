from alembic import op

revision = "0045"
down_revision = "0044"
branch_labels = None
depends_on = None

QC_NAMES = "('QC', 'QA', 'QUALITY', 'QUALITY CONTROL')"


def shift(department_filter: str, source: int, target: int) -> None:
    op.execute(
        "UPDATE board_members SET sort_order = %d WHERE sort_order = %d "
        "AND employee_id IN (SELECT id FROM employees WHERE upper(trim(dept)) %s)"
        % (target, source, department_filter)
    )


def upgrade() -> None:
    shift("= 'ME'", 4, 5)
    shift("IN " + QC_NAMES, 3, 4)


def downgrade() -> None:
    shift("IN " + QC_NAMES, 4, 3)
    shift("= 'ME'", 5, 4)
