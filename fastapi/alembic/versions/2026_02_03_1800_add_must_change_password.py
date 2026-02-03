"""add must_change_password to users

Revision ID: 2026_02_03_1800
Revises: 14b3d74b9ef4
Create Date: 2026-02-03 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_02_03_1800'
down_revision = '5aaa8aed2cfb'
branch_labels = None
depends_on = None


def upgrade():
    # Add must_change_password column to users table
    op.add_column('users', sa.Column('must_change_password', sa.Boolean(), nullable=True, server_default='true'))
    # Update existing users to have must_change_password = false (optional, but safer for existing users)
    op.execute("UPDATE users SET must_change_password = false")


def downgrade():
    op.drop_column('users', 'must_change_password')
