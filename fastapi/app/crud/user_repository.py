from sqlalchemy.orm import Session
from app.models import users as models
from app.models import roles as role_models
import uuid

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
        return self.db.query(models.User).filter(models.User.user_id == user_id).first()

    def get_role_by_name(self, role_name: str) -> role_models.Role | None:
        return self.db.query(role_models.Role).filter(role_models.Role.role_name == role_name).first()

    def list_users(self, skip: int = 0, limit: int = 100) -> list[models.User]:
        return self.db.query(models.User).offset(skip).limit(limit).all()
