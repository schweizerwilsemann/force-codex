from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.schemas import coding as schemas
from app.api.v1.endpoints.users import get_current_user
from app.services.problem_service import ProblemService
from app.services.submission_service import SubmissionService

router = APIRouter()

# --- Problem Endpoints ---

@router.get("/problems", response_model=List[schemas.ProblemList])
def read_problems(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    service = ProblemService(db)
    return service.get_problems(skip, limit)

@router.get("/problems/{problem_id}", response_model=schemas.Problem)
def read_problem(problem_id: UUID, db: Session = Depends(get_db)):
    service = ProblemService(db)
    return service.get_problem(problem_id)

@router.post("/problems", response_model=schemas.Problem)
def create_problem(
    problem: schemas.ProblemCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new problem (admin/lecturer only)"""
    service = ProblemService(db)
    return service.create_problem(problem, current_user)

@router.put("/problems/{problem_id}", response_model=schemas.Problem)
def update_problem(
    problem_id: UUID,
    problem: schemas.ProblemCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an existing problem"""
    service = ProblemService(db)
    return service.update_problem(problem_id, problem, current_user)

@router.delete("/problems/{problem_id}")
def delete_problem(
    problem_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a problem"""
    service = ProblemService(db)
    return service.delete_problem(problem_id, current_user)


# --- Test Case Endpoints ---

@router.post("/problems/{problem_id}/test-cases", response_model=schemas.TestCase)
def create_test_case(
    problem_id: UUID,
    test_case: schemas.TestCaseCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add a test case to a problem"""
    service = ProblemService(db)
    return service.create_test_case(problem_id, test_case, current_user)

@router.get("/problems/{problem_id}/test-cases", response_model=List[schemas.TestCase])
def get_test_cases(
    problem_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all test cases for a problem (admin/lecturer only)"""
    service = ProblemService(db)
    return service.get_test_cases(problem_id, current_user)

@router.delete("/test-cases/{test_case_id}")
def delete_test_case(
    test_case_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a test case"""
    service = ProblemService(db)
    return service.delete_test_case(test_case_id, current_user)


# --- Submission Endpoints ---

@router.post("/submissions", response_model=schemas.Submission)
def create_submission(
    submission: schemas.SubmissionCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = SubmissionService(db)
    return service.create_submission(submission, current_user)

@router.get("/submissions/{submission_id}", response_model=schemas.Submission)
def read_submission(submission_id: UUID, db: Session = Depends(get_db)):
    service = SubmissionService(db)
    return service.get_submission(submission_id)

@router.get("/my-submissions", response_model=List[schemas.Submission])
def read_my_submissions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    service = SubmissionService(db)
    return service.get_my_submissions(current_user)

@router.get("/problems/{problem_id}/submissions", response_model=List[schemas.SubmissionListItem])
def read_problem_submissions(
    problem_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get current user's submissions for a specific problem"""
    service = SubmissionService(db)
    return service.get_problem_submissions(problem_id, current_user)
