from sqlalchemy.orm import Session, joinedload
from app.models import coding as models
from app.models import users as user_models
from uuid import UUID
from typing import List, Optional

class ClassRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_classes(self, skip: int, limit: int, lecturer_id: Optional[UUID] = None) -> List[models.Class]:
        query = self.db.query(models.Class).options(
            joinedload(models.Class.lecturer).joinedload(user_models.Lecturer.user)
        )
        if lecturer_id:
            query = query.filter(models.Class.lecturer_id == lecturer_id)
        return query.offset(skip).limit(limit).all()

    def get_class(self, class_id: UUID) -> Optional[models.Class]:
        return self.db.query(models.Class).options(
            joinedload(models.Class.lecturer).joinedload(user_models.Lecturer.user)
        ).filter(models.Class.class_id == class_id).first()

    def get_by_code(self, class_code: str) -> Optional[models.Class]:
        return self.db.query(models.Class).filter(models.Class.class_code == class_code).first()

    def create(self, class_data: dict) -> models.Class:
        db_class = models.Class(**class_data)
        self.db.add(db_class)
        self.db.commit()
        self.db.refresh(db_class)
        return db_class

    def update(self, db_class: models.Class, update_data: dict) -> models.Class:
        for key, value in update_data.items():
            setattr(db_class, key, value)
        self.db.commit()
        self.db.refresh(db_class)
        return db_class

    def delete(self, db_class: models.Class) -> None:
        self.db.delete(db_class)
        self.db.commit()

    def get_students(self, class_id: UUID) -> List[user_models.Student]:
         return self.db.query(user_models.Student).options(
            joinedload(user_models.Student.user)
        ).filter(user_models.Student.class_id == class_id).all()
        
    def get_student(self, student_id: UUID) -> Optional[user_models.Student]:
         return self.db.query(user_models.Student).filter(
            user_models.Student.student_id == student_id
        ).first()

    def get_student_in_class(self, student_id: UUID, class_id: UUID) -> Optional[user_models.Student]:
        return self.db.query(user_models.Student).filter(
            user_models.Student.student_id == student_id,
            user_models.Student.class_id == class_id
        ).first()
