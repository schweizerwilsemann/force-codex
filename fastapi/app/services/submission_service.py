from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
import json
import redis
import os
from fastapi import HTTPException

from app.repositories.submission_repository import SubmissionRepository
from app.repositories.problem_repository import ProblemRepository
from app.schemas import coding as schemas
from app.models import users as user_models
from app.models import coding as models

class SubmissionService:
    def __init__(self, db: Session):
        self.repo = SubmissionRepository(db)
        self.problem_repo = ProblemRepository(db)
        # Initialize Redis
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = redis.from_url(redis_url)

    def create_submission(self, submission: schemas.SubmissionCreate, current_user: user_models.User) -> models.Submission:
        # Verify problem exists
        problem = self.problem_repo.get_problem(submission.problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")

        # Use current user ID as student ID (Assuming User IS Student mostly)
        student_id = current_user.user_id 
        
        try:
            db_submission = self.repo.create({
                "problem_id": submission.problem_id,
                "assignment_id": submission.assignment_id,
                "student_id": student_id,
                "language": submission.language,
                "source_code": submission.source_code,
                "status": "pending"
            })
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
            self.redis_client.rpush('judge_queue', json.dumps(job_data))
        except Exception as e:
            print(f"Redis error: {e}")
            # We log but don't fail the request, though status will remain pending indefinitely without a retry mechanism
            
        return db_submission

    def get_submission(self, submission_id: UUID) -> models.Submission:
        submission = self.repo.get(submission_id)
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        return submission

    def get_my_submissions(self, current_user: user_models.User) -> List[models.Submission]:
        return self.repo.get_by_student(current_user.user_id)

    def get_problem_submissions(self, problem_id: UUID, current_user: user_models.User) -> List[models.Submission]:
        return self.repo.get_by_problem_and_student(problem_id, current_user.user_id)
