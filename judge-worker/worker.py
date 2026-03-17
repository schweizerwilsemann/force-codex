"""
Simple Judge Worker - Dùng subprocess để test local
CẢNH BÁO: Không an toàn cho production! Chỉ dùng để test!
"""

import os
import json
import redis
import psycopg2
from psycopg2.extras import RealDictCursor
import time
import tempfile
import subprocess
from pathlib import Path
import signal
import psutil
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Config
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:1772313@localhost:5432/FORCECODEX')
WORKER_CONCURRENCY = int(os.getenv('WORKER_CONCURRENCY', 2))

# Initialize clients
redis_client = redis.from_url(REDIS_URL)

def get_db_connection():
    """Kết nối PostgreSQL"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def update_submission_status(conn, submission_id, status, **kwargs):
    """Update submission status trong DB"""
    with conn.cursor() as cur:
        fields = ['status = %s']
        values = [status]
        
        for key, value in kwargs.items():
            fields.append(f"{key} = %s")
            values.append(value)
        
        values.append(submission_id)
        
        query = f"""
            UPDATE submissions 
            SET {', '.join(fields)}, judged_at = CURRENT_TIMESTAMP
            WHERE submission_id = %s
        """
        cur.execute(query, values)
        conn.commit()

def save_test_result(conn, submission_id, test_case_id, result):
    """Lưu kết quả từng test case"""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO submission_test_results 
            (submission_id, test_case_id, status, execution_time, 
             memory_used, actual_output, error_message)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            submission_id,
            test_case_id,
            result['status'],
            result.get('execution_time'),
            result.get('memory_used'),
            result.get('actual_output'),
            result.get('error_message')
        ))
        conn.commit()

def compile_code(source_code, language, work_dir):
    """
    Compile C/C++ code với subprocess
    Returns: (success, executable_path, error_message)
    """
    
    # Tạo file source
    ext = '.c' if language == 'C' else '.cpp'
    source_file = work_dir / f'solution{ext}'
    source_file.write_text(source_code, encoding='utf-8')
    
    # Executable path
    exe_file = work_dir / 'solution'
    
    # Compile command
    if language == 'C':
        cmd = [
            'gcc',
            str(source_file),
            '-o', str(exe_file),
            '-lm',           # Math library
            '-O2',           # Optimization
            '-std=c11',      # C11 standard
            '-DONLINE_JUDGE' # Define macro
        ]
    else:  # C++
        cmd = [
            'g++',
            str(source_file),
            '-o', str(exe_file),
            '-lm',
            '-O2',
            '-std=c++17',    # C++17 standard
            '-DONLINE_JUDGE'
        ]
    
    try:
        # Run compiler
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=10  # 10 seconds compile timeout
        )
        
        if result.returncode == 0:
            return True, exe_file, None
        else:
            # Compile error
            error_msg = result.stderr if result.stderr else result.stdout
            return False, None, error_msg
            
    except subprocess.TimeoutExpired:
        return False, None, 'Compilation timeout (>10s)'
    except Exception as e:
        return False, None, f'Compile error: {str(e)}'

def run_test_case(executable_path, test_input, test_output, time_limit, memory_limit):
    """
    Chạy test case với subprocess
    time_limit: milliseconds
    memory_limit: MB (không enforce được với subprocess - chỉ để thông tin)
    
    Returns: dict với status, time, memory, output, error
    """
    
    work_dir = executable_path.parent
    input_file = work_dir / 'input.txt'
    input_file.write_text(test_input, encoding='utf-8')
    
    try:
        start_time = time.time()
        
        # Run executable
        with open(input_file, 'r') as inp:
            process = subprocess.Popen(
                [str(executable_path)],
                stdin=inp,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=work_dir,
                # Limit resources (Linux only)
                preexec_fn=os.setpgrp  # Create new process group
            )
            
            # Memory monitoring
            max_memory_usage = 0
            try:
                p = psutil.Process(process.pid)
                # Monitor while process is running
                while process.poll() is None:
                    try:
                        mem_info = p.memory_info()
                        max_memory_usage = max(max_memory_usage, mem_info.rss)
                    except psutil.NoSuchProcess:
                        break
                    time.sleep(0.01) # Check every 10ms
            except Exception:
                pass
            
            try:
                # Wait with timeout (convert ms to seconds)
                stdout, stderr = process.communicate(timeout=time_limit / 1000.0)
                execution_time = int((time.time() - start_time) * 1000)  # ms
                
                # Check if crashed
                if process.returncode != 0:
                    return {
                        'status': 'runtime_error',
                        'execution_time': execution_time,
                        'memory_used': int(max_memory_usage / 1024),  # Bytes -> KB
                        'actual_output': stdout,
                        'error_message': stderr if stderr else f'Exit code: {process.returncode}'
                    }
                
                # Compare output
                actual_output = stdout.strip()
                expected_output = test_output.strip()
                
                if actual_output == expected_output:
                    return {
                        'status': 'passed',
                        'execution_time': execution_time,
                        'memory_used': int(max_memory_usage / 1024),  # Bytes -> KB
                        'actual_output': stdout,
                        'error_message': None
                    }
                else:
                    return {
                        'status': 'wrong_answer',
                        'execution_time': execution_time,
                        'memory_used': 0,
                        'actual_output': stdout,
                        'error_message': f'Expected: {expected_output[:100]}...\nGot: {actual_output[:100]}...'
                    }
                    
            except subprocess.TimeoutExpired:
                # Kill process
                process.kill()
                process.wait()
                return {
                    'status': 'time_limit_exceeded',
                    'execution_time': time_limit,
                    'memory_used': 0,
                    'actual_output': '',
                    'error_message': f'Time limit exceeded ({time_limit}ms)'
                }
                
    except Exception as e:
        return {
            'status': 'runtime_error',
            'execution_time': 0,
            'memory_used': 0,
            'actual_output': '',
            'error_message': str(e)
        }

def judge_submission(submission_data):
    """
    Main judging logic
    """
    submission_id = submission_data['submission_id']
    source_code = submission_data['source_code']
    language = submission_data['language']
    problem_id = submission_data['problem_id']
    
    conn = get_db_connection()
    
    try:
        # Update status to judging
        update_submission_status(conn, submission_id, 'judging')
        print(f"[{submission_id}] Started judging...")
        
        # Get test cases
        with conn.cursor() as cur:
            cur.execute("""
                SELECT test_case_id, input, expected_output, points
                FROM test_cases
                WHERE problem_id = %s
                ORDER BY order_index
            """, (problem_id,))
            test_cases = cur.fetchall()
        
        print(f"[{submission_id}] Found {len(test_cases)} test cases")
        
        # Get limits
        with conn.cursor() as cur:
            cur.execute("""
                SELECT time_limit, memory_limit
                FROM problems
                WHERE problem_id = %s
            """, (problem_id,))
            limits = cur.fetchone()
        
        time_limit = limits['time_limit']  # ms
        memory_limit = limits['memory_limit']  # MB
        
        # Create temp directory
        with tempfile.TemporaryDirectory() as temp_dir:
            work_dir = Path(temp_dir)
            
            # Compile code
            print(f"[{submission_id}] Compiling {language} code...")
            success, executable, compile_error = compile_code(
                source_code, language, work_dir
            )
            
            if not success:
                print(f"[{submission_id}] Compile error!")
                update_submission_status(
                    conn, submission_id, 'compile_error',
                    score=0,
                    test_cases_passed=0,
                    total_test_cases=len(test_cases)
                )
                return
            
            print(f"[{submission_id}] Compilation successful!")
            
            # Run test cases
            passed = 0
            total_score = 0
            max_time = 0
            max_memory = 0
            final_status = 'accepted'
            
            for i, test in enumerate(test_cases):
                print(f"[{submission_id}] Running test case {i+1}/{len(test_cases)}...")
                
                result = run_test_case(
                    executable,
                    test['input'],
                    test['expected_output'],
                    time_limit,
                    memory_limit
                )
                
                print(f"[{submission_id}] Test {i+1}: {result['status']}")
                
                # Save result
                save_test_result(
                    conn, submission_id, test['test_case_id'], result
                )
                
                # Update stats
                if result['status'] == 'passed':
                    passed += 1
                    total_score += test['points']
                else:
                    final_status = result['status']
                
                max_time = max(max_time, result.get('execution_time', 0))
                max_memory = max(max_memory, result.get('memory_used', 0))
            
            # Update final submission status
            print(f"[{submission_id}] Final: {passed}/{len(test_cases)} passed, Score: {total_score}")
            update_submission_status(
                conn, submission_id, final_status,
                score=total_score,
                execution_time=max_time,
                memory_used=max_memory,
                test_cases_passed=passed,
                total_test_cases=len(test_cases)
            )
            
    except Exception as e:
        print(f"[{submission_id}] ERROR: {e}")
        import traceback
        traceback.print_exc()
        
        update_submission_status(
            conn, submission_id, 'system_error',
            score=0
        )
    finally:
        conn.close()

def worker_loop():
    """Main worker loop"""
    print("=" * 60)
    print("Simple Judge Worker Started (TEST MODE - NOT SECURE!)")
    print("=" * 60)
    print(f"Database: {DATABASE_URL}")
    print(f"Redis: {REDIS_URL}")
    print(f"Concurrency: {WORKER_CONCURRENCY}")
    print("=" * 60)
    print("Waiting for jobs...")
    print()
    
    while True:
        try:
            # Pop job from Redis queue (blocking with 1s timeout)
            job = redis_client.blpop('judge_queue', timeout=1)
            
            if job:
                _, job_data = job
                submission_data = json.loads(job_data)
                
                print(f"\n>>> Processing submission: {submission_data['submission_id']}")
                judge_submission(submission_data)
                print(f">>> Finished submission: {submission_data['submission_id']}\n")
                
        except KeyboardInterrupt:
            print("\n\nShutting down worker...")
            break
        except Exception as e:
            print(f"Worker error: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(1)

if __name__ == '__main__':
    # Check if gcc/g++ available
    try:
        subprocess.run(['gcc', '--version'], capture_output=True, check=True)
        subprocess.run(['g++', '--version'], capture_output=True, check=True)
        print("✓ GCC/G++ found\n")
    except:
        print("ERROR: GCC/G++ not found! Please install:")
        print("  sudo pacman -S gcc")
        exit(1)
    
    worker_loop()