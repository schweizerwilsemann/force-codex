--
-- PostgreSQL database dump
--

\restrict VerT1wvGbR3Izg4DxlDs90i5q0cguxvbB2hcWFCvXUZXYho177uIy3ISkHnJqUX

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_uuidv7; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_uuidv7 WITH SCHEMA public;


--
-- Name: EXTENSION pg_uuidv7; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_uuidv7 IS 'pg_uuidv7: create UUIDv7 values in postgres';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: check_late_submission(); Type: FUNCTION; Schema: public; Owner: null
--

CREATE FUNCTION public.check_late_submission() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.check_late_submission() OWNER TO "null";

--
-- Name: update_ai_hint_usage(); Type: FUNCTION; Schema: public; Owner: null
--

CREATE FUNCTION public.update_ai_hint_usage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO ai_hint_usage (student_id, assignment_id, hints_used, last_hint_at)
    VALUES (NEW.student_id, NEW.assignment_id, 1, NEW.created_at)
    ON CONFLICT (student_id, assignment_id)
    DO UPDATE SET
        hints_used = ai_hint_usage.hints_used + 1,
        last_hint_at = NEW.created_at;

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_ai_hint_usage() OWNER TO "null";

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: null
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO "null";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_hint_configs; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.ai_hint_configs (
    config_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    assignment_id uuid,
    max_hints_per_student integer DEFAULT 3,
    hint_cooldown_minutes integer DEFAULT 10,
    allow_code_hints boolean DEFAULT true,
    allow_algorithm_hints boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_hint_configs OWNER TO "null";

--
-- Name: ai_hint_usage; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.ai_hint_usage (
    usage_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    student_id uuid,
    assignment_id uuid,
    hints_used integer DEFAULT 0,
    last_hint_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_hint_usage OWNER TO "null";

--
-- Name: ai_hints; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.ai_hints (
    hint_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    assignment_id uuid,
    student_id uuid,
    student_question text NOT NULL,
    student_code_snapshot text,
    ai_response text NOT NULL,
    hint_type character varying(50),
    ai_model character varying(50),
    tokens_used integer,
    response_time_ms integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_hints OWNER TO "null";

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.assignments (
    assignment_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    problem_id uuid,
    title character varying(255) NOT NULL,
    description text,
    start_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    due_date timestamp without time zone,
    max_score numeric(5,2) DEFAULT 100,
    allow_late_submission boolean DEFAULT true,
    late_penalty_percent numeric(5,2) DEFAULT 10,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    course_id uuid NOT NULL
);


ALTER TABLE public.assignments OWNER TO "null";

--
-- Name: students; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.students (
    student_id uuid NOT NULL,
    student_code character varying(20) NOT NULL,
    class_name character varying(100),
    year_of_admission integer,
    major character varying(100)
);


ALTER TABLE public.students OWNER TO "null";

--
-- Name: users; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.users (
    user_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    full_name character varying(255) NOT NULL,
    role_id integer,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO "null";

--
-- Name: ai_usage_summary; Type: VIEW; Schema: public; Owner: null
--

CREATE VIEW public.ai_usage_summary AS
 SELECT s.student_id,
    u.full_name,
    s.student_code,
    a.assignment_id,
    a.title AS assignment_title,
    COALESCE(usage.hints_used, 0) AS hints_used,
    config.max_hints_per_student AS max_hints,
    usage.last_hint_at
   FROM ((((public.students s
     JOIN public.users u ON ((s.student_id = u.user_id)))
     CROSS JOIN public.assignments a)
     LEFT JOIN public.ai_hint_usage usage ON (((s.student_id = usage.student_id) AND (a.assignment_id = usage.assignment_id))))
     LEFT JOIN public.ai_hint_configs config ON ((a.assignment_id = config.assignment_id)));


ALTER VIEW public.ai_usage_summary OWNER TO "null";

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO "null";

--
-- Name: classes; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.classes (
    class_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    course_id uuid,
    class_code character varying(50) NOT NULL,
    lecturer_id uuid,
    semester character varying(20),
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.classes OWNER TO "null";

--
-- Name: code_fingerprints; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.code_fingerprints (
    fingerprint_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    submission_id uuid,
    problem_id uuid,
    structure_hash text,
    variable_pattern text,
    logic_signature text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.code_fingerprints OWNER TO "null";

--
-- Name: courses; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.courses (
    course_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    course_code character varying(20) NOT NULL,
    course_name character varying(255) NOT NULL,
    category character varying(50),
    programming_languages text[],
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.courses OWNER TO "null";

--
-- Name: email_queue; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.email_queue (
    email_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    recipient_email character varying(255) NOT NULL,
    subject character varying(500) NOT NULL,
    body text NOT NULL,
    email_type character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    error_message text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_queue OWNER TO "null";

--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.enrollments (
    enrollment_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    class_id uuid,
    student_id uuid,
    enrolled_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'active'::character varying
);


ALTER TABLE public.enrollments OWNER TO "null";

--
-- Name: initial_passwords; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.initial_passwords (
    record_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    user_id uuid,
    plain_password character varying(50) NOT NULL,
    email_sent boolean DEFAULT false,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.initial_passwords OWNER TO "null";

--
-- Name: lecturers; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.lecturers (
    lecturer_id uuid NOT NULL,
    lecturer_code character varying(20),
    department character varying(100)
);


ALTER TABLE public.lecturers OWNER TO "null";

--
-- Name: menus; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.menus (
    menu_id integer NOT NULL,
    title character varying NOT NULL,
    path character varying,
    icon character varying,
    role_name character varying NOT NULL,
    parent_id integer,
    order_index integer
);


ALTER TABLE public.menus OWNER TO "null";

--
-- Name: menus_menu_id_seq; Type: SEQUENCE; Schema: public; Owner: null
--

CREATE SEQUENCE public.menus_menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menus_menu_id_seq OWNER TO "null";

--
-- Name: menus_menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: null
--

ALTER SEQUENCE public.menus_menu_id_seq OWNED BY public.menus.menu_id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.notifications (
    notification_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    user_id uuid,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50),
    is_read boolean DEFAULT false,
    link_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO "null";

--
-- Name: plagiarism_checks; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.plagiarism_checks (
    check_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    submission_id uuid,
    ai_generated_probability numeric(5,2),
    is_suspicious boolean DEFAULT false,
    confidence_level character varying(20),
    detection_method character varying(50),
    analysis_details jsonb,
    flagged_sections jsonb,
    similar_submissions jsonb,
    checked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_by uuid,
    review_status character varying(20),
    review_notes text,
    reviewed_at timestamp without time zone
);


ALTER TABLE public.plagiarism_checks OWNER TO "null";

--
-- Name: problems; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.problems (
    problem_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    course_id uuid,
    problem_code character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    difficulty character varying(20),
    time_limit integer DEFAULT 1000,
    memory_limit integer DEFAULT 256,
    allowed_languages text[],
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.problems OWNER TO "null";

--
-- Name: submissions; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.submissions (
    submission_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    assignment_id uuid,
    student_id uuid,
    language character varying(20) NOT NULL,
    source_code text NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    score numeric(5,2),
    execution_time integer,
    memory_used integer,
    test_cases_passed integer DEFAULT 0,
    total_test_cases integer,
    is_late boolean DEFAULT false,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    judged_at timestamp without time zone,
    problem_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.submissions OWNER TO "null";

--
-- Name: plagiarism_alerts; Type: VIEW; Schema: public; Owner: null
--

CREATE VIEW public.plagiarism_alerts AS
 SELECT pc.check_id,
    s.student_code,
    u.full_name AS student_name,
    p.problem_code,
    p.title AS problem_title,
    sub.submitted_at,
    pc.ai_generated_probability,
    pc.confidence_level,
    pc.review_status,
    pc.checked_at
   FROM (((((public.plagiarism_checks pc
     JOIN public.submissions sub ON ((pc.submission_id = sub.submission_id)))
     JOIN public.students s ON ((sub.student_id = s.student_id)))
     JOIN public.users u ON ((s.student_id = u.user_id)))
     JOIN public.assignments a ON ((sub.assignment_id = a.assignment_id)))
     JOIN public.problems p ON ((a.problem_id = p.problem_id)))
  WHERE (pc.is_suspicious = true)
  ORDER BY pc.checked_at DESC;


ALTER VIEW public.plagiarism_alerts OWNER TO "null";

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.refresh_tokens (
    token_id uuid NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.refresh_tokens OWNER TO "null";

--
-- Name: roles; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.roles (
    role_id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO "null";

--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: null
--

CREATE SEQUENCE public.roles_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_role_id_seq OWNER TO "null";

--
-- Name: roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: null
--

ALTER SEQUENCE public.roles_role_id_seq OWNED BY public.roles.role_id;


--
-- Name: student_enrollments; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.student_enrollments (
    enrollment_id uuid NOT NULL,
    class_id uuid NOT NULL,
    student_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.student_enrollments OWNER TO "null";

--
-- Name: student_import_batches; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.student_import_batches (
    batch_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    lecturer_id uuid,
    file_name character varying(255),
    file_type character varying(10),
    total_records integer,
    successful_imports integer DEFAULT 0,
    failed_imports integer DEFAULT 0,
    status character varying(20) DEFAULT 'processing'::character varying,
    error_log jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.student_import_batches OWNER TO "null";

--
-- Name: student_submission_summary; Type: VIEW; Schema: public; Owner: null
--

CREATE VIEW public.student_submission_summary AS
 SELECT s.student_id,
    u.full_name,
    s.student_code,
    a.assignment_id,
    a.title AS assignment_title,
    count(sub.submission_id) AS total_attempts,
    max(sub.score) AS best_score,
    max(
        CASE
            WHEN ((sub.status)::text = 'accepted'::text) THEN 1
            ELSE 0
        END) AS has_accepted,
    max(sub.submitted_at) AS last_submission,
    bool_or(sub.is_late) AS has_late_submission
   FROM (((public.students s
     JOIN public.users u ON ((s.student_id = u.user_id)))
     CROSS JOIN public.assignments a)
     LEFT JOIN public.submissions sub ON (((a.assignment_id = sub.assignment_id) AND (s.student_id = sub.student_id))))
  GROUP BY s.student_id, u.full_name, s.student_code, a.assignment_id, a.title;


ALTER VIEW public.student_submission_summary OWNER TO "null";

--
-- Name: submission_test_results; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.submission_test_results (
    result_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    submission_id uuid,
    test_case_id uuid,
    status character varying(50),
    execution_time integer,
    memory_used integer,
    actual_output text,
    error_message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.submission_test_results OWNER TO "null";

--
-- Name: test_cases; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.test_cases (
    test_case_id uuid DEFAULT public.uuid_generate_v7() NOT NULL,
    problem_id uuid,
    input text NOT NULL,
    expected_output text NOT NULL,
    is_sample boolean DEFAULT false,
    points numeric(5,2) DEFAULT 10,
    order_index integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.test_cases OWNER TO "null";

--
-- Name: menus menu_id; Type: DEFAULT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.menus ALTER COLUMN menu_id SET DEFAULT nextval('public.menus_menu_id_seq'::regclass);


--
-- Name: roles role_id; Type: DEFAULT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.roles ALTER COLUMN role_id SET DEFAULT nextval('public.roles_role_id_seq'::regclass);


--
-- Data for Name: ai_hint_configs; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.ai_hint_configs (config_id, assignment_id, max_hints_per_student, hint_cooldown_minutes, allow_code_hints, allow_algorithm_hints, created_at) FROM stdin;
\.


--
-- Data for Name: ai_hint_usage; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.ai_hint_usage (usage_id, student_id, assignment_id, hints_used, last_hint_at, created_at) FROM stdin;
\.


--
-- Data for Name: ai_hints; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.ai_hints (hint_id, assignment_id, student_id, student_question, student_code_snapshot, ai_response, hint_type, ai_model, tokens_used, response_time_ms, created_at) FROM stdin;
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.alembic_version (version_num) FROM stdin;
5aaa8aed2cfb
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.assignments (assignment_id, problem_id, title, description, start_date, due_date, max_score, allow_late_submission, late_penalty_percent, created_at, course_id) FROM stdin;
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.classes (class_id, course_id, class_code, lecturer_id, semester, start_date, end_date, is_active, created_at) FROM stdin;
019bcb40-da2c-78b8-bfee-c8754c7ee733	019bcb40-da21-7a75-8a2c-7b6511006c2e	CS101-2024-1	019bcb40-da2b-7893-b6c0-4da67c25382a	HK1-2024	\N	\N	t	2026-01-17 16:19:43.658213
e9ff50eb-7896-4e24-91bd-3189d89326ed	e3780608-0afb-4262-bd5b-e08b906d9291	CNTT	\N	2024-1	\N	\N	t	2026-01-29 21:54:11.322186
\.


--
-- Data for Name: code_fingerprints; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.code_fingerprints (fingerprint_id, submission_id, problem_id, structure_hash, variable_pattern, logic_signature, created_at) FROM stdin;
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.courses (course_id, course_code, course_name, category, programming_languages, description, is_active, created_at) FROM stdin;
019bcb40-da21-7a75-8a2c-7b6511006c2e	CS101	Basic Programming	Basic Programming	{C,C++}	\N	t	2026-01-17 16:19:43.649054
e3780608-0afb-4262-bd5b-e08b906d9291	DSA	Cấu trúc dữ liệu và giải thuật	DSA	{C,C++}	\N	t	2026-01-29 19:17:13.531771
\.


--
-- Data for Name: email_queue; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.email_queue (email_id, recipient_email, subject, body, email_type, status, retry_count, max_retries, error_message, sent_at, created_at) FROM stdin;
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.enrollments (enrollment_id, class_id, student_id, enrolled_at, status) FROM stdin;
\.


--
-- Data for Name: initial_passwords; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.initial_passwords (record_id, user_id, plain_password, email_sent, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: lecturers; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.lecturers (lecturer_id, lecturer_code, department) FROM stdin;
019bcb40-da2b-7893-b6c0-4da67c25382a	LEC001	Computer Science
\.


--
-- Data for Name: menus; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.menus (menu_id, title, path, icon, role_name, parent_id, order_index) FROM stdin;
1	Dashboard	/admin	LayoutDashboard	admin	\N	1
5	Luyện Tập	/student/practice	Code	student	\N	2
9	Lịch Sử	/student/exams/history	History	student	4	2
8	Bài Tập Sắp Tới	/student/exams/upcoming	Calendar	student	4	1
7	Hồ Sơ	/student/profile	User	student	\N	4
6	Lớp	/student/grades	BarChart	student	\N	3
3	Quản Lý Menu	/admin/menus	Menu	admin	\N	3
4	Bài Tập	/student/exams	FileText	student	\N	1
2	Quản Lý Người Dùng	/admin/users	Users	admin	\N	2
12	Bài Tập	/admin/problems	Code2	admin	\N	2
14	Phân Công	/admin/assignments	ClipboardList	admin	\N	4
19	Dashboard	/lecturer	LayoutDashboard	lecturer	\N	1
23	Phân Công	/lecturer/assignments	ClipboardList	lecturer	\N	4
21	Bài Tập	/lecturer/problems	Code2	lecturer	\N	2
24	Quản Lý Sinh Viên	/admin/students	Users	admin	\N	6
25	Sinh Viên	/lecturer/students	Users	lecturer	\N	5
13	Học Phần	/admin/courses	BookOpen	admin	\N	3
22	Học Phần	/lecturer/courses	BookOpen	lecturer	\N	3
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.notifications (notification_id, user_id, title, message, type, is_read, link_url, created_at) FROM stdin;
\.


--
-- Data for Name: plagiarism_checks; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.plagiarism_checks (check_id, submission_id, ai_generated_probability, is_suspicious, confidence_level, detection_method, analysis_details, flagged_sections, similar_submissions, checked_at, reviewed_by, review_status, review_notes, reviewed_at) FROM stdin;
\.


--
-- Data for Name: problems; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.problems (problem_id, course_id, problem_code, title, description, difficulty, time_limit, memory_limit, allowed_languages, created_by, created_at, updated_at) FROM stdin;
019bcb40-da22-7213-9b4f-f2567f8e951c	019bcb40-da21-7a75-8a2c-7b6511006c2e	TEST001	A+B	Tính tổng hai số	easy	1000	256	{C,C++}	\N	2026-01-17 16:19:43.649054	2026-01-28 13:36:19.210408
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.refresh_tokens (token_id, user_id, token, expires_at, revoked, created_at) FROM stdin;
019bff86-9216-7177-a1c1-33e4897ecac4	019bff5c-e190-7742-a595-05feceb3af63	HjUkGhVTYm-a8Evelti_zibFNdR-XFRSL7dIL99h5zs	2026-02-03 19:56:07.957451+07	f	2026-01-27 19:56:07.732077+07
019bff87-08b7-7555-8f2d-df37eb5cc391	019bff5c-e190-7742-a595-05feceb3af63	ntJPntEeL_IzOuQQzbhKFcPaY6oMNigpBUtIc0zt_Qo	2026-02-03 19:56:38.327462+07	f	2026-01-27 19:56:38.115031+07
019bff8d-dad8-74bd-aecf-896a6df4fb95	019bff5c-e190-7742-a595-05feceb3af63	uYN6FITXYGbIQHiDMdMpceUwa_o2B5J-jCzL6PyZaZI	2026-02-03 20:04:05.334925+07	f	2026-01-27 20:04:05.114731+07
019bff92-8684-7483-84d1-9a1ec401a1b0	019bff8f-82bc-7519-8c67-b161580494ab	J9Lr3xt5IqX0mE3vXlSogfwf1x5HrlAjXWA4SHvJigU	2026-02-03 20:09:11.426561+07	f	2026-01-27 20:09:11.201455+07
019bff93-b8ea-73e6-9273-230f3f631fee	019bff8f-839d-7343-869c-e5c2e1b72d1a	Ypo2fAnmqKKahmSJSOm30IYTzvaDOIcLQdDmx3-p62E	2026-02-03 20:10:29.865817+07	f	2026-01-27 20:10:29.652525+07
019bff98-8e07-7274-aac0-1cdb01df5197	019bff8f-839d-7343-869c-e5c2e1b72d1a	0yCLs2VfCSoITKqgYRDI4gZMxJ19GqUDXYtKfHBOvCU	2026-02-03 20:15:46.566276+07	f	2026-01-27 20:15:46.341589+07
019bff9c-88ca-77d8-a496-3152c12acffd	019bff5c-e190-7742-a595-05feceb3af63	4dfw13vTfpa6P0prbwTiariki3CLlRtVWhiZgkonYOg	2026-02-03 20:20:07.370366+07	f	2026-01-27 20:20:07.155836+07
019bff9d-2689-719b-848b-ed135991fa2b	019bff8f-839d-7343-869c-e5c2e1b72d1a	FflVdLjiSvB1IjB-x26ourGL3UHcOeOrPJr_yn9FtTY	2026-02-03 20:20:47.752794+07	f	2026-01-27 20:20:47.5404+07
019bffad-8a91-72c9-9eda-a3f03f1cd454	019bff5c-e190-7742-a595-05feceb3af63	NzGzSZBhnfDXt8X_iNwGuqLFfqEYqZTpJvrNr9Io8TM	2026-02-03 20:38:41.935927+07	f	2026-01-27 20:38:41.714221+07
019bffb5-f11c-715a-af8b-0620751ecf3a	019bff5c-e190-7742-a595-05feceb3af63	yLsxnusMnLg8v2r_3dp6p1313GsDYJ-qMFwH-So_qlA	2026-02-03 20:47:52.474961+07	f	2026-01-27 20:47:52.255599+07
019bffb9-c58a-72d5-8008-a1642aad63d9	019bff5c-e190-7742-a595-05feceb3af63	olDqnc0D2xwDEtmTopj_G15TvJq8WP4MOpeM6wUiIdc	2026-02-03 20:52:03.46516+07	f	2026-01-27 20:52:03.246964+07
019bffb9-faea-75bf-bb0f-a885ec5fb74f	019bff8f-82bc-7519-8c67-b161580494ab	z1phzXPQ7O8MCrN1YV154F4IF6PfS_m3JTt8nTJ9is8	2026-02-03 20:52:17.129794+07	f	2026-01-27 20:52:16.913011+07
019bffba-1afd-77f5-abee-fc29e5b4a85f	019bff8f-839d-7343-869c-e5c2e1b72d1a	tNXO0PzKb6N9ByPPDiQuTDA3XaP0kfKLYjiwW7rWkso	2026-02-03 20:52:25.340843+07	f	2026-01-27 20:52:25.129582+07
019bffc6-4962-72e7-9cd2-01f19bd145ab	019bff5c-e190-7742-a595-05feceb3af63	hgZjvV3d0P9YYcfhPHAdTre6EEYIkEPFO1oxcT_Tg8U	2026-02-03 21:05:43.649536+07	f	2026-01-27 21:05:43.437594+07
019bffc6-6f82-7049-8870-116a06f3a727	019bff8f-82bc-7519-8c67-b161580494ab	smbOhSrNyrxnH8lkjTYmIpHEXPIjDvpq3O8oaopBYIw	2026-02-03 21:05:53.409729+07	f	2026-01-27 21:05:53.192681+07
019bffc6-8d85-74c2-a790-9be938e9d490	019bff8f-839d-7343-869c-e5c2e1b72d1a	zBkmWH2u_TIi1ybfgxgxEr8EFpUHBbWvPcGZpnU33E4	2026-02-03 21:06:01.092918+07	f	2026-01-27 21:06:00.879632+07
019bffda-2b52-727f-9634-8dd6d856ca48	019bff5c-e190-7742-a595-05feceb3af63	L0PFMBtep1MSkb6F834KHZ1-VNYe4r9izSgJmzDScCs	2026-02-03 21:27:26.67289+07	f	2026-01-27 21:27:26.454206+07
019bffda-4148-7497-8e39-1fb47e3f0a15	019bff8f-82bc-7519-8c67-b161580494ab	UApUGqGsb5yMkHpv1DV7P3j5aTWqWSVyGbAHlYAbC6k	2026-02-03 21:27:32.296344+07	f	2026-01-27 21:27:32.07955+07
019bffda-5368-7035-9585-40ad89ce4924	019bff8f-839d-7343-869c-e5c2e1b72d1a	urqSvzltzIXMVbfYR-K_awrYA9fSszTNRQiLnFkthRQ	2026-02-03 21:27:36.936576+07	f	2026-01-27 21:27:36.718661+07
019c0476-8dfe-7477-b19b-ea0b281a2916	019bff8f-839d-7343-869c-e5c2e1b72d1a	7crDfK9Aqev0n313frBi46F-xLKfttForbKMPoUdTmU	2026-02-04 18:56:44.413131+07	f	2026-01-28 18:56:44.182112+07
019c047d-ab9c-77a6-8319-d060c3af8a1b	019bff8f-839d-7343-869c-e5c2e1b72d1a	fABbi_K-uQHwenT20jg1EPoiMaw-2-61l6NZDqLh6tA	2026-02-04 19:04:30.746715+07	f	2026-01-28 19:04:30.526088+07
019c0481-b721-73e1-9c0c-48cea88600af	019bff8f-839d-7343-869c-e5c2e1b72d1a	nCue4SH7atbIIy1WAumaTg_NFEMatkve8TNZURMwJGY	2026-02-04 19:08:55.839878+07	f	2026-01-28 19:08:55.622365+07
019c0493-dcf1-7535-b508-50737c1c6952	019bff8f-839d-7343-869c-e5c2e1b72d1a	oM8JnBj6MIGZdd9C586BjMONtKP9e6VtmsSOBTbSFH4	2026-02-04 19:28:45.167878+07	f	2026-01-28 19:28:44.941344+07
019c049e-887b-760c-842e-ccb8e6769a0d	019bff8f-839d-7343-869c-e5c2e1b72d1a	dDfGEeC55z6PLLUTyJPagkALyVLP4Xrqr9aU90rSFzQ	2026-02-04 19:40:24.442568+07	f	2026-01-28 19:40:24.228561+07
019c04a8-0390-74c4-9930-e3c15292187d	019bff8f-839d-7343-869c-e5c2e1b72d1a	hF0SnHamWPykmQtJv5xGfCTzOmiUnfAdMFDfGT_yNRs	2026-02-04 19:50:45.775389+07	f	2026-01-28 19:50:45.511218+07
019c04aa-119a-74b7-a96c-eee3e30d9fcf	019bff8f-839d-7343-869c-e5c2e1b72d1a	0xyeSFWM_rnricZwNB9fpRBSYutFgOJXTVQigDIanLM	2026-02-04 19:53:00.442333+07	f	2026-01-28 19:53:00.225838+07
019c04ad-182f-7435-9faf-a7083ce0c3dd	019bff8f-839d-7343-869c-e5c2e1b72d1a	SS-i-K_rUTONrIg7sBma8qQZsBVsk2X8rgNU4lzlGAw	2026-02-04 19:56:18.735265+07	f	2026-01-28 19:56:18.523735+07
019c04af-2fa3-731e-9d50-3a6cfaff34b8	019bff8f-839d-7343-869c-e5c2e1b72d1a	f5P7KzHWDk3i9ghRdjOaqCKHQQk59eti80nXEeQbq1Q	2026-02-04 19:58:35.810725+07	f	2026-01-28 19:58:35.598492+07
019c04b4-85b1-74f2-9d6f-0007e5d0e16b	019bff8f-839d-7343-869c-e5c2e1b72d1a	K4W59QkU-D2kVrcFjVLSQF8dkIggd9sD9S2Gvzm2rrA	2026-02-04 20:04:25.521487+07	f	2026-01-28 20:04:25.305851+07
019c04ba-2304-745c-88cb-b3ffcb49e561	019bff8f-82bc-7519-8c67-b161580494ab	Hq7cSGhNf5GpOWD36XKCvhXJdFPXxgbYWHX37P5mgzM	2026-02-04 20:10:33.476107+07	f	2026-01-28 20:10:33.260604+07
019c04c4-b106-7544-8821-1c0a24673cfc	019bff8f-839d-7343-869c-e5c2e1b72d1a	UkfMd0qtBcGFUaC2QunpXrDZYwE0F2c-yufVZzHQ1kY	2026-02-04 20:22:05.189194+07	f	2026-01-28 20:22:04.960875+07
019c04d5-2c91-73ce-afe4-94fd63efd70f	019bff8f-839d-7343-869c-e5c2e1b72d1a	iHiwnKncWz4lj3GR1oVnwgw5O9-4G4JZn1-kedg3rqs	2026-02-04 20:40:05.392519+07	f	2026-01-28 20:40:05.177607+07
019c04d5-b8d0-75af-bb7e-6f1d66b2c7ce	019bff8f-82bc-7519-8c67-b161580494ab	IJgXTFkzcb36KpwbzMNyBbwPkJFpthh1gqPnkP5hgEw	2026-02-04 20:40:41.296606+07	f	2026-01-28 20:40:41.084844+07
019c04d7-2f74-75d5-94df-1a3051e1ec7d	019bff5c-e190-7742-a595-05feceb3af63	aG8NrdvQXWv1AnXSpPwsH8MYYCMViRnDvzeNehW6jyo	2026-02-04 20:42:17.20448+07	f	2026-01-28 20:42:16.990608+07
019c04d9-3949-734a-8875-45998078879a	019bff8f-82bc-7519-8c67-b161580494ab	gdDqKfUroTQqLlByUlNYzWO0z3DhiesYnYXHk2w5aRo	2026-02-04 20:44:30.793153+07	f	2026-01-28 20:44:30.581811+07
019c04dd-254e-726d-872b-246c44cc89c9	019bff5c-e190-7742-a595-05feceb3af63	9q_udKJoSHPfhXBTC70zG-ClkAtlW6K5y39l7kQ8k2Q	2026-02-04 20:48:47.822361+07	f	2026-01-28 20:48:47.60461+07
019c04e2-db11-7384-aa1f-ef54c64ebd29	019bff8f-82bc-7519-8c67-b161580494ab	ngd4c9bP6mIcaNxucL4zm67NSNzIJBgTF4gxqw_--Ko	2026-02-04 20:55:02.032905+07	f	2026-01-28 20:55:01.821474+07
019c04e3-11c5-731f-818a-a0e2ed79820e	019bff5c-e190-7742-a595-05feceb3af63	Y6h_qc9ezG5aLddLOFStVBk-YAcM6uAuAZbIdW49cd8	2026-02-04 20:55:16.037479+07	f	2026-01-28 20:55:15.821999+07
019c04e3-59ae-72fd-a53c-2bcaf82f19c2	019bff8f-82bc-7519-8c67-b161580494ab	RBKXIHIkpg2J2q18yiGoF_HapBU5NrQGLU7zWkFU-P8	2026-02-04 20:55:34.446593+07	f	2026-01-28 20:55:34.236925+07
019c04e4-dac0-7709-9054-891a10b606c1	019bff8f-82bc-7519-8c67-b161580494ab	T5r6OiKrnVS0brJZRTL0mvwKrCGDzc1r_oxEB6O1KcQ	2026-02-04 20:57:13.023376+07	f	2026-01-28 20:57:12.803805+07
019c04e6-a9fb-74b1-94e6-085328b33b40	019bff8f-82bc-7519-8c67-b161580494ab	bDpWOIvyNjkiVijhFBsaZSK0ZIh30wYxlsuHsOuq3mk	2026-02-04 20:59:11.611512+07	f	2026-01-28 20:59:11.397861+07
019c04e8-b9c0-752f-9196-003cee51b56e	019bff8f-82bc-7519-8c67-b161580494ab	76NFih4RvjQN_MfW3h-VOYFxkwdVRda4H-jgp_AVj-0	2026-02-04 21:01:26.720045+07	f	2026-01-28 21:01:26.502546+07
019c04ee-6979-75c6-bea3-4d6e05647ccb	019bff8f-82bc-7519-8c67-b161580494ab	pcXzSmw90PrxwbAlr_WfLj0IQKgItPmeVoCjk7ymm0s	2026-02-04 21:07:39.385472+07	f	2026-01-28 21:07:39.168002+07
019c04f1-7b4e-72de-8caa-2acd5b48be6d	019bff8f-82bc-7519-8c67-b161580494ab	T4uImggzBtsa8YxQaGzQBf3iHpgREUAnzVnsAljIiy0	2026-02-04 21:11:00.556842+07	f	2026-01-28 21:11:00.335907+07
019c04f8-1e18-739d-8080-824dc0710e62	019bff5c-e190-7742-a595-05feceb3af63	QkedW0uiv37XbI-2QHrnnK--_wjHEZpg3_y57ktISu0	2026-02-04 21:18:15.447699+07	f	2026-01-28 21:18:15.227882+07
019c09a4-2992-745e-8c6a-55ba30040908	019bff8f-82bc-7519-8c67-b161580494ab	ZpjtoKCBlLiQSbAH8vVuzKql-nt1BQyzG9Sz9GUYefE	2026-02-05 19:04:39.440778+07	f	2026-01-29 19:04:39.223159+07
019c09a4-b97c-728d-98ca-4e6b4f5aaaac	019bff8f-839d-7343-869c-e5c2e1b72d1a	3zGSImTdiP9olMVYN8VvIBqz08H47U_Pt9su-hrOVFk	2026-02-05 19:05:16.284007+07	f	2026-01-29 19:05:16.07006+07
019c09a5-41fe-7393-a3bb-50f23557e1df	019bff5c-e190-7742-a595-05feceb3af63	-5Y9ODFwzoNpYEL0qSqsalvbYA4uwBFh1tpX3elC_e4	2026-02-05 19:05:51.229774+07	f	2026-01-29 19:05:51.014874+07
019c09a5-8e8b-7584-8bd0-1e91a260bde1	019bff8f-82bc-7519-8c67-b161580494ab	sz8VmCKzqoxGDN2Zke6qoysxruuKfDcyHVbE2uwSeDE	2026-02-05 19:06:10.826724+07	f	2026-01-29 19:06:10.615143+07
019c09a8-9efa-71bd-a92f-d985c026098f	019bff5c-e190-7742-a595-05feceb3af63	BKHq0BuEy7TymaNmpFKPMRyjDDUZdhgwkuloZ-zlxHQ	2026-02-05 19:09:31.642289+07	f	2026-01-29 19:09:31.428082+07
019c09a9-4e46-77b2-af06-f3e7e8d32f7f	019bff5c-e190-7742-a595-05feceb3af63	CGmZx0FxL9ugglDV41401n4S2CribQ57FgPjvqXsz6g	2026-02-05 19:10:16.517788+07	f	2026-01-29 19:10:16.296809+07
019c09a9-a17d-7094-befb-a90402f97fe3	019bff8f-82bc-7519-8c67-b161580494ab	6HJi5XURG3dGxCZ3AVFdlCsalcFG7F24QksXyaC91hE	2026-02-05 19:10:37.821026+07	f	2026-01-29 19:10:37.60271+07
019c09ad-ef06-72aa-b33f-e1b6615e4524	019bff5c-e190-7742-a595-05feceb3af63	toBCibssuH9033T2o8LjJIGsogdsaKGn0jHQmcljV2I	2026-02-05 19:15:19.813103+07	f	2026-01-29 19:15:19.5966+07
019c09b9-b1d3-7088-8b43-b912d6b85af9	019bff8f-82bc-7519-8c67-b161580494ab	fzI5HXKwkovpkGK7GnU59_RndVF6z8wcDqNU1z4aPt4	2026-02-05 19:28:10.578156+07	f	2026-01-29 19:28:10.365324+07
019c09cd-43b2-759d-b63c-924b832eea3e	019bff8f-839d-7343-869c-e5c2e1b72d1a	YUTY21g4x6LqzSH60NvONxaws9vvK_pM1tLp88ogyhs	2026-02-05 19:49:33.104586+07	f	2026-01-29 19:49:32.888207+07
019c09cd-78b4-73c4-8e35-1889885960fb	019bff8f-82bc-7519-8c67-b161580494ab	OuiuukGzMwpeJFFuHyMQRngA4OPoCOj8MHG4y5NYMu4	2026-02-05 19:49:46.676337+07	f	2026-01-29 19:49:46.459274+07
019c09d4-3afa-7399-94a3-04a1cec6540b	019bff8f-839d-7343-869c-e5c2e1b72d1a	ZOwH36oFGQhAp_W_GTbWew8WlYbVIStJR8SUBdcJmIs	2026-02-05 19:57:09.625464+07	f	2026-01-29 19:57:09.40461+07
019c09d4-7bf0-7699-a6cd-1e59cc87719c	019bff8f-82bc-7519-8c67-b161580494ab	WNEVjoHUiPqIS-D9pg2xnBxLpzSxeeQenL7sgVH2vWI	2026-02-05 19:57:26.256424+07	f	2026-01-29 19:57:26.035887+07
019c09d9-4405-72c7-86f7-a7c892dc3277	019bff8f-82bc-7519-8c67-b161580494ab	wAx5aR6gOP7kkiYRxiYs55szq-HQAPw9alBDRCtdMak	2026-02-05 20:02:39.621275+07	f	2026-01-29 20:02:39.405126+07
019c09dc-8955-7046-bb09-f70d53b592d3	019bff5c-e190-7742-a595-05feceb3af63	ej0LRYBobfyyz7ODK1jSOBnOtSt_qkrEbPbDdBJGtws	2026-02-05 20:06:13.973208+07	f	2026-01-29 20:06:13.757417+07
019c09e0-d0f7-741b-b507-592f40786345	019bff8f-82bc-7519-8c67-b161580494ab	mRwlVF4WdbPlFsCustw6jEBUPC5GUr8yvpqc-dtaB9E	2026-02-05 20:10:54.454748+07	f	2026-01-29 20:10:54.237876+07
019c09e8-128a-7290-9d47-c99e80c7007b	019bff5c-e190-7742-a595-05feceb3af63	VXDv52O8rEHXpN6B3MwE3ubIFQ2yKboOGdCRfBmsk5U	2026-02-05 20:18:49.993303+07	f	2026-01-29 20:18:49.777326+07
019c09e8-45e9-756d-9867-b391a2ea2e89	019bff8f-82bc-7519-8c67-b161580494ab	a_UWNPK0s6etsfAnYafaQ96X8_-nOLDqFcevtA58948	2026-02-05 20:19:03.145083+07	f	2026-01-29 20:19:02.9203+07
019c09ee-62de-7619-a729-ab301cca4b85	019bff5c-e190-7742-a595-05feceb3af63	Fp_cbzsR3M1CAqb8XQKtPwHvJDKfInx1OqcqvPR28NM	2026-02-05 20:25:43.7738+07	f	2026-01-29 20:25:43.561905+07
019c09ef-f5df-756b-9a93-b347e4e3d117	019bff8f-82bc-7519-8c67-b161580494ab	4_aWiyfMj7fY_UySC360C_Ewp-VSt5GZxPAaiWt9UTg	2026-02-05 20:27:26.943269+07	f	2026-01-29 20:27:26.723112+07
019c0a01-c411-77f0-8c54-864609b5745f	019bff8f-82bc-7519-8c67-b161580494ab	BTnnQ4bqeb_3FpWpfAOmDG0uZ0NSrkjxvJrX2LA23kI	2026-02-05 20:46:53.839801+07	f	2026-01-29 20:46:53.627515+07
019c0a01-fe25-75ab-934a-06102a82e51c	019bff5c-e190-7742-a595-05feceb3af63	q-uS4WUBCWyDbim_YJTYB_1ocucXCxc6HUgPYqg0x80	2026-02-05 20:47:08.709166+07	f	2026-01-29 20:47:08.49133+07
019c0a1e-8ca1-7296-931f-81a70c310b46	019bff5c-e190-7742-a595-05feceb3af63	TxZSsWy0AcpbDNUEjxElk7mznFhJDydq9IK0ryeqf7I	2026-02-05 21:18:20.191727+07	f	2026-01-29 21:18:19.977852+07
019c0a21-f214-755f-9f78-fec480804634	019bff8f-82bc-7519-8c67-b161580494ab	HcBlEE_8rPwyHBlRRN2d-2drtaT7YC0qDL-MKhyffOw	2026-02-05 21:22:02.771437+07	f	2026-01-29 21:22:02.547757+07
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.roles (role_id, role_name, description, created_at) FROM stdin;
1	admin	Quản trị viên hệ thống	2026-01-17 08:28:21.267679+07
2	lecturer	Giảng viên	2026-01-17 08:28:21.267679+07
3	student	Sinh viên	2026-01-17 08:28:21.267679+07
\.


--
-- Data for Name: student_enrollments; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.student_enrollments (enrollment_id, class_id, student_id, enrolled_at) FROM stdin;
\.


--
-- Data for Name: student_import_batches; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.student_import_batches (batch_id, lecturer_id, file_name, file_type, total_records, successful_imports, failed_imports, status, error_log, created_at) FROM stdin;
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.students (student_id, student_code, class_name, year_of_admission, major) FROM stdin;
019bcb40-da2f-7c88-9230-282a41126cb6	SV001	CS101	2024	\N
019bff8f-839d-7343-869c-e5c2e1b72d1a	STU001	CS101	\N	\N
\.


--
-- Data for Name: submission_test_results; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.submission_test_results (result_id, submission_id, test_case_id, status, execution_time, memory_used, actual_output, error_message, created_at) FROM stdin;
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.submissions (submission_id, assignment_id, student_id, language, source_code, status, score, execution_time, memory_used, test_cases_passed, total_test_cases, is_late, submitted_at, judged_at, problem_id, created_at) FROM stdin;
\.


--
-- Data for Name: test_cases; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.test_cases (test_case_id, problem_id, input, expected_output, is_sample, points, order_index, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.users (user_id, email, password_hash, full_name, role_id, is_active, last_login, created_at, updated_at) FROM stdin;
019bcb40-da2b-7893-b6c0-4da67c25382a	lecturer@test.com	hash	Test Lecturer	2	t	\N	2026-01-17 16:19:43.658213+07	2026-01-17 16:19:43.658213+07
019bcb40-da2f-7c88-9230-282a41126cb6	student@test.com	hash	Test Student	3	t	\N	2026-01-17 16:19:43.663625+07	2026-01-17 16:19:43.663625+07
019bff8f-82bc-7519-8c67-b161580494ab	lecturer@example.com	$2b$12$/nc3zPnbOEi1HHUDcMdWzul0CilAuYJptXLochTp0HvNWQyMog9cu	Lecturer One	2	t	\N	2026-01-27 20:05:53.636558+07	2026-01-27 20:05:53.636558+07
019bff8f-839d-7343-869c-e5c2e1b72d1a	student@example.com	$2b$12$CsL4bcpIKw3cRTQMUVidTOArpii.Z3VX3g8Y1OhratDkKz/pDmn6S	Student One	3	t	\N	2026-01-27 20:05:53.864468+07	2026-01-27 20:05:53.864468+07
019bff5c-e190-7742-a595-05feceb3af63	admin@example.com	$2b$12$bKcW7Ro5mLEUD.dBVS19COjhf5nfxhBrvFZ/ODZEw8Y3SB8hrn6Xi	System Administrator	1	t	\N	2026-01-27 19:10:35.574107+07	2026-01-27 20:31:36.784107+07
\.


--
-- Name: menus_menu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: null
--

SELECT pg_catalog.setval('public.menus_menu_id_seq', 25, true);


--
-- Name: roles_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: null
--

SELECT pg_catalog.setval('public.roles_role_id_seq', 4, true);


--
-- Name: ai_hint_configs ai_hint_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.ai_hint_configs
    ADD CONSTRAINT ai_hint_configs_pkey PRIMARY KEY (config_id);


--
-- Name: ai_hint_usage ai_hint_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.ai_hint_usage
    ADD CONSTRAINT ai_hint_usage_pkey PRIMARY KEY (usage_id);


--
-- Name: ai_hint_usage ai_hint_usage_student_id_assignment_id_key; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.ai_hint_usage
    ADD CONSTRAINT ai_hint_usage_student_id_assignment_id_key UNIQUE (student_id, assignment_id);


--
-- Name: ai_hints ai_hints_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.ai_hints
    ADD CONSTRAINT ai_hints_pkey PRIMARY KEY (hint_id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (assignment_id);


--
-- Name: classes classes_class_code_key; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_class_code_key UNIQUE (class_code);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (class_id);


--
-- Name: code_fingerprints code_fingerprints_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.code_fingerprints
    ADD CONSTRAINT code_fingerprints_pkey PRIMARY KEY (fingerprint_id);


--
-- Name: courses courses_course_code_key; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_course_code_key UNIQUE (course_code);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (course_id);


--
-- Name: email_queue email_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.email_queue
    ADD CONSTRAINT email_queue_pkey PRIMARY KEY (email_id);


--
-- Name: enrollments enrollments_class_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_class_id_student_id_key UNIQUE (class_id, student_id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (enrollment_id);


--
-- Name: initial_passwords initial_passwords_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.initial_passwords
    ADD CONSTRAINT initial_passwords_pkey PRIMARY KEY (record_id);


--
-- Name: lecturers lecturers_lecturer_code_key; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.lecturers
    ADD CONSTRAINT lecturers_lecturer_code_key UNIQUE (lecturer_code);


--
-- Name: lecturers lecturers_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.lecturers
    ADD CONSTRAINT lecturers_pkey PRIMARY KEY (lecturer_id);


--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (menu_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: plagiarism_checks plagiarism_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.plagiarism_checks
    ADD CONSTRAINT plagiarism_checks_pkey PRIMARY KEY (check_id);


--
-- Name: problems problems_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_pkey PRIMARY KEY (problem_id);


--
-- Name: problems problems_problem_code_key; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_problem_code_key UNIQUE (problem_code);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: roles roles_role_name_key; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_role_name_key UNIQUE (role_name);


--
-- Name: student_enrollments student_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_pkey PRIMARY KEY (enrollment_id);


--
-- Name: student_import_batches student_import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.student_import_batches
    ADD CONSTRAINT student_import_batches_pkey PRIMARY KEY (batch_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (student_id);


--
-- Name: submission_test_results submission_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.submission_test_results
    ADD CONSTRAINT submission_test_results_pkey PRIMARY KEY (result_id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (submission_id);


--
-- Name: test_cases test_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_pkey PRIMARY KEY (test_case_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_ai_hints_created; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_ai_hints_created ON public.ai_hints USING btree (created_at DESC);


--
-- Name: idx_ai_hints_student_assignment; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_ai_hints_student_assignment ON public.ai_hints USING btree (student_id, assignment_id);


--
-- Name: idx_assignments_due_date; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_assignments_due_date ON public.assignments USING btree (due_date);


--
-- Name: idx_plagiarism_review_status; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_plagiarism_review_status ON public.plagiarism_checks USING btree (review_status);


--
-- Name: idx_plagiarism_submission; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_plagiarism_submission ON public.plagiarism_checks USING btree (submission_id);


--
-- Name: idx_plagiarism_suspicious; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_plagiarism_suspicious ON public.plagiarism_checks USING btree (is_suspicious);


--
-- Name: idx_problems_course; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_problems_course ON public.problems USING btree (course_id);


--
-- Name: idx_submissions_assignment; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_submissions_assignment ON public.submissions USING btree (assignment_id);


--
-- Name: idx_submissions_status; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_submissions_status ON public.submissions USING btree (status);


--
-- Name: idx_submissions_student; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_submissions_student ON public.submissions USING btree (student_id);


--
-- Name: idx_submissions_submitted_at; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_submissions_submitted_at ON public.submissions USING btree (submitted_at DESC);


--
-- Name: ix_assignments_course_id; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX ix_assignments_course_id ON public.assignments USING btree (course_id);


--
-- Name: ix_menus_menu_id; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX ix_menus_menu_id ON public.menus USING btree (menu_id);


--
-- Name: ix_refresh_tokens_token; Type: INDEX; Schema: public; Owner: null
--

CREATE UNIQUE INDEX ix_refresh_tokens_token ON public.refresh_tokens USING btree (token);


--
-- Name: ix_roles_role_id; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX ix_roles_role_id ON public.roles USING btree (role_id);


--
-- Name: ix_student_enrollments_enrollment_id; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX ix_student_enrollments_enrollment_id ON public.student_enrollments USING btree (enrollment_id);


--
-- Name: ix_students_student_code; Type: INDEX; Schema: public; Owner: null
--

CREATE UNIQUE INDEX ix_students_student_code ON public.students USING btree (student_code);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: null
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_user_id; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX ix_users_user_id ON public.users USING btree (user_id);


--
-- Name: submissions check_late; Type: TRIGGER; Schema: public; Owner: null
--

CREATE TRIGGER check_late BEFORE INSERT ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.check_late_submission();


--
-- Name: problems problems_updated_at; Type: TRIGGER; Schema: public; Owner: null
--

CREATE TRIGGER problems_updated_at BEFORE UPDATE ON public.problems FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: ai_hints update_hint_usage; Type: TRIGGER; Schema: public; Owner: null
--

CREATE TRIGGER update_hint_usage AFTER INSERT ON public.ai_hints FOR EACH ROW EXECUTE FUNCTION public.update_ai_hint_usage();


--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: null
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: ai_hint_configs ai_hint_configs_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.ai_hint_configs
    ADD CONSTRAINT ai_hint_configs_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(assignment_id);


--
-- Name: ai_hint_usage ai_hint_usage_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.ai_hint_usage
    ADD CONSTRAINT ai_hint_usage_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(assignment_id);


--
-- Name: ai_hint_usage ai_hint_usage_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.ai_hint_usage
    ADD CONSTRAINT ai_hint_usage_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id);


--
-- Name: ai_hints ai_hints_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.ai_hints
    ADD CONSTRAINT ai_hints_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(assignment_id);


--
-- Name: ai_hints ai_hints_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.ai_hints
    ADD CONSTRAINT ai_hints_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id);


--
-- Name: assignments assignments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id);


--
-- Name: assignments assignments_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(problem_id);


--
-- Name: classes classes_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id);


--
-- Name: classes classes_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.lecturers(lecturer_id);


--
-- Name: code_fingerprints code_fingerprints_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.code_fingerprints
    ADD CONSTRAINT code_fingerprints_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(problem_id);


--
-- Name: code_fingerprints code_fingerprints_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.code_fingerprints
    ADD CONSTRAINT code_fingerprints_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(submission_id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(class_id);


--
-- Name: enrollments enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id);


--
-- Name: initial_passwords initial_passwords_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.initial_passwords
    ADD CONSTRAINT initial_passwords_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: lecturers lecturers_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.lecturers
    ADD CONSTRAINT lecturers_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: menus menus_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.menus(menu_id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: plagiarism_checks plagiarism_checks_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.plagiarism_checks
    ADD CONSTRAINT plagiarism_checks_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id);


--
-- Name: plagiarism_checks plagiarism_checks_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.plagiarism_checks
    ADD CONSTRAINT plagiarism_checks_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(submission_id);


--
-- Name: problems problems_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id);


--
-- Name: problems problems_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.problems
    ADD CONSTRAINT problems_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: student_enrollments student_enrollments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(class_id);


--
-- Name: student_enrollments student_enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.student_enrollments
    ADD CONSTRAINT student_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id);


--
-- Name: student_import_batches student_import_batches_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.student_import_batches
    ADD CONSTRAINT student_import_batches_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.lecturers(lecturer_id);


--
-- Name: students students_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: submission_test_results submission_test_results_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.submission_test_results
    ADD CONSTRAINT submission_test_results_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(submission_id) ON DELETE CASCADE;


--
-- Name: submission_test_results submission_test_results_test_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.submission_test_results
    ADD CONSTRAINT submission_test_results_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.test_cases(test_case_id);


--
-- Name: submissions submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(assignment_id);


--
-- Name: submissions submissions_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(problem_id);


--
-- Name: submissions submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id);


--
-- Name: test_cases test_cases_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(problem_id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id);


--
-- PostgreSQL database dump complete
--

\unrestrict VerT1wvGbR3Izg4DxlDs90i5q0cguxvbB2hcWFCvXUZXYho177uIy3ISkHnJqUX

