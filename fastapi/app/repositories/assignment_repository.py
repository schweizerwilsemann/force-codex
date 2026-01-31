from sqlalchemy.orm import Session, joinedload
from app.models import coding as models
from uuid import UUID
from typing import List, Optional

class AssignmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_assignment(self, assignment_id: UUID) -> Optional[models.Assignment]:
        return self.db.query(models.Assignment).options(
            joinedload(models.Assignment.problem),
            joinedload(models.Assignment.course)
        ).filter(models.Assignment.assignment_id == assignment_id).first()

    def get_assignments(self, skip: int, limit: int, course_id: Optional[UUID] = None) -> List[models.Assignment]:
        query = self.db.query(models.Assignment).options(
            joinedload(models.Assignment.problem),
            joinedload(models.Assignment.course)
        )
        if course_id:
            query = query.filter(models.Assignment.course_id == course_id)
            
        return query.order_by(models.Assignment.due_date.desc().nullslast()).offset(skip).limit(limit).all()

    def get_by_course_ids(self, course_ids: List[UUID]) -> List[models.Assignment]:
         return self.db.query(models.Assignment).options(
            joinedload(models.Assignment.problem),
            joinedload(models.Assignment.course)
        ).filter(
            models.Assignment.course_id.in_(course_ids)
        ).order_by(models.Assignment.due_date.asc().nullslast()).all()

    def create(self, assignment_data: dict) -> models.Assignment:
        db_assignment = models.Assignment(**assignment_data)
        self.db.add(db_assignment)
        self.db.commit()
        self.db.refresh(db_assignment)
        return db_assignment

    def update(self, db_assignment: models.Assignment, update_data: dict) -> models.Assignment:
        for key, value in update_data.items():
            setattr(db_assignment, key, value)
        self.db.commit()
        self.db.refresh(db_assignment)
        return db_assignment

    def delete(self, db_assignment: models.Assignment) -> None:
        self.db.delete(db_assignment)
        self.db.commit()
    
    def get_submissions(self, assignment_id: UUID) -> List[models.Submission]:
        return self.db.query(models.Submission).filter(
            models.Submission.assignment_id == assignment_id
        ).order_by(models.Submission.created_at.desc()).all()
