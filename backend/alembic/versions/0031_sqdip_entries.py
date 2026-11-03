"""sqdip entries

Revision ID: 0031
Revises: 0030
Create Date: 2026-11-03 09:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '0031'
down_revision = '0030'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('sqdip_entries',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('line_code', sa.String(length=32), nullable=False),
    sa.Column('leader_name', sa.String(length=120), nullable=False),
    sa.Column('dimension', sa.String(length=16), nullable=False),
    sa.Column('actual', sa.Float(), nullable=True),
    sa.Column('points', sa.Integer(), nullable=False),
    sa.Column('source_file', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('points IN (0, 6)', name='ck_sqdip_entries_points'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sqdip_entries_line_code'), 'sqdip_entries', ['line_code'], unique=False)
    op.create_index('uq_sqdip_entry_date_line_leader_dim', 'sqdip_entries', ['date', 'line_code', 'leader_name', 'dimension'], unique=True)


def downgrade() -> None:
    op.drop_index('uq_sqdip_entry_date_line_leader_dim', table_name='sqdip_entries')
    op.drop_index(op.f('ix_sqdip_entries_line_code'), table_name='sqdip_entries')
    op.drop_table('sqdip_entries')
