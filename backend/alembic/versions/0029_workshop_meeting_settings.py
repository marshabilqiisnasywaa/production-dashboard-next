"""workshop meeting settings

Revision ID: 0029
Revises: 0028
Create Date: 2026-11-02 09:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '0029'
down_revision = '0028'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('workshop_meeting_settings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('workshop_id', sa.Integer(), nullable=False),
    sa.Column('time', sa.String(length=5), nullable=False),
    sa.Column('days', sa.String(length=20), server_default='1,2,3,4,5,6,7', nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('reminder_enabled', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('reminder_minutes', sa.Integer(), server_default='15', nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['workshop_id'], ['workshops.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workshop_meeting_settings_workshop_id'), 'workshop_meeting_settings', ['workshop_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_workshop_meeting_settings_workshop_id'), table_name='workshop_meeting_settings')
    op.drop_table('workshop_meeting_settings')
