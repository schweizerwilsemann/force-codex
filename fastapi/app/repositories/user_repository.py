from sqlalchemy.orm import Session
from app.models import users as models
from app.models import roles as role_models
import uuid
import typing

class UserRepository:
    """
    Repository for User data access.
    Pure data access layer - NO transaction management (commit/rollback).
    """
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> models.User | None:
        return self.db.query(models.User).filter(models.User.email == email).first()

    def get_by_id(self, user_id: uuid.UUID) -> models.User | None:
        from sqlalchemy.orm import joinedload
        return self.db.query(models.User).options(
            joinedload(models.User.role),
            joinedload(models.User.student_profile)
        ).filter(models.User.user_id == user_id).first()

    def get_role_by_name(self, role_name: str) -> role_models.Role | None:
        return self.db.query(role_models.Role).filter(role_models.Role.role_name == role_name).first()

    def list_users(self, skip: int = 0, limit: int = 100) -> list[models.User]:
        return self.db.query(models.User).offset(skip).limit(limit).all()

    def get_students_by_filter(self, class_id: typing.Optional[uuid.UUID] = None, course_id: typing.Optional[uuid.UUID] = None, skip: int = 0, limit: int = 100):
        # Local import to avoid circular dependency if models import repositories (though they shouldn't)
        from app.models import coding as coding_models
        
        query = self.db.query(
            models.User,
            models.Student
        ).join(
            models.Student, models.User.user_id == models.Student.student_id
        )

        if class_id:
            query = query.filter(models.Student.class_id == class_id)
        
        elif course_id:
            query = query.join(
                coding_models.CourseEnrollment,
                models.Student.student_id == coding_models.CourseEnrollment.student_id
            ).filter(
                coding_models.CourseEnrollment.course_id == course_id,
                coding_models.CourseEnrollment.status == "active"
            ).distinct()

        return query.offset(skip).limit(limit).all()
