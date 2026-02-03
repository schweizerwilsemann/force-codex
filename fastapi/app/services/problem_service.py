from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException

from app.repositories.problem_repository import ProblemRepository
from app.schemas import coding as schemas
from app.models import users as user_models
from app.models import coding as models

class ProblemService:
    def __init__(self, db: Session):
        self.repo = ProblemRepository(db)

    def get_problems(self, skip: int, limit: int, current_user: Optional[user_models.User] = None, course_id: Optional[UUID] = None) -> List[models.Problem]:
        if course_id:
             return self.repo.get_problems_by_course_ids([course_id], skip, limit)

        if current_user and current_user.role and current_user.role.role_name == 'student':
             from app.repositories.enrollment_repository import EnrollmentRepository
             enroll_repo = EnrollmentRepository(self.repo.db)
             enrollments = enroll_repo.get_student_enrollments(current_user.user_id)
             course_ids = [e.course_id for e in enrollments]
             
             if not course_ids:
                  return []
             
             return self.repo.get_problems_by_course_ids(course_ids, skip, limit)
             
        return self.repo.get_problems(skip, limit)

    def get_problem(self, problem_id: UUID) -> models.Problem:
        problem = self.repo.get_problem(problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        
        # Inject sample test cases into the response via transient attribute if it's not a Pydantic model response
        # or rely on the endpoint to format it. 
        # But we can set the attribute for Pydantic 'from_attributes' to pick up.
        problem.sample_test_cases = [tc for tc in problem.test_cases if tc.is_sample]
        return problem

    def create_problem(self, problem: schemas.ProblemCreate, current_user: user_models.User) -> models.Problem:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền tạo bài tập")
        
        db_problem = self.repo.create(problem.model_dump())
        db_problem.sample_test_cases = [] # Initialize for schema
        return db_problem

    def update_problem(self, problem_id: UUID, problem: schemas.ProblemCreate, current_user: user_models.User) -> models.Problem:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền sửa bài tập")
        
        db_problem = self.repo.get_problem(problem_id)
        if not db_problem:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
            
        updated = self.repo.update(db_problem, problem.model_dump())
        updated.sample_test_cases = [tc for tc in updated.test_cases if tc.is_sample]
        return updated

    def delete_problem(self, problem_id: UUID, current_user: user_models.User) -> dict:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền xóa bài tập")
        
        db_problem = self.repo.get_problem(problem_id)
        if not db_problem:
             raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
        
        self.repo.delete(db_problem)
        return {"message": "Đã xóa bài tập"}

    # --- Test Cases ---

    def create_test_case(self, problem_id: UUID, test_case: schemas.TestCaseCreate, current_user: user_models.User) -> models.TestCase:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền thêm test case")
        
        if not self.repo.get_problem(problem_id):
             raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
             
        data = test_case.model_dump()
        data['problem_id'] = problem_id
        return self.repo.create_test_case(data)

    def get_test_cases(self, problem_id: UUID, current_user: user_models.User) -> List[models.TestCase]:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền xem test cases")
        
        return self.repo.get_test_cases(problem_id)

    def delete_test_case(self, test_case_id: UUID, current_user: user_models.User) -> dict:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền xóa test case")
        
        test_case = self.repo.get_test_case(test_case_id)
        if not test_case:
             raise HTTPException(status_code=404, detail="Không tìm thấy test case")
        
        self.repo.delete_test_case(test_case)
        return {"message": "Đã xóa test case"}

    def get_problem_rankings(self, problem_id: UUID, current_user: user_models.User) -> List[schemas.StudentAssignmentResult]:
        """Aggregate best submissions per student for a given problem and return rankings."""
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
            raise HTTPException(status_code=403, detail="Không có quyền xem bảng xếp hạng")

        problem = self.repo.get_problem(problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")

        # Enrolled students
        from app.repositories.enrollment_repository import EnrollmentRepository
        enroll_repo = EnrollmentRepository(self.repo.db)
        enrollments = enroll_repo.get_course_enrollments(problem.course_id)
        student_map = {e.student.student_id: e.student.user.full_name for e in enrollments}
        student_ids = list(student_map.keys())

        # Fetch submissions for the problem
        from app.repositories.submission_repository import SubmissionRepository
        sub_repo = SubmissionRepository(self.repo.db)
        all_subs = sub_repo.get_by_problem(problem_id)

        subs_by_student: dict = {}
        for sub in all_subs:
            sid = sub.student_id
            if sid not in subs_by_student:
                subs_by_student[sid] = []
            subs_by_student[sid].append(sub)

        results = []
        for sid in student_ids:
            name = student_map.get(sid, "Unknown")
            subs = subs_by_student.get(sid, [])
            if not subs:
                results.append(schemas.StudentAssignmentResult(
                    student_id=sid,
                    student_name=name,
                    attempts=0,
                    best_score=None,
                    adjusted_score=None,
                    last_submission=None,
                    has_late_submission=False,
                    late_status='no_submission'
                ))
                continue

            attempts = len(subs)
            best = max(subs, key=lambda x: (x.score or 0, x.submitted_at or x.created_at))
            last_submitted_at = max((s.submitted_at or s.created_at) for s in subs)
            has_late = any(getattr(s, 'is_late', False) for s in subs)

            # For problems, treat late submissions as flagged but no penalty by default
            adjusted = float(best.score or 0)
            late_status = 'penalized' if getattr(best, 'is_late', False) else 'ok'

            results.append(schemas.StudentAssignmentResult(
                student_id=sid,
                student_name=name,
                attempts=attempts,
                best_score=best.score,
                adjusted_score=round(adjusted, 2),
                last_submission=last_submitted_at,
                has_late_submission=has_late,
                late_status=late_status
            ))

        results.sort(key=lambda r: ((r.adjusted_score if r.adjusted_score is not None else -1.0), r.last_submission.timestamp() if r.last_submission else 0), reverse=True)
        return results