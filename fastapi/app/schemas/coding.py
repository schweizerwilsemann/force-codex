from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime
from uuid import UUID

# --- Test Case Schemas ---
class TestCaseBase(BaseModel):
    input: str
    expected_output: str
    is_sample: bool = False
    points: int = 10
    order_index: int = 0

class TestCaseCreate(TestCaseBase):
    pass

class TestCase(TestCaseBase):
    test_case_id: UUID
    problem_id: UUID

    class Config:
        from_attributes = True

# --- Problem Schemas ---
class ProblemBase(BaseModel):
    problem_code: str
    title: str
    description: Optional[str] = None
    difficulty: str = "medium"
    time_limit: int = 1000
    memory_limit: int = 256
    allowed_languages: List[str] = []

class ProblemCreate(ProblemBase):
    course_id: Optional[UUID] = None

class Problem(ProblemBase):
    problem_id: UUID
    course_id: Optional[UUID] = None
    created_at: Optional[datetime]
    
    # We might want to include sample test cases in the problem details
    sample_test_cases: List[TestCase] = []

    class Config:
        from_attributes = True

# --- Submission Schemas ---
class SubmissionBase(BaseModel):
    language: str
    source_code: str

class SubmissionCreate(SubmissionBase):
    problem_id: UUID
    assignment_id: Optional[UUID] = None

class SubmissionTestResult(BaseModel):
    result_id: UUID
    test_case_id: UUID
    status: str
    execution_time: Optional[int]
    memory_used: Optional[int]
    # We usually hide actual output for non-sample cases in production, 
    # but for now let's show it or maybe logic to hide later.
    actual_output: Optional[str]
    error_message: Optional[str]

    class Config:
        from_attributes = True

class Submission(SubmissionBase):
    submission_id: UUID
    student_id: UUID
    status: str
    score: int = 0
    execution_time: Optional[int]
    memory_used: Optional[int]
    test_cases_passed: int = 0
    total_test_cases: int = 0
    created_at: datetime
    judged_at: Optional[datetime]
    
    test_results: List[SubmissionTestResult] = []

    class Config:
        from_attributes = True

# --- List Response ---
class ProblemList(BaseModel):
    problem_id: UUID
    problem_code: str
    title: str
    difficulty: str
    
    class Config:
        from_attributes = True

class SubmissionListItem(BaseModel):
    """Lightweight schema for submission history list"""
    submission_id: UUID
    status: str
    score: int = 0
    execution_time: Optional[int]
    memory_used: Optional[int]
    language: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class StudentAssignmentResult(BaseModel):
    """Aggregated student result for an assignment (class view)."""
    student_id: UUID
    student_name: str
    attempts: int
    best_score: Optional[int] = None
    adjusted_score: Optional[float] = None
    last_submission: Optional[datetime] = None
    has_late_submission: bool = False
    late_status: Optional[str] = None  # 'ok', 'penalized', 'rejected', 'no_submission'

    class Config:
        from_attributes = True
