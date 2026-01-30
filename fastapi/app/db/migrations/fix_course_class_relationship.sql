-- Migration: Fix Course-Class-Student Relationship
-- Date: 2026-01-30
-- Description: Separate Class (administrative) from Course (academic subject)
-- NOTE: This script is IDEMPOTENT - safe to run multiple times

-- ============================================
-- STEP 1: Modify 'classes' table (now Administrative Class)
-- ============================================

-- Remove the course_id FK if it exists
DO $$ BEGIN
    ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_course_id_fkey;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE classes DROP COLUMN IF EXISTS course_id;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Add administrative fields if not exist
ALTER TABLE classes ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- ============================================
-- STEP 2: Update 'students' table - add class_id FK
-- ============================================

-- Add class_id as foreign key if not exists
DO $$ BEGIN
    ALTER TABLE students ADD COLUMN class_id UUID;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Add FK constraint if not exists
DO $$ BEGIN
    ALTER TABLE students ADD CONSTRAINT students_class_id_fkey 
        FOREIGN KEY (class_id) REFERENCES classes(class_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);

-- ============================================
-- STEP 3: Create or rename to 'course_enrollments'
-- ============================================

-- Check if course_enrollments already exists, if not check if enrollments exists and rename
DO $$ BEGIN
    -- If enrollments exists but course_enrollments doesn't, rename it
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
        
        -- Drop old constraints
        ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_class_id_fkey;
        ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_student_id_fkey;
        ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_class_id_student_id_key;
        
        -- Rename column and table
        ALTER TABLE enrollments RENAME COLUMN class_id TO course_id;
        ALTER TABLE enrollments RENAME TO course_enrollments;
        
        -- Add new constraints
        ALTER TABLE course_enrollments ADD CONSTRAINT enrollments_course_id_fkey 
            FOREIGN KEY (course_id) REFERENCES courses(course_id);
        ALTER TABLE course_enrollments ADD CONSTRAINT enrollments_student_id_fkey 
            FOREIGN KEY (student_id) REFERENCES students(student_id);
        ALTER TABLE course_enrollments ADD CONSTRAINT enrollments_unique_course_student 
            UNIQUE (course_id, student_id);
    END IF;
    
    -- If neither exist, create course_enrollments
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_enrollments') THEN
        CREATE TABLE course_enrollments (
            enrollment_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
            course_id UUID NOT NULL REFERENCES courses(course_id),
            student_id UUID NOT NULL REFERENCES students(student_id),
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) DEFAULT 'active',
            UNIQUE(course_id, student_id)
        );
    END IF;
END $$;

-- ============================================
-- STEP 4: Drop obsolete 'student_enrollments' table (if exists)
-- ============================================

DROP TABLE IF EXISTS student_enrollments CASCADE;

-- ============================================
-- STEP 5: Create indexes if not exist
-- ============================================

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON course_enrollments(student_id);

-- ============================================
-- DONE: Verify the new structure with:
-- \d classes
-- \d students  
-- \d course_enrollments
-- ============================================
