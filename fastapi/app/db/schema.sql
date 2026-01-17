-- ================================================
-- PHASE 1: CORE SYSTEM + AI FEATURES
-- Hệ thống submit code với AI hints & plagiarism detection
-- ================================================

-- PostgreSQL 18 hỗ trợ UUIDv7 native - tốt hơn UUIDv4
-- UUIDv7 có timestamp-ordered, tốt cho indexing và performance
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE EXTENSION IF NOT EXISTS pg_uuidv7;

-- ================================================
-- 1. QUẢN LÝ NGƯỜI DÙNG CƠ BẢN
-- ================================================

CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'lecturer', 'student'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(role_id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    student_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    student_code VARCHAR(20) UNIQUE NOT NULL,
    class_name VARCHAR(100),
    year_of_admission INTEGER,
    major VARCHAR(100)
);

CREATE TABLE lecturers (
    lecturer_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    lecturer_code VARCHAR(20) UNIQUE,
    department VARCHAR(100)
);

-- ================================================
-- 2. IMPORT SINH VIÊN HÀNG LOẠT
-- ================================================

CREATE TABLE student_import_batches (
    batch_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    lecturer_id UUID REFERENCES lecturers(lecturer_id),
    file_name VARCHAR(255),
    file_type VARCHAR(10), -- 'excel', 'pdf'
    total_records INTEGER,
    successful_imports INTEGER DEFAULT 0,
    failed_imports INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processing', -- processing, completed, failed
    error_log JSONB, -- [{row: 5, error: "Email đã tồn tại"}]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lưu mật khẩu ban đầu để gửi email (sẽ xóa sau khi gửi)
CREATE TABLE initial_passwords (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    plain_password VARCHAR(50) NOT NULL, -- Chỉ lưu tạm để gửi email
    email_sent BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 3. QUẢN LÝ MÔN HỌC & LỚP
-- ================================================

CREATE TABLE courses (
    course_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    course_code VARCHAR(20) UNIQUE NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    category VARCHAR(50), -- 'DSA', 'OOP', 'Basic Programming'
    programming_languages TEXT[], -- ['C', 'C++']
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
    class_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    course_id UUID REFERENCES courses(course_id),
    class_code VARCHAR(50) UNIQUE NOT NULL,
    lecturer_id UUID REFERENCES lecturers(lecturer_id),
    semester VARCHAR(20), -- 'HK1-2024', 'HK2-2024'
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    class_id UUID REFERENCES classes(class_id),
    student_id UUID REFERENCES students(student_id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- active, dropped, completed
    UNIQUE(class_id, student_id)
);

-- ================================================
-- 4. BÀI TẬP & TEST CASES
-- ================================================

CREATE TABLE problems (
    problem_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    course_id UUID REFERENCES courses(course_id),
    problem_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL, -- Đề bài chi tiết
    difficulty VARCHAR(20), -- 'easy', 'medium', 'hard'
    time_limit INTEGER DEFAULT 1000, -- milliseconds
    memory_limit INTEGER DEFAULT 256, -- MB
    allowed_languages TEXT[], -- ['C', 'C++']
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_cases (
    test_case_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    problem_id UUID REFERENCES problems(problem_id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE, -- Hiển thị cho sinh viên
    points DECIMAL(5,2) DEFAULT 10, -- Điểm cho test case này
    order_index INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gán bài tập cho lớp
CREATE TABLE assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    class_id UUID REFERENCES classes(class_id),
    problem_id UUID REFERENCES problems(problem_id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    max_score DECIMAL(5,2) DEFAULT 100,
    allow_late_submission BOOLEAN DEFAULT TRUE,
    late_penalty_percent DECIMAL(5,2) DEFAULT 10, -- Trừ 10%/ngày
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 5. SUBMISSIONS & JUDGING
-- ================================================

CREATE TABLE submissions (
    submission_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    assignment_id UUID REFERENCES assignments(assignment_id),
    student_id UUID REFERENCES students(student_id),
    language VARCHAR(20) NOT NULL, -- 'C', 'C++'
    source_code TEXT NOT NULL,

    -- Kết quả chấm
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, judging, accepted, wrong_answer,
    -- time_limit_exceeded, memory_limit_exceeded,
    -- runtime_error, compile_error

    score DECIMAL(5,2),
    execution_time INTEGER, -- milliseconds (của test case chậm nhất)
    memory_used INTEGER, -- KB (của test case tốn nhiều nhất)
    test_cases_passed INTEGER DEFAULT 0,
    total_test_cases INTEGER,

    is_late BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    judged_at TIMESTAMP
);

-- Chi tiết kết quả từng test case
CREATE TABLE submission_test_results (
    result_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    submission_id UUID REFERENCES submissions(submission_id) ON DELETE CASCADE,
    test_case_id UUID REFERENCES test_cases(test_case_id),
    status VARCHAR(50), -- passed, wrong_answer, timeout, runtime_error
    execution_time INTEGER, -- ms
    memory_used INTEGER, -- KB
    actual_output TEXT, -- Output thực tế (nếu sai)
    error_message TEXT, -- Lỗi compile hoặc runtime
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 6. AI HINTS SYSTEM
-- ================================================

CREATE TABLE ai_hint_configs (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    assignment_id UUID REFERENCES assignments(assignment_id),
    max_hints_per_student INTEGER DEFAULT 3, -- Giới hạn số lần hỏi
    hint_cooldown_minutes INTEGER DEFAULT 10, -- Phải đợi 10p giữa các lần hỏi
    allow_code_hints BOOLEAN DEFAULT TRUE, -- Cho phép hỏi về code
    allow_algorithm_hints BOOLEAN DEFAULT TRUE, -- Cho phép hỏi về thuật toán
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_hints (
    hint_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    assignment_id UUID REFERENCES assignments(assignment_id),
    student_id UUID REFERENCES students(student_id),

    -- Nội dung tương tác
    student_question TEXT NOT NULL,
    student_code_snapshot TEXT, -- Code hiện tại của sinh viên khi hỏi
    ai_response TEXT NOT NULL,
    hint_type VARCHAR(50), -- 'algorithm', 'syntax', 'debug', 'approach'

    -- Metadata
    ai_model VARCHAR(50), -- 'claude-sonnet-4', etc
    tokens_used INTEGER,
    response_time_ms INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Theo dõi usage để enforce limits
CREATE TABLE ai_hint_usage (
    usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    student_id UUID REFERENCES students(student_id),
    assignment_id UUID REFERENCES assignments(assignment_id),
    hints_used INTEGER DEFAULT 0,
    last_hint_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, assignment_id)
);

-- ================================================
-- 7. PLAGIARISM DETECTION
-- ================================================

CREATE TABLE plagiarism_checks (
    check_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    submission_id UUID REFERENCES submissions(submission_id),

    -- AI Analysis
    ai_generated_probability DECIMAL(5,2), -- 0-100% khả năng code từ AI
    is_suspicious BOOLEAN DEFAULT FALSE,
    confidence_level VARCHAR(20), -- 'low', 'medium', 'high'

    -- Chi tiết phân tích
    detection_method VARCHAR(50), -- 'ai_model', 'code_similarity', 'pattern_matching'
    analysis_details JSONB, -- {patterns: [], indicators: []}
    flagged_sections JSONB, -- [{start_line: 10, end_line: 25, reason: "..."}]

    -- So sánh với submissions khác
    similar_submissions JSONB, -- [{submission_id, similarity_score, matching_lines}]

    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by UUID REFERENCES users(user_id), -- Giảng viên review
    review_status VARCHAR(20), -- 'pending', 'legitimate', 'plagiarized'
    review_notes TEXT,
    reviewed_at TIMESTAMP
);

-- Lưu fingerprint của code để so sánh
CREATE TABLE code_fingerprints (
    fingerprint_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    submission_id UUID REFERENCES submissions(submission_id) ON DELETE CASCADE,
    problem_id UUID REFERENCES problems(problem_id),

    -- Các đặc trưng của code
    structure_hash TEXT, -- Hash của cấu trúc code (bỏ qua tên biến)
    variable_pattern TEXT, -- Pattern đặt tên biến
    logic_signature TEXT, -- Chữ ký logic thuật toán

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 8. EMAIL & NOTIFICATIONS
-- ================================================

CREATE TABLE email_queue (
    email_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    email_type VARCHAR(50),
    -- 'account_created', 'assignment_due', 'plagiarism_alert'

    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    -- 'assignment_new', 'assignment_due', 'grade_published',
    -- 'plagiarism_warning', 'ai_limit_reached'

    is_read BOOLEAN DEFAULT FALSE,
    link_url TEXT, -- Link đến bài tập, submission, etc
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 9. INDEXES
-- ================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role_id);

-- Students & Lecturers
CREATE INDEX idx_students_code ON students(student_code);
CREATE INDEX idx_students_class ON students(class_name);

-- Submissions
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at DESC);

-- AI Hints
CREATE INDEX idx_ai_hints_student_assignment ON ai_hints(student_id, assignment_id);
CREATE INDEX idx_ai_hints_created ON ai_hints(created_at DESC);

-- Plagiarism
CREATE INDEX idx_plagiarism_submission ON plagiarism_checks(submission_id);
CREATE INDEX idx_plagiarism_suspicious ON plagiarism_checks(is_suspicious);
CREATE INDEX idx_plagiarism_review_status ON plagiarism_checks(review_status);

-- Problems & Assignments
CREATE INDEX idx_problems_course ON problems(course_id);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

-- ================================================
-- 10. TRIGGERS & FUNCTIONS
-- ================================================

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER problems_updated_at BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Kiểm tra nộp muộn
CREATE OR REPLACE FUNCTION check_late_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_due_date TIMESTAMP;
    v_allow_late BOOLEAN;
BEGIN
    SELECT due_date, allow_late_submission
    INTO v_due_date, v_allow_late
    FROM assignments
    WHERE assignment_id = NEW.assignment_id;

    IF v_due_date IS NOT NULL THEN
        IF NEW.submitted_at > v_due_date THEN
            IF v_allow_late THEN
                NEW.is_late = TRUE;
            ELSE
                RAISE EXCEPTION 'Đã quá hạn nộp bài';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_late BEFORE INSERT ON submissions
    FOR EACH ROW EXECUTE FUNCTION check_late_submission();

-- Auto update AI hint usage
CREATE OR REPLACE FUNCTION update_ai_hint_usage()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO ai_hint_usage (student_id, assignment_id, hints_used, last_hint_at)
    VALUES (NEW.student_id, NEW.assignment_id, 1, NEW.created_at)
    ON CONFLICT (student_id, assignment_id)
    DO UPDATE SET
        hints_used = ai_hint_usage.hints_used + 1,
        last_hint_at = NEW.created_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hint_usage AFTER INSERT ON ai_hints
    FOR EACH ROW EXECUTE FUNCTION update_ai_hint_usage();

-- ================================================
-- 11. INITIAL DATA
-- ================================================

INSERT INTO roles (role_name, description) VALUES
    ('admin', 'Quản trị viên hệ thống'),
    ('lecturer', 'Giảng viên'),
    ('student', 'Sinh viên');

-- ================================================
-- 12. USEFUL VIEWS
-- ================================================

-- Tổng quan submissions của sinh viên
CREATE VIEW student_submission_summary AS
SELECT
    s.student_id,
    u.full_name,
    s.student_code,
    a.assignment_id,
    a.title as assignment_title,
    COUNT(sub.submission_id) as total_attempts,
    MAX(sub.score) as best_score,
    MAX(CASE WHEN sub.status = 'accepted' THEN 1 ELSE 0 END) as has_accepted,
    MAX(sub.submitted_at) as last_submission,
    BOOL_OR(sub.is_late) as has_late_submission
FROM students s
JOIN users u ON s.student_id = u.user_id
CROSS JOIN assignments a
LEFT JOIN submissions sub ON
    a.assignment_id = sub.assignment_id AND
    s.student_id = sub.student_id
GROUP BY s.student_id, u.full_name, s.student_code, a.assignment_id, a.title;

-- Thống kê AI usage
CREATE VIEW ai_usage_summary AS
SELECT
    s.student_id,
    u.full_name,
    s.student_code,
    a.assignment_id,
    a.title as assignment_title,
    COALESCE(usage.hints_used, 0) as hints_used,
    config.max_hints_per_student as max_hints,
    usage.last_hint_at
FROM students s
JOIN users u ON s.student_id = u.user_id
CROSS JOIN assignments a
LEFT JOIN ai_hint_usage usage ON
    s.student_id = usage.student_id AND
    a.assignment_id = usage.assignment_id
LEFT JOIN ai_hint_configs config ON
    a.assignment_id = config.assignment_id;

-- Plagiarism alerts cho giảng viên
CREATE VIEW plagiarism_alerts AS
SELECT
    pc.check_id,
    s.student_code,
    u.full_name as student_name,
    p.problem_code,
    p.title as problem_title,
    sub.submitted_at,
    pc.ai_generated_probability,
    pc.confidence_level,
    pc.review_status,
    pc.checked_at
FROM plagiarism_checks pc
JOIN submissions sub ON pc.submission_id = sub.submission_id
JOIN students s ON sub.student_id = s.student_id
JOIN users u ON s.student_id = u.user_id
JOIN assignments a ON sub.assignment_id = a.assignment_id
JOIN problems p ON a.problem_id = p.problem_id
WHERE pc.is_suspicious = TRUE
ORDER BY pc.checked_at DESC;


