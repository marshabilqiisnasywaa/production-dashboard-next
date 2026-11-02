"""holidays

Revision ID: 0030
Revises: 0029
Create Date: 2026-11-02 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '0030'
down_revision = '0029'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('holidays',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('kind', sa.String(length=12), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_holidays_date'), 'holidays', ['date'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_holidays_date'), table_name='holidays')
    op.drop_table('holidays')
