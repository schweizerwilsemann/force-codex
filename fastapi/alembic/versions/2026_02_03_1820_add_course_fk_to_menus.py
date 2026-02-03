"""add course_id FK to menus

Revision ID: 2026_02_03_1820
Revises: 2026_02_03_1810
Create Date: 2026-02-03 18:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2026_02_03_1820'
down_revision = '2026_02_03_1810'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('menus', sa.Column('course_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('courses.course_id'), nullable=True))


def downgrade():
    op.drop_constraint('menus_course_id_fkey', 'menus', type_='foreignkey')
    op.drop_column('menus', 'course_id')
