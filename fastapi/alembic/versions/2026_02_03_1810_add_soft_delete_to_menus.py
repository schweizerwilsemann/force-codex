"""add soft-delete columns to menus

Revision ID: 2026_02_03_1810
Revises: 2026_02_03_1800
Create Date: 2026-02-03 18:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_02_03_1810'
down_revision = '2026_02_03_1800'
branch_labels = None
depends_on = None


def upgrade():
    # Add soft-delete columns to menus
    op.add_column('menus', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('menus', sa.Column('deleted_at', sa.TIMESTAMP(timezone=True), nullable=True))


def downgrade():
    op.drop_column('menus', 'deleted_at')
    op.drop_column('menus', 'is_deleted')
