from sqlalchemy.orm import Session, joinedload
from app.models import coding as models
from app.models import users as user_models
from uuid import UUID
from typing import List, Optional

class EnrollmentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_course_enrollments(self, course_id: UUID) -> List[models.CourseEnrollment]:
        return self.db.query(models.CourseEnrollment).options(
            joinedload(models.CourseEnrollment.student).joinedload(user_models.Student.user)
        ).filter(
            models.CourseEnrollment.course_id == course_id,
            models.CourseEnrollment.status == "active"
        ).all()

    def get_student_enrollments(self, student_id: UUID) -> List[models.CourseEnrollment]:
         return self.db.query(models.CourseEnrollment).options(
            joinedload(models.CourseEnrollment.course)
        ).filter(
            models.CourseEnrollment.student_id == student_id,
            models.CourseEnrollment.status == "active"
        ).all()

    def get_enrollment(self, course_id: UUID, student_id: UUID) -> Optional[models.CourseEnrollment]:
        return self.db.query(models.CourseEnrollment).filter(
            models.CourseEnrollment.course_id == course_id,
            models.CourseEnrollment.student_id == student_id
        ).first()

    def create(self, enrollment_data: dict) -> models.CourseEnrollment:
        db_enrollment = models.CourseEnrollment(**enrollment_data)
        self.db.add(db_enrollment)
        # Assuming commit happens in service or bulk
        return db_enrollment

    def commit(self):
        self.db.commit()
