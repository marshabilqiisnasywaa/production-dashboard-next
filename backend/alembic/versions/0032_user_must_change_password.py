"""user must change password

Revision ID: 0032
Revises: 0031
Create Date: 2026-11-03 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '0032'
down_revision = '0031'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    op.drop_column('users', 'must_change_password')
