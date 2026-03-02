--
-- PostgreSQL database dump
--

\restrict 7EtsueMNK2MnLKyiajEYeYQ5Y9qkE2ntKzhENDxuw2wLK79QNwl9LHdUJv1M4bW

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
    major character varying(100),
    class_id uuid
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
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    must_change_password boolean DEFAULT true
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
    class_code character varying(50) NOT NULL,
    lecturer_id uuid,
    semester character varying(20),
    start_date date,
    end_date date,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    academic_year character varying(20),
    department character varying(100)
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
-- Name: course_enrollments; Type: TABLE; Schema: public; Owner: null
--

CREATE TABLE public.course_enrollments (
    enrollment_id uuid DEFAULT public.uuid_generate_v7() CONSTRAINT enrollments_enrollment_id_not_null NOT NULL,
    course_id uuid,
    student_id uuid,
    enrolled_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'active'::character varying
);


ALTER TABLE public.course_enrollments OWNER TO "null";

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
    order_index integer,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    course_id uuid
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
2026_02_03_1820
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.assignments (assignment_id, problem_id, title, description, start_date, due_date, max_score, allow_late_submission, late_penalty_percent, created_at, course_id) FROM stdin;
54a4f0f3-b158-472d-a985-9fa810164aec	cb149638-4e77-40dd-a57f-9234b90454a8	Bài tập tuần 1		2026-02-04 12:00:00	2026-02-11 13:00:00	100.00	t	10.00	2026-02-04 19:51:25.661273	019bcb40-da21-7a75-8a2c-7b6511006c2e
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.classes (class_id, class_code, lecturer_id, semester, start_date, end_date, is_active, created_at, academic_year, department) FROM stdin;
019bcb40-da2c-78b8-bfee-c8754c7ee733	CS101-2024-1	019bcb40-da2b-7893-b6c0-4da67c25382a	HK1-2024	\N	\N	t	2026-01-17 16:19:43.658213	\N	\N
e9ff50eb-7896-4e24-91bd-3189d89326ed	CNTT	\N	2024-1	\N	\N	t	2026-01-29 21:54:11.322186	\N	\N
2397d25d-8a1a-44c1-9436-b1daa06473d6	CQ.63.CNTT	\N	2026-1	\N	\N	t	2026-01-30 19:20:05.146367	\N	\N
\.


--
-- Data for Name: code_fingerprints; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.code_fingerprints (fingerprint_id, submission_id, problem_id, structure_hash, variable_pattern, logic_signature, created_at) FROM stdin;
\.


--
-- Data for Name: course_enrollments; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.course_enrollments (enrollment_id, course_id, student_id, enrolled_at, status) FROM stdin;
0df3a421-9c0b-448d-a5d2-2f6e07438f6c	e3780608-0afb-4262-bd5b-e08b906d9291	019c0f12-0f70-758c-be23-1bf28ad5f99b	2026-01-30 20:22:47.565096	active
8323075a-cd0f-40b8-9bf4-dadcaad410b6	e3780608-0afb-4262-bd5b-e08b906d9291	019c0f12-1053-750d-a6ca-ccf4e9930286	2026-01-30 20:22:47.565096	active
c1fb51f3-fd72-49b0-b45e-21d245e18494	e3780608-0afb-4262-bd5b-e08b906d9291	019bff8f-839d-7343-869c-e5c2e1b72d1a	2026-01-31 18:37:10.522826	inactive
cb561085-4fcb-4650-be11-afab44c56ab3	e3780608-0afb-4262-bd5b-e08b906d9291	019c232c-26be-723c-b7c2-5b1eee3a983e	2026-02-03 18:04:14.340025	active
a973de96-ac2e-4ab5-ac4c-83829f75bc7f	019bcb40-da21-7a75-8a2c-7b6511006c2e	019bff8f-839d-7343-869c-e5c2e1b72d1a	2026-02-03 18:48:28.987169	active
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.courses (course_id, course_code, course_name, category, programming_languages, description, is_active, created_at) FROM stdin;
019bcb40-da21-7a75-8a2c-7b6511006c2e	CS101	Basic Programming	Basic Programming	{C,C++}	\N	t	2026-01-17 16:19:43.649054
e3780608-0afb-4262-bd5b-e08b906d9291	DSA	Cấu trúc dữ liệu và giải thuật	DSA	{C,C++}	\N	t	2026-01-29 19:17:13.531771
0798da51-1178-472d-a2a6-2830bb98a521	OOP	Lập trình hướng đối tượng	OOP	{C,C++}	\N	t	2026-02-03 20:15:16.92605
\.


--
-- Data for Name: email_queue; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.email_queue (email_id, recipient_email, subject, body, email_type, status, retry_count, max_retries, error_message, sent_at, created_at) FROM stdin;
\.


--
-- Data for Name: initial_passwords; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.initial_passwords (record_id, user_id, plain_password, email_sent, expires_at, created_at) FROM stdin;
019c232c-26c9-731a-bee1-d6aaeb925cd7	019c232c-26be-723c-b7c2-5b1eee3a983e	wu8i_BWauF-9Ew	t	2026-02-10 11:03:42.024185+07	2026-02-03 18:03:41.376892+07
019c288c-13af-753d-b2c0-3c80d92ad08f	019c288c-13a4-74fe-9a50-07df5b0834b3	bi8gsQxIXYDnzA	t	2026-02-11 12:06:34.670166+07	2026-02-04 19:06:34.066476+07
019c0f12-1052-7563-aae7-0082d48ca9b8	019c0f12-0f70-758c-be23-1bf28ad5f99b	rAKLZ8lKDJEokA	t	2026-02-06 13:22:47.793712+07	2026-01-30 20:22:47.565096+07
019c0f12-1055-7194-91e8-0515df99b664	019c0f12-1053-750d-a6ca-ccf4e9930286	9IgMy8Oy9-OtCg	t	2026-02-06 13:22:48.021329+07	2026-01-30 20:22:47.565096+07
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

COPY public.menus (menu_id, title, path, icon, role_name, parent_id, order_index, is_deleted, deleted_at, course_id) FROM stdin;
1	Dashboard	/admin	LayoutDashboard	admin	\N	1	f	\N	\N
5	Luyện Tập	/student/practice	Code	student	\N	2	f	\N	\N
7	Hồ Sơ	/student/profile	User	student	\N	4	f	\N	\N
6	Lớp	/student/grades	BarChart	student	\N	3	f	\N	\N
3	Quản Lý Menu	/admin/menus	Menu	admin	\N	3	f	\N	\N
2	Quản Lý Người Dùng	/admin/users	Users	admin	\N	2	f	\N	\N
12	Bài Tập	/admin/problems	Code2	admin	\N	2	f	\N	\N
14	Phân Công	/admin/assignments	ClipboardList	admin	\N	4	f	\N	\N
19	Dashboard	/lecturer	LayoutDashboard	lecturer	\N	1	f	\N	\N
23	Phân Công	/lecturer/assignments	ClipboardList	lecturer	\N	4	f	\N	\N
21	Bài Tập	/lecturer/problems	Code2	lecturer	\N	2	f	\N	\N
24	Quản Lý Sinh Viên	/admin/students	Users	admin	\N	6	f	\N	\N
25	Sinh Viên	/lecturer/students	Users	lecturer	\N	5	f	\N	\N
13	Học Phần	/admin/courses	BookOpen	admin	\N	3	f	\N	\N
22	Học Phần	/lecturer/courses	BookOpen	lecturer	\N	3	f	\N	\N
26	Học phần của tôi	/student/courses	BookOpen	student	\N	5	f	\N	\N
27	Test	/admin/students/test	list	admin	24	0	f	\N	\N
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
cb149638-4e77-40dd-a57f-9234b90454a8	019bcb40-da21-7a75-8a2c-7b6511006c2e	P002	Trừ hai số nguyên		easy	1000	256	{C,C++}	\N	2026-02-04 19:48:09.011229	\N
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
019c0ed0-efac-73e8-b3fb-9d9c639a0319	019bff8f-82bc-7519-8c67-b161580494ab	7VJpSAOBwplhFA2X9dO-KHt9LnUqA-5cxLPx6TyVSNk	2026-02-06 19:11:39.819182+07	f	2026-01-30 19:11:39.607956+07
019c0ed1-30d3-739b-95db-9b82e081bf56	019bff5c-e190-7742-a595-05feceb3af63	orn8esvXFpV7iZhHrF5UeD35f95uYq_S1khjz4ZrsDo	2026-02-06 19:11:56.49876+07	f	2026-01-30 19:11:56.291489+07
019c0ed7-e358-71ef-8bbd-3a1245bae0e2	019bff8f-82bc-7519-8c67-b161580494ab	E_4j9EXut68Al-S6_DKONKNCOTcO2iuMpbQrV9PMIvI	2026-02-06 19:19:15.415404+07	f	2026-01-30 19:19:15.202334+07
019c0edd-0b60-711e-8831-193d9db63114	019bff5c-e190-7742-a595-05feceb3af63	DhJbxToj2F-x2X387aXnkHrTbh-Sq4MyLBZ1RgYWJq0	2026-02-06 19:24:53.344399+07	f	2026-01-30 19:24:53.127293+07
019c0eea-e2c0-7461-a20b-5a170176233d	019bff8f-82bc-7519-8c67-b161580494ab	S58W-NgwMKygTrcZOA-j7dOeK1q_nG3SZ90v-aBizvA	2026-02-06 19:40:00.447867+07	f	2026-01-30 19:40:00.23024+07
019c13d7-5e69-71ea-93fd-5c8585c05e96	019bff8f-82bc-7519-8c67-b161580494ab	WfSyUEoiHFOygn3sTBlylXQPWiclXo25kPXspBeKNoY	2026-02-07 18:36:47.464773+07	f	2026-01-31 18:36:47.24094+07
019c13da-f229-701d-9a2d-db916f67122a	019bff5c-e190-7742-a595-05feceb3af63	_2Ss4TgFoz6zpFlGHJH2qNIHNrk0S2NwRjJNHEa2rrc	2026-02-07 18:40:41.896965+07	f	2026-01-31 18:40:41.675593+07
019c13db-4469-77c0-bf01-2ac6cb9657c8	019bff8f-82bc-7519-8c67-b161580494ab	vbGBl-Ad1BscD7oQvyIjMCwBd5a5WbeAx-qBmX6otGs	2026-02-07 18:41:02.952754+07	f	2026-01-31 18:41:02.729765+07
019c232a-7e59-7606-a765-d0eab625aa37	019bff8f-82bc-7519-8c67-b161580494ab	KTAr3MMDrDdpfPRiAVwRiWGKwnofwAHuwnSQsqgyWR4	2026-02-10 18:01:53.364232+07	f	2026-02-03 18:01:52.771247+07
019c232f-f758-72c9-a856-4b02ee28521a	019bff8f-839d-7343-869c-e5c2e1b72d1a	-j8zISIkl5P8ijAm33GJ39UN1rSPbPtKyLVa2QZILDg	2026-02-10 18:07:52.023713+07	f	2026-02-03 18:07:51.401519+07
019c2330-4785-7645-985f-9f942bc427ad	019c232c-26be-723c-b7c2-5b1eee3a983e	OE4u5LIkc2I8uMP3yS1Jouj_mt19tPG7FQg2INaUGIg	2026-02-10 18:08:12.549136+07	f	2026-02-03 18:08:11.810964+07
019c2345-6469-774b-9e02-4b25cb0f7a36	019bff8f-839d-7343-869c-e5c2e1b72d1a	JIktEZGl205o_dPQIvreBTNhXRubWdwOnNx1Y66pPgU	2026-02-10 18:31:16.198306+07	f	2026-02-03 18:31:15.572394+07
019c234c-bdca-741f-9564-c1d63a3f289e	019c232c-26be-723c-b7c2-5b1eee3a983e	XXNhGfktwRs3Hg2wh8tF7Efq5YEjMNCQKHp0nlS8K6k	2026-02-10 18:39:17.831868+07	f	2026-02-03 18:39:17.219436+07
019c2354-b998-7623-95cc-813fba67ad23	019bff8f-839d-7343-869c-e5c2e1b72d1a	iLTeirmYahuXTdgspGKqXNqeuIbpbL2I8ODrx5qQmyU	2026-02-10 18:48:01.041645+07	f	2026-02-03 18:48:00.358224+07
019c236a-88ce-7287-88af-089e13f0062f	019bff8f-82bc-7519-8c67-b161580494ab	M6bozB_vqB9fbLZZWKufLcpa2zj3iqvH16ADgwqufU4	2026-02-10 19:11:50.347617+07	f	2026-02-03 19:11:49.773544+07
019c236c-3aaf-7735-b306-9e522f326485	019bff8f-839d-7343-869c-e5c2e1b72d1a	UwjHN8KqwavZa_RP7qr5fSRqMjSCWd90TWIXTg9qoec	2026-02-10 19:13:41.422325+07	f	2026-02-03 19:13:40.789668+07
019c2372-89fe-762f-9e48-9e6e9da0a5ac	019bff8f-82bc-7519-8c67-b161580494ab	32TDZL1Mc2AlnsrlMbixI3Fc_iozAzh3oVaAsuxXllE	2026-02-10 19:20:34.939224+07	f	2026-02-03 19:20:34.305091+07
019c2372-a808-7174-9f02-2bb26ecedfb8	019bff8f-839d-7343-869c-e5c2e1b72d1a	9Tx5Lb40e4AkNw-Jw52n0mCvyZG4yaqpDFYHsbtknlw	2026-02-10 19:20:42.631461+07	f	2026-02-03 19:20:41.990281+07
019c2388-49f7-76ac-82eb-cf3b4764771b	019bff8f-839d-7343-869c-e5c2e1b72d1a	-ZvOBHPufXUrQpQpqGuh0SuFAf5KOu_xR2AeKLmzFug	2026-02-10 19:44:20.342378+07	f	2026-02-03 19:44:19.741826+07
019c238a-81ad-7400-973b-355ecdb865e4	019bff8f-839d-7343-869c-e5c2e1b72d1a	mCouuMp54TS-maUkWQx-_AbfOWIkWTj0BxM_jdTeT3A	2026-02-10 19:46:45.677252+07	f	2026-02-03 19:46:45.08463+07
019c23e6-93d9-70e7-84d7-c7dd5435306e	019bff8f-839d-7343-869c-e5c2e1b72d1a	OXC3EQMNjXZ8vuBz8KopFCuL9NG_YClVWZHCH8t1bqY	2026-02-10 21:27:19.638939+07	f	2026-02-03 21:27:19.017229+07
019c285d-c9bb-76e5-9ba0-3c09d20aad0a	019bff8f-82bc-7519-8c67-b161580494ab	b1U1kDHAnCFAbWF8zyZWDlbfOvVeG9qkyKSaHZorYww	2026-02-11 18:16:01.079168+07	f	2026-02-04 18:16:00.494418+07
019c285e-ff69-72cc-8fb6-e5a5e71dc11e	019bff8f-839d-7343-869c-e5c2e1b72d1a	3KY7Cdv4JZw0OpQZ6eBZfZUD3BtDaGix0CdDl2OziUQ	2026-02-11 18:17:20.360295+07	f	2026-02-04 18:17:19.734067+07
019c2861-90eb-7193-bcd7-461c119b45d2	019c232c-26be-723c-b7c2-5b1eee3a983e	JIpK1VgJGrORUSCUAU1IpodNBkg-q6OG1MHfcKhiIIw	2026-02-11 18:20:08.682572+07	f	2026-02-04 18:20:08.037045+07
019c286c-96ad-7107-8d6d-3204f6b87ed2	019bff5c-e190-7742-a595-05feceb3af63	sP_HkgXVDPyqu7v72Y4GXTAdkTrSF9gMVBNawDpJVKk	2026-02-11 18:32:11.052728+07	f	2026-02-04 18:32:10.470205+07
019c286d-96e2-716e-8891-6ac81699faeb	019bff8f-82bc-7519-8c67-b161580494ab	_mi05eEn-ubPPvi-Ium4Mpez0e0Evh1ovYN2A4vM65A	2026-02-11 18:33:16.641334+07	f	2026-02-04 18:33:16.065558+07
019c2873-fbad-710c-abe4-f8d01c584ccc	019bff8f-82bc-7519-8c67-b161580494ab	uYBa3TDNchRkuuxu_RXniJof90--T543RGNqGf-Cjd8	2026-02-11 18:40:15.660657+07	f	2026-02-04 18:40:15.027122+07
019c287c-785f-7716-b9df-f8fc48a1a81e	019bff8f-839d-7343-869c-e5c2e1b72d1a	fcmBmfKXxEJCieNNrye59D9W0SnBXF5mU-FP7Wq0kW4	2026-02-11 18:49:31.870296+07	f	2026-02-04 18:49:31.245677+07
019c2d99-69d6-771a-8ebc-b88605cf719e	019bff5c-e190-7742-a595-05feceb3af63	tE1PqVGNTeJ1tiK6ew0vNKEFnls87jAZyo5rkZy9pmI	2026-02-12 18:39:14.769792+07	f	2026-02-05 18:39:14.141539+07
019c2da4-348a-77a5-97bc-0f2d68cefa30	019bff8f-839d-7343-869c-e5c2e1b72d1a	1MxSCrBYvUYD-m3djamJ_H1_pbkKDxWhOIVxIqeIOB8	2026-02-12 18:51:02.025442+07	f	2026-02-05 18:51:01.445008+07
019c2da6-c6a0-7374-9ccc-8941f16d7892	019bff8f-82bc-7519-8c67-b161580494ab	_8gRxfL6Khw7ettiP-gISnJiGPAG1o8GECete_P9IMU	2026-02-12 18:53:50.496149+07	f	2026-02-05 18:53:49.862192+07
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
-- Data for Name: student_import_batches; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.student_import_batches (batch_id, lecturer_id, file_name, file_type, total_records, successful_imports, failed_imports, status, error_log, created_at) FROM stdin;
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.students (student_id, student_code, class_name, year_of_admission, major, class_id) FROM stdin;
019bcb40-da2f-7c88-9230-282a41126cb6	SV001	CS101	2024	\N	\N
019bff8f-839d-7343-869c-e5c2e1b72d1a	STU001	CS101	\N	\N	\N
019c0f12-0f70-758c-be23-1bf28ad5f99b	6251071037	CQ.62.CN.CNTT	\N	\N	\N
019c0f12-1053-750d-a6ca-ccf4e9930286	6351071001	CQ.63.CN.CNTT	\N	\N	\N
019c232c-26be-723c-b7c2-5b1eee3a983e	7351071034	CQ.63.CNTT	2026	Công nghệ thông tin	\N
019c288c-13a4-74fe-9a50-07df5b0834b3	6351071003	CQ.63.CNTT	2026	Công nghệ thông tin	\N
\.


--
-- Data for Name: submission_test_results; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.submission_test_results (result_id, submission_id, test_case_id, status, execution_time, memory_used, actual_output, error_message, created_at) FROM stdin;
019c2885-e543-754c-81ab-419d2ad82085	65b48554-6016-431b-b58e-928b25163001	a9c0408b-2ceb-44ff-9a99-d0d3ab0b87d8	passed	15	752	3	\N	2026-02-04 18:59:48.867973
019c2885-e558-7335-baa7-b8acaa88b3c6	65b48554-6016-431b-b58e-928b25163001	45ba8a25-c7d0-46a0-8b9c-d83f616e873d	passed	14	936	0	\N	2026-02-04 18:59:49.5926
019c2885-e56b-7910-86b7-ca64aa5d1cc5	65b48554-6016-431b-b58e-928b25163001	f9137587-f467-4185-b94b-6ec26c768204	passed	14	936	5	\N	2026-02-04 18:59:49.611637
019c28a1-ea1d-758c-a7a4-f35571f50201	ea827055-2bf6-4d6c-a720-6eea983f210d	a9c0408b-2ceb-44ff-9a99-d0d3ab0b87d8	passed	16	996	3	\N	2026-02-04 19:30:25.722058
019c28a1-ea31-722a-917c-b878a69fb364	ea827055-2bf6-4d6c-a720-6eea983f210d	45ba8a25-c7d0-46a0-8b9c-d83f616e873d	passed	14	1196	0	\N	2026-02-04 19:30:25.840934
019c28a1-ea45-77b2-a3d3-d6c7bbbb27b2	ea827055-2bf6-4d6c-a720-6eea983f210d	f9137587-f467-4185-b94b-6ec26c768204	passed	16	1524	5	\N	2026-02-04 19:30:25.861584
019c28a1-ea5b-7f04-8c08-3b8ce7a0e2fc	ea827055-2bf6-4d6c-a720-6eea983f210d	5b5dc4ec-ef80-48f2-af14-d8fc5826bc82	passed	16	0	12	\N	2026-02-04 19:30:25.882826
019c28a1-ea72-7a6c-bb12-406c0c8011ad	ea827055-2bf6-4d6c-a720-6eea983f210d	22a7964f-7d55-4609-8d93-3cacfdb60cac	passed	17	996	5	\N	2026-02-04 19:30:25.906501
019c28a1-ea8c-7f8f-8dde-d6f5acf0fea3	ea827055-2bf6-4d6c-a720-6eea983f210d	8c994eda-5ab8-42db-81d4-c272e4fbc766	passed	19	1508	7	\N	2026-02-04 19:30:25.931675
019c28a2-9b10-76b2-88ba-52144a8ed466	5e063602-2ece-4f56-b5be-b53ca12e23b9	a9c0408b-2ceb-44ff-9a99-d0d3ab0b87d8	passed	14	1396	3	\N	2026-02-04 19:31:10.969557
019c28a2-9b2b-7a5f-a742-1607fa1ff720	5e063602-2ece-4f56-b5be-b53ca12e23b9	45ba8a25-c7d0-46a0-8b9c-d83f616e873d	passed	14	996	0	\N	2026-02-04 19:31:11.147242
019c28a2-9b40-7580-937a-c468af04fbcb	5e063602-2ece-4f56-b5be-b53ca12e23b9	f9137587-f467-4185-b94b-6ec26c768204	passed	15	1336	5	\N	2026-02-04 19:31:11.167825
019c28a2-9b53-7718-8084-d45be2c435bf	5e063602-2ece-4f56-b5be-b53ca12e23b9	5b5dc4ec-ef80-48f2-af14-d8fc5826bc82	passed	14	1264	12	\N	2026-02-04 19:31:11.187137
019c28a2-9b67-79c1-9ac2-216496488b3b	5e063602-2ece-4f56-b5be-b53ca12e23b9	22a7964f-7d55-4609-8d93-3cacfdb60cac	passed	15	996	5	\N	2026-02-04 19:31:11.207556
019c28a2-9b7b-799f-ba2a-62ec86bd17cb	5e063602-2ece-4f56-b5be-b53ca12e23b9	8c994eda-5ab8-42db-81d4-c272e4fbc766	passed	14	992	7	\N	2026-02-04 19:31:11.227239
019c28b8-5201-748e-80c8-bbf112bb3a59	23ff97b0-46b5-4a4b-a414-962aeb572c67	8a1f3688-33ac-42d3-b854-de9f898d4f1c	passed	14	996	1	\N	2026-02-04 19:54:54.118661
019c28b8-5215-787b-b00f-bdd4f1343642	23ff97b0-46b5-4a4b-a414-962aeb572c67	40610d55-ca6e-49b4-9a6f-479655212cb2	passed	14	996	0	\N	2026-02-04 19:54:54.228976
019c28bd-4757-720f-bbd3-5b37151a3890	f554a7fd-9d27-416f-8a8c-43fac42bf31c	8a1f3688-33ac-42d3-b854-de9f898d4f1c	passed	15	996	1	\N	2026-02-04 20:00:19.065044
019c28bd-476b-7ea9-a740-f01831be1e19	f554a7fd-9d27-416f-8a8c-43fac42bf31c	40610d55-ca6e-49b4-9a6f-479655212cb2	passed	14	992	0	\N	2026-02-04 20:00:19.179041
019c28bd-477f-74b1-bda1-582208ccbae7	f554a7fd-9d27-416f-8a8c-43fac42bf31c	f32adf1e-a4a4-4842-b7dd-105be034c331	passed	15	996	2	\N	2026-02-04 20:00:19.198887
019c28bd-4791-7c30-bee4-0c9dea99f169	f554a7fd-9d27-416f-8a8c-43fac42bf31c	107462a4-a0e1-4068-bca4-5ccc1b3eb8ad	passed	14	996	6	\N	2026-02-04 20:00:19.217729
019c28be-b141-78e8-8a07-7730314504e0	2bf49954-1c37-4d43-a0b1-5d7150b1fdb4	8a1f3688-33ac-42d3-b854-de9f898d4f1c	passed	14	996	1	\N	2026-02-04 20:01:51.687447
019c28be-b15d-7511-bf15-6755495c3114	2bf49954-1c37-4d43-a0b1-5d7150b1fdb4	40610d55-ca6e-49b4-9a6f-479655212cb2	passed	15	1684	0	\N	2026-02-04 20:01:51.836823
019c28be-b170-77d4-8aeb-901dcfbaa167	2bf49954-1c37-4d43-a0b1-5d7150b1fdb4	f32adf1e-a4a4-4842-b7dd-105be034c331	passed	14	804	2	\N	2026-02-04 20:01:51.855956
019c28be-b185-73a5-b8e5-25759cb2a842	2bf49954-1c37-4d43-a0b1-5d7150b1fdb4	107462a4-a0e1-4068-bca4-5ccc1b3eb8ad	passed	16	1840	6	\N	2026-02-04 20:01:51.877189
019c2da6-45c7-7fa7-adf9-f5edac1258d9	4ebc35f3-e076-401b-bdfa-4bc9f9981d8a	8a1f3688-33ac-42d3-b854-de9f898d4f1c	passed	17	1912	1	\N	2026-02-05 18:53:17.363426
019c2da6-45df-74f1-a2a1-cdc40424b76a	4ebc35f3-e076-401b-bdfa-4bc9f9981d8a	40610d55-ca6e-49b4-9a6f-479655212cb2	passed	17	996	0	\N	2026-02-05 18:53:17.535064
019c2da6-45f6-7449-992a-990a80b1c903	4ebc35f3-e076-401b-bdfa-4bc9f9981d8a	f32adf1e-a4a4-4842-b7dd-105be034c331	passed	17	996	2	\N	2026-02-05 18:53:17.558422
019c2da6-460d-750b-b754-461d25f95948	4ebc35f3-e076-401b-bdfa-4bc9f9981d8a	107462a4-a0e1-4068-bca4-5ccc1b3eb8ad	passed	17	1192	6	\N	2026-02-05 18:53:17.58141
019c2da7-56e7-7aa2-9b00-98a358d5301e	049172bb-f89f-4049-9e32-2fb6117e15c8	8a1f3688-33ac-42d3-b854-de9f898d4f1c	passed	14	1336	1	\N	2026-02-05 18:54:27.341985
019c2da7-5700-7ded-87a0-e8d228d351af	049172bb-f89f-4049-9e32-2fb6117e15c8	40610d55-ca6e-49b4-9a6f-479655212cb2	passed	17	1972	0	\N	2026-02-05 18:54:27.45558
019c2da7-5718-7604-b2c4-4e82e803505b	049172bb-f89f-4049-9e32-2fb6117e15c8	f32adf1e-a4a4-4842-b7dd-105be034c331	passed	18	1196	2	\N	2026-02-05 18:54:27.479853
019c2da7-5732-72ca-99ee-1cd5792339f8	049172bb-f89f-4049-9e32-2fb6117e15c8	107462a4-a0e1-4068-bca4-5ccc1b3eb8ad	passed	20	736	6	\N	2026-02-05 18:54:27.506185
019c2dad-5012-74c0-983b-ce5b63b7810f	d7b58ad9-34cb-42a1-b88f-3c81d5f1c1e4	8a1f3688-33ac-42d3-b854-de9f898d4f1c	passed	14	732	1	\N	2026-02-05 19:00:58.8033
019c2dad-5025-7ed3-8786-6fed29f3e697	d7b58ad9-34cb-42a1-b88f-3c81d5f1c1e4	40610d55-ca6e-49b4-9a6f-479655212cb2	passed	14	996	0	\N	2026-02-05 19:00:58.917112
019c2dad-5038-7ec9-9076-609bf7f4d4cf	d7b58ad9-34cb-42a1-b88f-3c81d5f1c1e4	f32adf1e-a4a4-4842-b7dd-105be034c331	passed	14	736	2	\N	2026-02-05 19:00:58.936498
019c2dad-504c-7ac5-a693-d1849f76c026	d7b58ad9-34cb-42a1-b88f-3c81d5f1c1e4	107462a4-a0e1-4068-bca4-5ccc1b3eb8ad	passed	14	1792	6	\N	2026-02-05 19:00:58.955964
019c2dad-f432-7ae8-a188-49fb66601f91	e32fc21a-c76a-4c16-bbca-689e706e2f6b	8a1f3688-33ac-42d3-b854-de9f898d4f1c	passed	14	1060	1	\N	2026-02-05 19:01:40.826468
019c2dad-f445-791c-b120-5e805094282b	e32fc21a-c76a-4c16-bbca-689e706e2f6b	40610d55-ca6e-49b4-9a6f-479655212cb2	passed	14	996	0	\N	2026-02-05 19:01:40.933423
019c2dad-f458-711c-aa84-ad65ce7ac53d	e32fc21a-c76a-4c16-bbca-689e706e2f6b	f32adf1e-a4a4-4842-b7dd-105be034c331	passed	14	996	2	\N	2026-02-05 19:01:40.952607
019c2dad-f46c-7ec6-ba43-6d55f29652ee	e32fc21a-c76a-4c16-bbca-689e706e2f6b	107462a4-a0e1-4068-bca4-5ccc1b3eb8ad	passed	14	1328	6	\N	2026-02-05 19:01:40.971927
019c2db5-20e6-739a-98c0-5904f1c5db2a	9ec01d30-0a7b-4396-bd9e-7b20ddbc30ce	8a1f3688-33ac-42d3-b854-de9f898d4f1c	passed	20	1196	1	\N	2026-02-05 19:09:30.948866
019c2db5-2104-7d62-9a4f-6ace7fd8a8a0	9ec01d30-0a7b-4396-bd9e-7b20ddbc30ce	40610d55-ca6e-49b4-9a6f-479655212cb2	passed	16	1840	0	\N	2026-02-05 19:09:31.139595
019c2db5-2118-7f21-96a6-4f3f9b660745	9ec01d30-0a7b-4396-bd9e-7b20ddbc30ce	f32adf1e-a4a4-4842-b7dd-105be034c331	passed	15	1120	2	\N	2026-02-05 19:09:31.159628
019c2db5-212c-7804-808f-734c977f15ae	9ec01d30-0a7b-4396-bd9e-7b20ddbc30ce	107462a4-a0e1-4068-bca4-5ccc1b3eb8ad	passed	15	992	6	\N	2026-02-05 19:09:31.180576
019c2db9-f931-7082-ab83-df9593c71695	cb707bfb-f904-4075-b027-d550c00c7208	8a1f3688-33ac-42d3-b854-de9f898d4f1c	passed	14	992	1	\N	2026-02-05 19:14:48.525029
019c2db9-f94d-73e8-923c-e43fe58cbed0	cb707bfb-f904-4075-b027-d550c00c7208	40610d55-ca6e-49b4-9a6f-479655212cb2	passed	14	1704	0	\N	2026-02-05 19:14:48.652614
019c2db9-f962-7e5f-98d2-4746276942a3	cb707bfb-f904-4075-b027-d550c00c7208	f32adf1e-a4a4-4842-b7dd-105be034c331	wrong_answer	15	0	-4	Expected: 2...\nGot: -4...	2026-02-05 19:14:48.673831
019c2db9-f976-746e-b8b0-ee3529645f03	cb707bfb-f904-4075-b027-d550c00c7208	107462a4-a0e1-4068-bca4-5ccc1b3eb8ad	wrong_answer	16	0	-4	Expected: 6...\nGot: -4...	2026-02-05 19:14:48.694546
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.submissions (submission_id, assignment_id, student_id, language, source_code, status, score, execution_time, memory_used, test_cases_passed, total_test_cases, is_late, submitted_at, judged_at, problem_id, created_at) FROM stdin;
f4db12e0-4dbf-4106-923f-546abb43bfd3	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a, b;\n    scanf("%d%d", &a, &b);\n    print("%d", a - b);\n    return 0;\n}	compile_error	0.00	\N	\N	0	4	f	2026-02-04 19:54:24.450274	2026-02-04 19:54:24.485969	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-04 19:54:24.450274+07
23ff97b0-46b5-4a4b-a414-962aeb572c67	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a, b;\n    scanf("%d%d", &a, &b);\n    printf("%d", a - b);\n    return 0;\n}	wrong_answer	60.00	17	996	2	4	f	2026-02-04 19:54:54.08437	2026-02-04 19:54:54.279637	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-04 19:54:54.08437+07
f554a7fd-9d27-416f-8a8c-43fac42bf31c	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a, b;\n    scanf("%d%d", &a, &b);\n    printf("%d", a - b);\n    return 0;\n}	accepted	100.00	15	996	4	4	f	2026-02-04 20:00:19.013246	2026-02-04 20:00:19.221833	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-04 20:00:19.013246+07
2bf49954-1c37-4d43-a0b1-5d7150b1fdb4	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\nint truhaisonguyen(int a, int b){\n    return a - b;\n}\n\nint main() {\n    // Write your code here\n    int a, b;\n    scanf("%d%d", &a, &b);\n    printf("%d", truhaisonguyen(a,b));\n    return 0;\n}	accepted	100.00	16	1840	4	4	f	2026-02-04 20:01:51.622305	2026-02-04 20:01:51.882766	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-04 20:01:51.622305+07
4ebc35f3-e076-401b-bdfa-4bc9f9981d8a	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b;\n    scanf("%d%d", &a, &b);\n    printf("%d", a-b);\n    \n    return 0;\n}	accepted	100.00	17	1912	4	4	f	2026-02-05 18:52:49.942418	2026-02-05 18:53:17.585287	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-05 18:52:49.942418+07
049172bb-f89f-4049-9e32-2fb6117e15c8	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b;\n    scanf("%d%d", &a, &b);\n    printf("%d", a-b);\n    \n    return 0;\n}	accepted	100.00	20	1972	4	4	f	2026-02-05 18:54:27.309392	2026-02-05 18:54:27.510726	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-05 18:54:27.309392+07
d7b58ad9-34cb-42a1-b88f-3c81d5f1c1e4	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b;\n    scanf("%d%d", &a, &b);\n    printf("%d", a-b);\n    \n    return 0;\n}	accepted	100.00	14	1792	4	4	f	2026-02-05 19:00:58.767749	2026-02-05 19:00:58.960346	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-05 19:00:58.767749+07
e32fc21a-c76a-4c16-bbca-689e706e2f6b	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b;\n    scanf("%d%d", &a, &b);\n    printf("%d", a-b);\n    \n    return 0;\n}	accepted	100.00	14	1328	4	4	f	2026-02-05 19:01:40.796428	2026-02-05 19:01:40.975888	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-05 19:01:40.796428+07
9ec01d30-0a7b-4396-bd9e-7b20ddbc30ce	54a4f0f3-b158-472d-a985-9fa810164aec	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b;\n    scanf("%d%d", &a, &b);\n    printf("%d", a-b);\n    \n    return 0;\n}	accepted	100.00	20	1840	4	4	f	2026-02-05 19:09:30.908245	2026-02-05 19:09:31.184856	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-05 19:09:30.908245+07
cb707bfb-f904-4075-b027-d550c00c7208	54a4f0f3-b158-472d-a985-9fa810164aec	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b;\n    scanf("%d%d", &a, &b);\n    printf("%d", a+b);\n    \n    return 0;\n}	wrong_answer	60.00	16	1704	2	4	f	2026-02-05 19:14:48.46868	2026-02-05 19:14:48.698855	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-05 19:14:48.46868+07
a594ea04-6975-490a-a093-e77508d08c49	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C++	#include <iostream>\nusing namespace std;\nint main() {\n    // Write your code here\n    cin >> x >> " " >> y;\n    cout << x + y;\n    return 0;\n}	compile_error	0.00	\N	\N	0	3	f	2026-02-04 18:57:38.35477	2026-02-04 18:57:38.394158	019bcb40-da22-7213-9b4f-f2567f8e951c	2026-02-04 18:57:38.35477+07
17fc834f-c829-4389-96be-20fecbe67688	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C++	#include <iostream>\nusing namespace std;\nint main() {\n    // Write your code here\n    int x, y;\n    cin >> x >> " " >> y;\n    cout << x + y;\n    return 0;\n}	compile_error	0.00	\N	\N	0	3	f	2026-02-04 18:58:39.307212	2026-02-04 18:58:39.350268	019bcb40-da22-7213-9b4f-f2567f8e951c	2026-02-04 18:58:39.307212+07
65b48554-6016-431b-b58e-928b25163001	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C++	#include <iostream>\nusing namespace std;\nint main() {\n    // Write your code here\n    int x, y;\n    cin >> x >> y;\n    cout << x + y;\n    return 0;\n}	accepted	70.00	15	936	3	3	f	2026-02-04 18:59:48.827156	2026-02-04 18:59:49.615639	019bcb40-da22-7213-9b4f-f2567f8e951c	2026-02-04 18:59:48.827156+07
b184072c-1a0b-4b35-a540-470b4ca2a6b7	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b;\n    scanf("%d, %d", a,b);\n    printf("%d", a + b)\n    \n    return 0;\n}	compile_error	0.00	\N	\N	0	6	f	2026-02-04 19:29:15.575629	2026-02-04 19:29:15.617699	019bcb40-da22-7213-9b4f-f2567f8e951c	2026-02-04 19:29:15.575629+07
4e9b1677-238b-4daf-a6f3-20593872395d	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b;\n    scanf("%d %d", a,b);\n    printf("%d", a + b)\n    \n    return 0;\n}	compile_error	0.00	\N	\N	0	6	f	2026-02-04 19:29:29.014895	2026-02-04 19:29:29.05053	019bcb40-da22-7213-9b4f-f2567f8e951c	2026-02-04 19:29:29.014895+07
71578a73-da9a-413f-b288-07f01f67e65f	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b;\n    scanf("%d%d", a,b);\n    printf("%d", a + b)\n    \n    return 0;\n}	compile_error	0.00	\N	\N	0	6	f	2026-02-04 19:29:33.808597	2026-02-04 19:29:33.851762	019bcb40-da22-7213-9b4f-f2567f8e951c	2026-02-04 19:29:33.808597+07
ea827055-2bf6-4d6c-a720-6eea983f210d	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b;\n    scanf("%d%d", &a, &b);\n    printf("%d", a + b);\n    \n    return 0;\n}	accepted	100.00	19	1524	6	6	f	2026-02-04 19:30:25.672106	2026-02-04 19:30:25.937041	019bcb40-da22-7213-9b4f-f2567f8e951c	2026-02-04 19:30:25.672106+07
5e063602-2ece-4f56-b5be-b53ca12e23b9	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a,b,c;\n    scanf("%d%d", &a, &b);\n    c = a + b;\n    printf("%d", c);\n    \n    return 0;\n}	accepted	100.00	15	1396	6	6	f	2026-02-04 19:31:10.928404	2026-02-04 19:31:11.23122	019bcb40-da22-7213-9b4f-f2567f8e951c	2026-02-04 19:31:10.928404+07
70b3f4c7-a6c2-422c-b6d2-e10d2133e57c	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a, b;\n    scanf("%d %d", &a, &b);\n    print("%d", a - b);\n    return 0;\n}	compile_error	0.00	\N	\N	0	4	f	2026-02-04 19:53:37.731567	2026-02-04 19:53:37.778753	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-04 19:53:37.731567+07
b2e6ab0a-e00c-4561-9bc1-bfea5244375d	\N	019bff8f-839d-7343-869c-e5c2e1b72d1a	C	#include <stdio.h>\n\nint main() {\n    // Write your code here\n    int a, b;\n    scanf("%a %b", &a, &b);\n    print("%d", a - b);\n    return 0;\n}	compile_error	0.00	\N	\N	0	4	f	2026-02-04 19:53:52.322324	2026-02-04 19:53:52.362961	cb149638-4e77-40dd-a57f-9234b90454a8	2026-02-04 19:53:52.322324+07
\.


--
-- Data for Name: test_cases; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.test_cases (test_case_id, problem_id, input, expected_output, is_sample, points, order_index, created_at) FROM stdin;
a9c0408b-2ceb-44ff-9a99-d0d3ab0b87d8	019bcb40-da22-7213-9b4f-f2567f8e951c	1 2	3	t	50.00	0	2026-02-04 18:48:11.348065
45ba8a25-c7d0-46a0-8b9c-d83f616e873d	019bcb40-da22-7213-9b4f-f2567f8e951c	0 0	0	f	10.00	0	2026-02-04 18:48:41.92071
f9137587-f467-4185-b94b-6ec26c768204	019bcb40-da22-7213-9b4f-f2567f8e951c	-5 10	5	f	10.00	0	2026-02-04 18:49:16.815993
22a7964f-7d55-4609-8d93-3cacfdb60cac	019bcb40-da22-7213-9b4f-f2567f8e951c	-3 8	5	f	10.00	0	2026-02-04 19:19:44.000865
8c994eda-5ab8-42db-81d4-c272e4fbc766	019bcb40-da22-7213-9b4f-f2567f8e951c	3 4	7	f	10.00	0	2026-02-04 19:27:14.605383
8a1f3688-33ac-42d3-b854-de9f898d4f1c	cb149638-4e77-40dd-a57f-9234b90454a8	1 0	1	f	50.00	0	2026-02-04 19:48:29.903135
40610d55-ca6e-49b4-9a6f-479655212cb2	cb149638-4e77-40dd-a57f-9234b90454a8	0 0	0	f	10.00	0	2026-02-04 19:48:36.397438
f32adf1e-a4a4-4842-b7dd-105be034c331	cb149638-4e77-40dd-a57f-9234b90454a8	-1 -3	2	f	10.00	0	2026-02-04 19:59:39.803473
5b5dc4ec-ef80-48f2-af14-d8fc5826bc82	019bcb40-da22-7213-9b4f-f2567f8e951c	5 1	6	t	10.00	0	2026-02-04 19:19:43.918715
107462a4-a0e1-4068-bca4-5ccc1b3eb8ad	cb149638-4e77-40dd-a57f-9234b90454a8	1 -5	6	t	30.00	0	2026-02-04 19:59:57.992888
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: null
--

COPY public.users (user_id, email, password_hash, full_name, role_id, is_active, last_login, created_at, updated_at, must_change_password) FROM stdin;
019bcb40-da2b-7893-b6c0-4da67c25382a	lecturer@test.com	hash	Test Lecturer	2	t	\N	2026-01-17 16:19:43.658213+07	2026-02-03 18:16:00.872646+07	f
019bcb40-da2f-7c88-9230-282a41126cb6	student@test.com	hash	Test Student	3	t	\N	2026-01-17 16:19:43.663625+07	2026-02-03 18:16:00.872646+07	f
019bff8f-82bc-7519-8c67-b161580494ab	lecturer@example.com	$2b$12$/nc3zPnbOEi1HHUDcMdWzul0CilAuYJptXLochTp0HvNWQyMog9cu	Lecturer One	2	t	\N	2026-01-27 20:05:53.636558+07	2026-02-03 18:16:00.872646+07	f
019bff8f-839d-7343-869c-e5c2e1b72d1a	student@example.com	$2b$12$CsL4bcpIKw3cRTQMUVidTOArpii.Z3VX3g8Y1OhratDkKz/pDmn6S	Student One	3	t	\N	2026-01-27 20:05:53.864468+07	2026-02-03 18:16:00.872646+07	f
019c232c-26be-723c-b7c2-5b1eee3a983e	6351071034@st.utc2.edu.vn	$2b$12$g2Nr6hgtwhGrmVGOVS0MF.Db9fIYqo1t0DkrwZdSC7Ba0uPahhJGa	Nguyễn Đức Khoa	3	t	\N	2026-02-03 18:03:41.376892+07	2026-02-03 18:16:00.872646+07	f
019bff5c-e190-7742-a595-05feceb3af63	admin@example.com	$2b$12$apjQIczdxFI.7VNmdg/f6OB21n02gLGvZpBQSh0y9FCyBM4wP1eJq	System Administrator	1	t	\N	2026-01-27 19:10:35.574107+07	2026-02-03 20:13:31.125767+07	f
019c288c-13a4-74fe-9a50-07df5b0834b3	6351071003@student.utc2.edu.vn	$2b$12$GrvQ0B4.AJm42khvPZhi5uFy1V4GB2yZ5bQdqS.WeUmE3G1.IR8yK	Đinh Quốc Bảo	3	f	\N	2026-02-04 19:06:34.066476+07	2026-02-04 19:06:34.066476+07	t
019c0f12-0f70-758c-be23-1bf28ad5f99b	6251071037@student.edu.vn	$2b$12$se7iuxFNuOzPXMxKJjeRV.vXAZJcLSc7bZA217AzhE0vkJvWat85O	Thành Ngọc Huy	3	t	\N	2026-01-30 20:22:47.565096+07	2026-02-03 18:16:00.872646+07	f
019c0f12-1053-750d-a6ca-ccf4e9930286	6351071001@student.edu.vn	$2b$12$vE/Zp/IIHMJt9.nawTHC0eDS5rzrtZO/HcUaaYxzNFgMcJ4lXn.fi	Phạm Đức An	3	t	\N	2026-01-30 20:22:47.565096+07	2026-02-03 18:16:00.872646+07	f
\.


--
-- Name: menus_menu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: null
--

SELECT pg_catalog.setval('public.menus_menu_id_seq', 27, true);


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
-- Name: course_enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (enrollment_id);


--
-- Name: course_enrollments enrollments_unique_course_student; Type: CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT enrollments_unique_course_student UNIQUE (course_id, student_id);


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
-- Name: idx_course_enrollments_course; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_course_enrollments_course ON public.course_enrollments USING btree (course_id);


--
-- Name: idx_course_enrollments_student; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_course_enrollments_student ON public.course_enrollments USING btree (student_id);


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
-- Name: idx_students_class_id; Type: INDEX; Schema: public; Owner: null
--

CREATE INDEX idx_students_class_id ON public.students USING btree (class_id);


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
-- Name: course_enrollments enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id);


--
-- Name: course_enrollments enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.course_enrollments
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
-- Name: menus menus_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(course_id);


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
-- Name: student_import_batches student_import_batches_lecturer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.student_import_batches
    ADD CONSTRAINT student_import_batches_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.lecturers(lecturer_id);


--
-- Name: students students_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: null
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(class_id);


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

\unrestrict 7EtsueMNK2MnLKyiajEYeYQ5Y9qkE2ntKzhENDxuw2wLK79QNwl9LHdUJv1M4bW

