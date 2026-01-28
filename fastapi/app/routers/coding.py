from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID
import json
import redis
import os

from app.db.database import get_db
from app.models import coding as models
from app.schemas import coding as schemas
from app.routers.users import get_current_user

# Redis Helper
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
redis_client = redis.from_url(REDIS_URL)

router = APIRouter()

@router.get("/problems", response_model=List[schemas.ProblemList])
def read_problems(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    problems = db.query(models.Problem).offset(skip).limit(limit).all()
    return problems

@router.get("/problems/{problem_id}", response_model=schemas.Problem)
def read_problem(problem_id: UUID, db: Session = Depends(get_db)):
    problem = db.query(models.Problem).filter(models.Problem.problem_id == problem_id).first()
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Inject sample test cases into the response
    # The relationship is 'test_cases', so we filter them
    problem.sample_test_cases = [tc for tc in problem.test_cases if tc.is_sample]
    
    return problem

@router.post("/submissions", response_model=schemas.Submission)
def create_submission(
    submission: schemas.SubmissionCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify problem exists
    problem = db.query(models.Problem).filter(models.Problem.problem_id == submission.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Verify student exists (or use current_user.id as student_id if role check passes)
    # For simplicity, assuming current_user is a student or we just link to user_id (if student_id == user_id)
    # The models say Submission.student_id -> students.student_id -> users.user_id
    # We should probably check if user is a student.
    
    # For MVP, assuming user_id IS student_id matches (common pattern)
    student_id = current_user.user_id 
    
    try:
        db_submission = models.Submission(
            problem_id=submission.problem_id,
            assignment_id=submission.assignment_id,
            student_id=student_id,
            language=submission.language,
            source_code=submission.source_code,
            status="pending"
        )
        db.add(db_submission)
        db.commit()
        db.refresh(db_submission)
    except Exception as e:
        print(f"DATABASE ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
    # Push to Redis
    job_data = {
        'submission_id': str(db_submission.submission_id),
        'problem_id': str(submission.problem_id),
        'source_code': submission.source_code,
        'language': submission.language
    }
    
    try:
        redis_client.rpush('judge_queue', json.dumps(job_data))
    except Exception as e:
        # If redis fails, maybe rollback or set status to error?
        # For now log and ignore (worker won't pick it up, status stays pending)
        print(f"Redis error: {e}")
        
    return db_submission

@router.get("/submissions/{submission_id}", response_model=schemas.Submission)
def read_submission(submission_id: UUID, db: Session = Depends(get_db)):
    submission = db.query(models.Submission).options(joinedload(models.Submission.test_results)).filter(models.Submission.submission_id == submission_id).first()
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@router.get("/my-submissions", response_model=List[schemas.Submission])
def read_my_submissions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    submissions = db.query(models.Submission).filter(models.Submission.student_id == current_user.user_id).order_by(models.Submission.created_at.desc()).all()
    return submissions

@router.get("/problems/{problem_id}/submissions", response_model=List[schemas.SubmissionListItem])
def read_problem_submissions(
    problem_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get current user's submissions for a specific problem"""
    submissions = db.query(models.Submission).filter(
        models.Submission.problem_id == problem_id,
        models.Submission.student_id == current_user.user_id
    ).order_by(models.Submission.created_at.desc()).limit(50).all()
    return submissions

# --- Admin Endpoints ---

@router.post("/problems", response_model=schemas.Problem)
def create_problem(
    problem: schemas.ProblemCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new problem (admin/lecturer only)"""
    # Check role - only admin or lecturer can create problems
    if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền tạo bài tập")
    
    db_problem = models.Problem(**problem.model_dump())
    db.add(db_problem)
    db.commit()
    db.refresh(db_problem)
    db_problem.sample_test_cases = []
    return db_problem

@router.put("/problems/{problem_id}", response_model=schemas.Problem)
def update_problem(
    problem_id: UUID,
    problem: schemas.ProblemCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an existing problem"""
    if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền sửa bài tập")
    
    db_problem = db.query(models.Problem).filter(models.Problem.problem_id == problem_id).first()
    if not db_problem:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
    
    for key, value in problem.model_dump().items():
        setattr(db_problem, key, value)
    
    db.commit()
    db.refresh(db_problem)
    db_problem.sample_test_cases = [tc for tc in db_problem.test_cases if tc.is_sample]
    return db_problem

@router.delete("/problems/{problem_id}")
def delete_problem(
    problem_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a problem"""
    if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền xóa bài tập")
    
    db_problem = db.query(models.Problem).filter(models.Problem.problem_id == problem_id).first()
    if not db_problem:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
    
    db.delete(db_problem)
    db.commit()
    return {"message": "Đã xóa bài tập"}

# --- Test Case Endpoints ---

@router.post("/problems/{problem_id}/test-cases", response_model=schemas.TestCase)
def create_test_case(
    problem_id: UUID,
    test_case: schemas.TestCaseCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add a test case to a problem"""
    if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền thêm test case")
    
    db_problem = db.query(models.Problem).filter(models.Problem.problem_id == problem_id).first()
    if not db_problem:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
    
    db_test_case = models.TestCase(problem_id=problem_id, **test_case.model_dump())
    db.add(db_test_case)
    db.commit()
    db.refresh(db_test_case)
    return db_test_case

@router.get("/problems/{problem_id}/test-cases", response_model=List[schemas.TestCase])
def get_test_cases(
    problem_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all test cases for a problem (admin/lecturer only)"""
    if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền xem test cases")
    
    test_cases = db.query(models.TestCase).filter(
        models.TestCase.problem_id == problem_id
    ).order_by(models.TestCase.order_index).all()
    return test_cases

@router.delete("/test-cases/{test_case_id}")
def delete_test_case(
    test_case_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a test case"""
    if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền xóa test case")
    
    db_test_case = db.query(models.TestCase).filter(models.TestCase.test_case_id == test_case_id).first()
    if not db_test_case:
        raise HTTPException(status_code=404, detail="Không tìm thấy test case")
    
    db.delete(db_test_case)
    db.commit()
    return {"message": "Đã xóa test case"}
