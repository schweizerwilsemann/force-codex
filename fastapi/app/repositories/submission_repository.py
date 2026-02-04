from sqlalchemy.orm import Session, joinedload
from app.models import coding as models
from uuid import UUID
from typing import List, Optional

class SubmissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, submission_id: UUID) -> Optional[models.Submission]:
        return self.db.query(models.Submission).options(
            joinedload(models.Submission.test_results)
        ).filter(models.Submission.submission_id == submission_id).first()

    def get_by_student(self, student_id: UUID) -> List[models.Submission]:
        return self.db.query(models.Submission).filter(
            models.Submission.student_id == student_id
        ).order_by(models.Submission.created_at.desc()).all()

    def get_by_problem_and_student(self, problem_id: UUID, student_id: UUID, limit: int = 50) -> List[models.Submission]:
        return self.db.query(models.Submission).filter(
            models.Submission.problem_id == problem_id,
            models.Submission.student_id == student_id
        ).order_by(models.Submission.created_at.desc()).limit(limit).all()

    def create(self, submission_data: dict) -> models.Submission:
        db_submission = models.Submission(**submission_data)
        self.db.add(db_submission)
        self.db.commit()
        self.db.refresh(db_submission)
        return db_submission

    def get_by_problem(self, problem_id: UUID) -> List[models.Submission]:
        from app.models import users as user_models
        # Get latest submission for each student using DISTINCT ON
        submissions = self.db.query(models.Submission).options(
            joinedload(models.Submission.student).joinedload(user_models.Student.user)
        ).filter(
            models.Submission.problem_id == problem_id
        ).distinct(
            models.Submission.student_id
        ).order_by(
            models.Submission.student_id, models.Submission.created_at.desc()
        ).all()
        
        # Sort by created_at desc to show latest activities first
        submissions.sort(key=lambda x: x.created_at, reverse=True)
        return submissions
