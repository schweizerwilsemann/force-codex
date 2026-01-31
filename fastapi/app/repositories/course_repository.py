from sqlalchemy.orm import Session
from app.models import coding as models
from typing import List, Optional
from uuid import UUID

class CourseRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, course_id: UUID) -> Optional[models.Course]:
        return self.db.query(models.Course).filter(models.Course.course_id == course_id).first()

    def get_by_code(self, course_code: str) -> Optional[models.Course]:
        return self.db.query(models.Course).filter(models.Course.course_code == course_code).first()

    def get_multi(self, skip: int = 0, limit: int = 100) -> List[models.Course]:
        return self.db.query(models.Course).offset(skip).limit(limit).all()

    def create(self, course_data: dict) -> models.Course:
        db_course = models.Course(**course_data)
        self.db.add(db_course)
        self.db.commit()
        self.db.refresh(db_course)
        return db_course

    def update(self, db_course: models.Course, update_data: dict) -> models.Course:
        for key, value in update_data.items():
            setattr(db_course, key, value)
        self.db.commit()
        self.db.refresh(db_course)
        return db_course

    def delete(self, db_course: models.Course) -> None:
        self.db.delete(db_course)
        self.db.commit()
