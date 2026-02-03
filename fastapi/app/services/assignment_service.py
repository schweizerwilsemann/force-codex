from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException

from app.repositories.assignment_repository import AssignmentRepository
from app.repositories.course_repository import CourseRepository
from app.repositories.problem_repository import ProblemRepository
from app.repositories.enrollment_repository import EnrollmentRepository
from app.schemas import courses as schemas
from app.schemas import coding as coding_schemas
from app.models import users as user_models
from app.models import coding as models

class AssignmentService:
    def __init__(self, db: Session):
        self.repo = AssignmentRepository(db)
        self.course_repo = CourseRepository(db)
        self.problem_repo = ProblemRepository(db)
        self.enrollment_repo = EnrollmentRepository(db)

    def _convert_to_stats_schema(self, assignment: models.Assignment) -> schemas.AssignmentWithStats:
        submission_count = len(assignment.submissions) if assignment.submissions else 0
        completed_count = sum(1 for s in (assignment.submissions or []) if s.status == 'accepted')
        
        return schemas.AssignmentWithStats(
            assignment_id=assignment.assignment_id,
            course_id=assignment.course_id,
            problem_id=assignment.problem_id,
            title=assignment.title,
            description=assignment.description,
            max_score=assignment.max_score,
            start_date=assignment.start_date,
            due_date=assignment.due_date,
            problem_title=assignment.problem.title if assignment.problem else None,
            course_name=assignment.course.course_name if assignment.course else None,
            submission_count=submission_count,
            completed_count=completed_count
        )

    def get_assignments(self, skip: int, limit: int, course_id: Optional[UUID], current_user: user_models.User) -> List[schemas.AssignmentWithStats]:
        # If student, limit to enrolled courses? Or just duplicate existing logic?
        # Original logic: 
        # "Students see assignments for their courses (via CourseEnrollment)"
        # But wait, original code did a Join if student.
        # My repository `get_assignments` does simple filter.
        # I should reuse `get_my_assignments` logic if student and no course_id provided? 
        # Or I can implement the complex query in Repository if I wanted to match exact behavior.
        # But simpler: If student, get enrolled courses, filter by those IDs if course_id not specified.
        
        if current_user.role and current_user.role.role_name == 'student':
             enrollments = self.enrollment_repo.get_student_enrollments(current_user.user_id)
             enrolled_course_ids = [e.course_id for e in enrollments]
             
             if course_id:
                  if course_id not in enrolled_course_ids:
                       return [] # Not enrolled
                  target_ids = [course_id]
             else:
                  target_ids = enrolled_course_ids
             
             assignments = self.repo.get_by_course_ids(target_ids) # This sorts by date asc 
             # Original generic list sorted desc. Let's just return what we have.
             # Actually `get_assignments` was desc. 
        else:
             assignments = self.repo.get_assignments(skip, limit, course_id)

        return [self._convert_to_stats_schema(a) for a in assignments]

    def get_my_assignments(self, current_user: user_models.User) -> List[schemas.AssignmentWithStats]:
        if not current_user.role or current_user.role.role_name != 'student':
            raise HTTPException(status_code=403, detail="Chỉ sinh viên mới có thể xem bài tập của mình")
        
        enrollments = self.enrollment_repo.get_student_enrollments(current_user.user_id)
        course_ids = [e.course_id for e in enrollments]
        
        if not course_ids:
            return []
        
        assignments = self.repo.get_by_course_ids(course_ids)
        
        result = []
        for assignment in assignments:
            # Count this student's submissions for this assignment
            my_submissions = [s for s in (assignment.submissions or []) if s.student_id == current_user.user_id]
            completed = any(s.status == 'accepted' for s in my_submissions)
            
            result.append(schemas.AssignmentWithStats(
                assignment_id=assignment.assignment_id,
                course_id=assignment.course_id,
                problem_id=assignment.problem_id,
                title=assignment.title,
                description=assignment.description,
                max_score=assignment.max_score,
                start_date=assignment.start_date,
                due_date=assignment.due_date,
                problem_title=assignment.problem.title if assignment.problem else None,
                course_name=assignment.course.course_name if assignment.course else None,
                submission_count=len(my_submissions),
                completed_count=1 if completed else 0
            ))
        return result

    def get_assignment(self, assignment_id: UUID) -> schemas.AssignmentWithStats:
        assignment = self.repo.get_assignment(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
        return self._convert_to_stats_schema(assignment)

    def create_assignment(self, assignment: schemas.AssignmentCreate, current_user: user_models.User) -> schemas.AssignmentResponse:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
            raise HTTPException(status_code=403, detail="Không có quyền tạo bài tập")
            
        course = self.course_repo.get(assignment.course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Không tìm thấy học phần")
            
        problem = self.problem_repo.get_problem(assignment.problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Không tìm thấy đề bài")
            
        db_assignment = self.repo.create(assignment.model_dump())
        
        return schemas.AssignmentResponse(
            assignment_id=db_assignment.assignment_id,
            course_id=db_assignment.course_id,
            problem_id=db_assignment.problem_id,
            title=db_assignment.title,
            description=db_assignment.description,
            max_score=db_assignment.max_score,
            start_date=db_assignment.start_date,
            due_date=db_assignment.due_date,
            problem_title=problem.title,
            course_name=course.course_name
        )

    def update_assignment(self, assignment_id: UUID, assignment: schemas.AssignmentUpdate, current_user: user_models.User) -> models.Assignment:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền sửa bài tập")
        
        db_assignment = self.repo.get_assignment(assignment_id)
        if not db_assignment:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
            
        return self.repo.update(db_assignment, assignment.model_dump(exclude_unset=True))

    def delete_assignment(self, assignment_id: UUID, current_user: user_models.User) -> dict:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền xóa bài tập")
        
        db_assignment = self.repo.get_assignment(assignment_id)
        if not db_assignment:
             raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
             
        self.repo.delete(db_assignment)
        return {"message": "Đã xóa bài tập thành công"}

    def get_assignment_submissions(self, assignment_id: UUID, current_user: user_models.User) -> List[models.Submission]:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền xem submissions")
        
        return self.repo.get_submissions(assignment_id)

    def get_assignment_rankings(self, assignment_id: UUID, current_user: user_models.User) -> List[coding_schemas.StudentAssignmentResult]:
        """Return aggregated student rankings for a given assignment.
        Sorted by adjusted score (desc) then last submission time (desc).
        Handles late submissions by applying late penalty or rejecting if not allowed.
        """
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
            raise HTTPException(status_code=403, detail="Không có quyền xem bảng xếp hạng")

        assignment = self.repo.get_assignment(assignment_id)
        if not assignment:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")

        # Get enrolled students for the course
        enrollments = self.enrollment_repo.get_course_enrollments(assignment.course_id)
        student_map = {e.student.student_id: e.student.user.full_name for e in enrollments}
        student_ids = list(student_map.keys())

        # Fetch all submissions for the assignment and group by student
        all_subs = self.repo.get_submissions(assignment_id)
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
                results.append(coding_schemas.StudentAssignmentResult(
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
            # Find best submission (highest score, tie-breaker latest submitted_at)
            best = max(subs, key=lambda x: (x.score or 0, x.submitted_at or x.created_at))
            last_submitted_at = max((s.submitted_at or s.created_at) for s in subs)
            has_late = any(getattr(s, 'is_late', False) for s in subs)

            # Apply late policy
            adjusted = float(best.score or 0)
            late_status = 'ok'
            if getattr(best, 'is_late', False):
                if not assignment.allow_late_submission:
                    adjusted = 0.0
                    late_status = 'rejected'
                else:
                    penalty_pct = assignment.late_penalty_percent or 0
                    adjusted = adjusted * (1.0 - (penalty_pct / 100.0))
                    late_status = 'penalized' if penalty_pct else 'ok'

            results.append(coding_schemas.StudentAssignmentResult(
                student_id=sid,
                student_name=name,
                attempts=attempts,
                best_score=best.score,
                adjusted_score=round(adjusted, 2),
                last_submission=last_submitted_at,
                has_late_submission=has_late,
                late_status=late_status
            ))

        # Sort: adjusted_score desc (None -> -inf), then last_submission desc (None -> earliest)
        def sort_key(r: coding_schemas.StudentAssignmentResult):
            adj = r.adjusted_score if r.adjusted_score is not None else -1.0
            last = r.last_submission.timestamp() if r.last_submission else 0
            return (adj, last)

        results.sort(key=sort_key, reverse=True)
        return results
