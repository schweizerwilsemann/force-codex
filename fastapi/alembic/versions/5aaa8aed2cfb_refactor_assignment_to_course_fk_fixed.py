"""refactor_assignment_to_course_fk_fixed

Revision ID: 5aaa8aed2cfb
Revises: fe93ca7d13ac
Create Date: 2026-01-29 20:40:24.484531

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5aaa8aed2cfb'
down_revision: Union[str, Sequence[str], None] = 'fe93ca7d13ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add course_id as NULLABLE first
    op.add_column('assignments', sa.Column('course_id', sa.UUID(), nullable=True))
    
    # 2. Creating FK to courses (so we can use it, though not strictly needed for update if using SQL directly)
    op.create_foreign_key(None, 'assignments', 'courses', ['course_id'], ['course_id'])

    # 3. Migrate Data: Update course_id based on class_id
    op.execute("""
        UPDATE assignments 
        SET course_id = classes.course_id 
        FROM classes 
        WHERE assignments.class_id = classes.class_id
    """)

    # 4. Make course_id NOT NULL
    op.alter_column('assignments', 'course_id', nullable=False)

    # 5. Drop class_id and old index
    op.drop_index('idx_assignments_class', table_name='assignments')
    op.drop_constraint('assignments_class_id_fkey', 'assignments', type_='foreignkey')
    op.drop_column('assignments', 'class_id')

    # 6. Add index for course_id (optional but good)
    op.create_index(op.f('ix_assignments_course_id'), 'assignments', ['course_id'], unique=False)



def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('assignments', sa.Column('class_id', sa.UUID(), nullable=True))
    op.create_foreign_key('assignments_class_id_fkey', 'assignments', 'classes', ['class_id'], ['class_id'])
    # Revert data? Harder without map.
    op.drop_index(op.f('ix_assignments_course_id'), table_name='assignments')
    op.drop_constraint(None, 'assignments', type_='foreignkey')
    op.drop_column('assignments', 'course_id')
    op.alter_column('assignments', 'created_at',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True,
               existing_server_default=sa.text('CURRENT_TIMESTAMP'))
    op.alter_column('assignments', 'due_date',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True)
    op.alter_column('assignments', 'start_date',
               existing_type=sa.TIMESTAMP(timezone=True),
               type_=postgresql.TIMESTAMP(),
               existing_nullable=True,
               existing_server_default=sa.text('CURRENT_TIMESTAMP'))
    op.alter_column('assignments', 'max_score',
               existing_type=sa.Integer(),
               type_=sa.NUMERIC(precision=5, scale=2),
               existing_nullable=True,
               existing_server_default=sa.text('100'))
    op.alter_column('assignments', 'title',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.alter_column('assignments', 'problem_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.drop_column('assignments', 'course_id')
    op.create_table('notifications',
    sa.Column('notification_id', sa.UUID(), server_default=sa.text('uuid_generate_v7()'), autoincrement=False, nullable=False),
    sa.Column('user_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('title', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('message', sa.TEXT(), autoincrement=False, nullable=False),
    sa.Column('type', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('is_read', sa.BOOLEAN(), server_default=sa.text('false'), autoincrement=False, nullable=True),
    sa.Column('link_url', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], name=op.f('notifications_user_id_fkey'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('notification_id', name=op.f('notifications_pkey'))
    )
    op.create_table('student_import_batches',
    sa.Column('batch_id', sa.UUID(), server_default=sa.text('uuid_generate_v7()'), autoincrement=False, nullable=False),
    sa.Column('lecturer_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('file_name', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('file_type', sa.VARCHAR(length=10), autoincrement=False, nullable=True),
    sa.Column('total_records', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('successful_imports', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=True),
    sa.Column('failed_imports', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=True),
    sa.Column('status', sa.VARCHAR(length=20), server_default=sa.text("'processing'::character varying"), autoincrement=False, nullable=True),
    sa.Column('error_log', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['lecturer_id'], ['lecturers.lecturer_id'], name=op.f('student_import_batches_lecturer_id_fkey')),
    sa.PrimaryKeyConstraint('batch_id', name=op.f('student_import_batches_pkey'))
    )
    op.create_table('code_fingerprints',
    sa.Column('fingerprint_id', sa.UUID(), server_default=sa.text('uuid_generate_v7()'), autoincrement=False, nullable=False),
    sa.Column('submission_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('problem_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('structure_hash', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('variable_pattern', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('logic_signature', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['problem_id'], ['problems.problem_id'], name=op.f('code_fingerprints_problem_id_fkey')),
    sa.ForeignKeyConstraint(['submission_id'], ['submissions.submission_id'], name=op.f('code_fingerprints_submission_id_fkey'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('fingerprint_id', name=op.f('code_fingerprints_pkey'))
    )
    op.create_table('enrollments',
    sa.Column('enrollment_id', sa.UUID(), server_default=sa.text('uuid_generate_v7()'), autoincrement=False, nullable=False),
    sa.Column('class_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('student_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('enrolled_at', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=True),
    sa.Column('status', sa.VARCHAR(length=20), server_default=sa.text("'active'::character varying"), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['class_id'], ['classes.class_id'], name=op.f('enrollments_class_id_fkey')),
    sa.ForeignKeyConstraint(['student_id'], ['students.student_id'], name=op.f('enrollments_student_id_fkey')),
    sa.PrimaryKeyConstraint('enrollment_id', name=op.f('enrollments_pkey')),
    sa.UniqueConstraint('class_id', 'student_id', name=op.f('enrollments_class_id_student_id_key'), postgresql_include=[], postgresql_nulls_not_distinct=False)
    )
    op.create_table('ai_hint_configs',
    sa.Column('config_id', sa.UUID(), server_default=sa.text('uuid_generate_v7()'), autoincrement=False, nullable=False),
    sa.Column('assignment_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('max_hints_per_student', sa.INTEGER(), server_default=sa.text('3'), autoincrement=False, nullable=True),
    sa.Column('hint_cooldown_minutes', sa.INTEGER(), server_default=sa.text('10'), autoincrement=False, nullable=True),
    sa.Column('allow_code_hints', sa.BOOLEAN(), server_default=sa.text('true'), autoincrement=False, nullable=True),
    sa.Column('allow_algorithm_hints', sa.BOOLEAN(), server_default=sa.text('true'), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['assignment_id'], ['assignments.assignment_id'], name=op.f('ai_hint_configs_assignment_id_fkey')),
    sa.PrimaryKeyConstraint('config_id', name=op.f('ai_hint_configs_pkey'))
    )
    op.create_table('ai_hint_usage',
    sa.Column('usage_id', sa.UUID(), server_default=sa.text('uuid_generate_v7()'), autoincrement=False, nullable=False),
    sa.Column('student_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('assignment_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('hints_used', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=True),
    sa.Column('last_hint_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['assignment_id'], ['assignments.assignment_id'], name=op.f('ai_hint_usage_assignment_id_fkey')),
    sa.ForeignKeyConstraint(['student_id'], ['students.student_id'], name=op.f('ai_hint_usage_student_id_fkey')),
    sa.PrimaryKeyConstraint('usage_id', name=op.f('ai_hint_usage_pkey')),
    sa.UniqueConstraint('student_id', 'assignment_id', name=op.f('ai_hint_usage_student_id_assignment_id_key'), postgresql_include=[], postgresql_nulls_not_distinct=False)
    )
    op.create_table('email_queue',
    sa.Column('email_id', sa.UUID(), server_default=sa.text('uuid_generate_v7()'), autoincrement=False, nullable=False),
    sa.Column('recipient_email', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('subject', sa.VARCHAR(length=500), autoincrement=False, nullable=False),
    sa.Column('body', sa.TEXT(), autoincrement=False, nullable=False),
    sa.Column('email_type', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('status', sa.VARCHAR(length=20), server_default=sa.text("'pending'::character varying"), autoincrement=False, nullable=True),
    sa.Column('retry_count', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=True),
    sa.Column('max_retries', sa.INTEGER(), server_default=sa.text('3'), autoincrement=False, nullable=True),
    sa.Column('error_message', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('sent_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('email_id', name=op.f('email_queue_pkey'))
    )
    op.create_table('plagiarism_checks',
    sa.Column('check_id', sa.UUID(), server_default=sa.text('uuid_generate_v7()'), autoincrement=False, nullable=False),
    sa.Column('submission_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('ai_generated_probability', sa.NUMERIC(precision=5, scale=2), autoincrement=False, nullable=True),
    sa.Column('is_suspicious', sa.BOOLEAN(), server_default=sa.text('false'), autoincrement=False, nullable=True),
    sa.Column('confidence_level', sa.VARCHAR(length=20), autoincrement=False, nullable=True),
    sa.Column('detection_method', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('analysis_details', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('flagged_sections', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('similar_submissions', postgresql.JSONB(astext_type=sa.Text()), autoincrement=False, nullable=True),
    sa.Column('checked_at', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=True),
    sa.Column('reviewed_by', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('review_status', sa.VARCHAR(length=20), autoincrement=False, nullable=True),
    sa.Column('review_notes', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('reviewed_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['reviewed_by'], ['users.user_id'], name=op.f('plagiarism_checks_reviewed_by_fkey')),
    sa.ForeignKeyConstraint(['submission_id'], ['submissions.submission_id'], name=op.f('plagiarism_checks_submission_id_fkey')),
    sa.PrimaryKeyConstraint('check_id', name=op.f('plagiarism_checks_pkey'))
    )
    op.create_index(op.f('idx_plagiarism_suspicious'), 'plagiarism_checks', ['is_suspicious'], unique=False)
    op.create_index(op.f('idx_plagiarism_submission'), 'plagiarism_checks', ['submission_id'], unique=False)
    op.create_index(op.f('idx_plagiarism_review_status'), 'plagiarism_checks', ['review_status'], unique=False)
    op.create_table('ai_hints',
    sa.Column('hint_id', sa.UUID(), server_default=sa.text('uuid_generate_v7()'), autoincrement=False, nullable=False),
    sa.Column('assignment_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('student_id', sa.UUID(), autoincrement=False, nullable=True),
    sa.Column('student_question', sa.TEXT(), autoincrement=False, nullable=False),
    sa.Column('student_code_snapshot', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('ai_response', sa.TEXT(), autoincrement=False, nullable=False),
    sa.Column('hint_type', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('ai_model', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('tokens_used', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('response_time_ms', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['assignment_id'], ['assignments.assignment_id'], name=op.f('ai_hints_assignment_id_fkey')),
    sa.ForeignKeyConstraint(['student_id'], ['students.student_id'], name=op.f('ai_hints_student_id_fkey')),
    sa.PrimaryKeyConstraint('hint_id', name=op.f('ai_hints_pkey'))
    )
    op.create_index(op.f('idx_ai_hints_student_assignment'), 'ai_hints', ['student_id', 'assignment_id'], unique=False)
    op.create_index(op.f('idx_ai_hints_created'), 'ai_hints', [sa.literal_column('created_at DESC')], unique=False)
    # ### end Alembic commands ###
