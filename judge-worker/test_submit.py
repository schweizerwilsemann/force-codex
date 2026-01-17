"""
Script test submit code vào judge queue
"""

import redis
import json
import psycopg2
from psycopg2.extras import RealDictCursor

# Config
REDIS_URL = 'redis://localhost:6379'
DATABASE_URL = 'postgresql://null:1772313@localhost:5432/FORCECODEX'

redis_client = redis.from_url(REDIS_URL)
conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

# Test code mẫu - Tính tổng 2 số
test_code = """
#include <stdio.h>

int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d", a + b);
    return 0;
}
"""

# 1. Tạo problem (nếu chưa có)
print("Creating test problem...")
with conn.cursor() as cur:
    # Tạo course
    cur.execute("""
        INSERT INTO courses (course_code, course_name, category, programming_languages)
        VALUES ('CS101', 'Basic Programming', 'Basic Programming', ARRAY['C', 'C++'])
        ON CONFLICT (course_code) DO NOTHING
        RETURNING course_id
    """)
    result = cur.fetchone()
    if result:
        course_id = result['course_id']
    else:
        cur.execute("SELECT course_id FROM courses WHERE course_code = 'CS101'")
        course_id = cur.fetchone()['course_id']
    
    # Tạo problem
    cur.execute("""
        INSERT INTO problems 
        (course_id, problem_code, title, description, difficulty, 
         time_limit, memory_limit, allowed_languages)
        VALUES (%s, 'TEST001', 'A+B Problem', 
                'Calculate sum of two integers', 'easy',
                1000, 256, ARRAY['C', 'C++'])
        ON CONFLICT (problem_code) DO NOTHING
        RETURNING problem_id
    """, (course_id,))
    result = cur.fetchone()
    if result:
        problem_id = result['problem_id']
    else:
        cur.execute("SELECT problem_id FROM problems WHERE problem_code = 'TEST001'")
        problem_id = cur.fetchone()['problem_id']
    
    conn.commit()
    print(f"Problem ID: {problem_id}")

# 2. Tạo test cases
print("Creating test cases...")
with conn.cursor() as cur:
    # Delete old test cases
    cur.execute("DELETE FROM test_cases WHERE problem_id = %s", (problem_id,))
    
    # Test case 1: 1 + 2 = 3
    cur.execute("""
        INSERT INTO test_cases 
        (problem_id, input, expected_output, is_sample, points, order_index)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (problem_id, "1 2", "3", True, 50, 1))
    
    # Test case 2: 5 + 7 = 12
    cur.execute("""
        INSERT INTO test_cases 
        (problem_id, input, expected_output, is_sample, points, order_index)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (problem_id, "5 7", "12", False, 50, 2))
    
    conn.commit()
    print("Test cases created!")

# 3. Tạo assignment (nếu chưa có)
print("Creating assignment...")
with conn.cursor() as cur:
    # Tạo lecturer
    cur.execute("""
        INSERT INTO roles (role_name, description)
        VALUES ('lecturer', 'Lecturer role')
        ON CONFLICT (role_name) DO NOTHING
    """)
    
    cur.execute("""
        INSERT INTO users (email, password_hash, full_name, role_id)
        SELECT 'lecturer@test.com', 'hash', 'Test Lecturer', role_id
        FROM roles WHERE role_name = 'lecturer'
        ON CONFLICT (email) DO NOTHING
        RETURNING user_id
    """)
    result = cur.fetchone()
    if result:
        lecturer_user_id = result['user_id']
    else:
        cur.execute("SELECT user_id FROM users WHERE email = 'lecturer@test.com'")
        lecturer_user_id = cur.fetchone()['user_id']
    
    cur.execute("""
        INSERT INTO lecturers (lecturer_id, lecturer_code, department)
        VALUES (%s, 'LEC001', 'Computer Science')
        ON CONFLICT (lecturer_id) DO NOTHING
    """, (lecturer_user_id,))
    
    # Tạo class
    cur.execute("""
        INSERT INTO classes 
        (course_id, class_code, lecturer_id, semester)
        VALUES (%s, 'CS101-2024-1', %s, 'HK1-2024')
        ON CONFLICT (class_code) DO NOTHING
        RETURNING class_id
    """, (course_id, lecturer_user_id))
    result = cur.fetchone()
    if result:
        class_id = result['class_id']
    else:
        cur.execute("SELECT class_id FROM classes WHERE class_code = 'CS101-2024-1'")
        class_id = cur.fetchone()['class_id']
    
    # Tạo assignment
    cur.execute("""
        INSERT INTO assignments 
        (class_id, problem_id, title, description, max_score)
        VALUES (%s, %s, 'Assignment 1: A+B', 'Solve A+B problem', 100)
        RETURNING assignment_id
    """, (class_id, problem_id))
    assignment_id = cur.fetchone()['assignment_id']
    
    conn.commit()
    print(f"Assignment ID: {assignment_id}")

# 4. Tạo student
print("Creating student...")
with conn.cursor() as cur:
    cur.execute("""
        INSERT INTO users (email, password_hash, full_name, role_id)
        SELECT 'student@test.com', 'hash', 'Test Student', role_id
        FROM roles WHERE role_name = 'student'
        ON CONFLICT (email) DO NOTHING
        RETURNING user_id
    """)
    result = cur.fetchone()
    if result:
        student_user_id = result['user_id']
    else:
        cur.execute("SELECT user_id FROM users WHERE email = 'student@test.com'")
        student_user_id = cur.fetchone()['user_id']
    
    cur.execute("""
        INSERT INTO students (student_id, student_code, class_name, year_of_admission)
        VALUES (%s, 'SV001', 'CS101', 2024)
        ON CONFLICT (student_id) DO NOTHING
    """, (student_user_id,))
    
    conn.commit()
    print(f"Student ID: {student_user_id}")

# 5. Tạo submission
print("\nCreating submission...")
with conn.cursor() as cur:
    cur.execute("""
        INSERT INTO submissions 
        (assignment_id, student_id, language, source_code, status)
        VALUES (%s, %s, %s, %s, 'pending')
        RETURNING submission_id
    """, (assignment_id, student_user_id, 'C', test_code))
    
    submission_id = cur.fetchone()['submission_id']
    conn.commit()
    print(f"Submission ID: {submission_id}")

# 6. Push to Redis queue
print("\nPushing to judge queue...")
job_data = {
    'submission_id': str(submission_id),
    'problem_id': str(problem_id),
    'source_code': test_code,
    'language': 'C'
}

redis_client.rpush('judge_queue', json.dumps(job_data))
print("✓ Job pushed to queue!")

print("\n" + "="*60)
print("TEST SUBMISSION CREATED!")
print("="*60)
print(f"Submission ID: {submission_id}")
print(f"Problem: A+B Problem")
print(f"Language: C")
print("\nNow run the judge worker to process this submission:")
print("  python worker.py")
print("="*60)

conn.close()