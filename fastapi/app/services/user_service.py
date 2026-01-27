from datetime import datetime, timedelta
import secrets

from fastapi import HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.schemas import users as schemas
from app.crud.user_repository import UserRepository
from app.core import security
from app.services import email
from app.models import users as models


class UserService:
    """
    Service layer for User business logic.
    Responsible for transaction management (commit/rollback).
    """
    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepository(db)

    def create_user(
        self, 
        user_in: schemas.UserCreate, 
        creator: models.User,
        background_tasks: BackgroundTasks
    ) -> models.User:
        """
        Create a new user.
        - Admins can create students and lecturers.
        - Lecturers can only create students.
        """
        try:
            # 1. Permission Check
            is_admin = creator.role.role_name == 'admin' if creator.role else False
            is_lecturer = creator.role.role_name == 'lecturer' if creator.role else False

            if not (is_admin or is_lecturer):
                raise HTTPException(status_code=403, detail="Not authorized to create users")
                
            if is_lecturer and user_in.role_name != 'student':
                raise HTTPException(status_code=403, detail="Lecturers can only create students")

            # 2. Duplicate Check
            if self.repo.get_by_email(user_in.email):
                raise HTTPException(status_code=400, detail="The user with this email already exists in the system.")

            # 3. Role Validation
            role = self.repo.get_role_by_name(user_in.role_name)
            if not role:
                raise HTTPException(status_code=400, detail=f"Role {user_in.role_name} not found")

            # 4. Prepare User Data
            raw_password = secrets.token_urlsafe(10)
            user = models.User(
                email=user_in.email,
                password_hash=security.get_password_hash(raw_password),
                full_name=user_in.full_name,
                role_id=role.role_id,
                is_active=user_in.is_active,
            )
            self.db.add(user)
            self.db.flush()  # Get user_id before adding related entities

            # 5. Add Role-Specific Profile
            if user_in.role_name == 'student':
                student = models.Student(
                    student_id=user.user_id,
                    student_code=user_in.student_code,
                    class_name=user_in.class_name,
                    year_of_admission=user_in.year_of_admission,
                    major=user_in.major
                )
                self.db.add(student)
            elif user_in.role_name == 'lecturer':
                lecturer = models.Lecturer(
                    lecturer_id=user.user_id,
                    lecturer_code=user_in.lecturer_code,
                    department=user_in.department
                )
                self.db.add(lecturer)

            # 6. Initial Password Record
            expires_at = datetime.utcnow() + timedelta(days=7)
            initial_pwd_record = models.InitialPassword(
                user_id=user.user_id,
                plain_password=raw_password,
                email_sent=True,
                expires_at=expires_at
            )
            self.db.add(initial_pwd_record)

            # 7. Commit Transaction
            self.db.commit()
            self.db.refresh(user)

            # 8. Send Email (after successful commit)
            background_tasks.add_task(email.send_new_account_email, user.email, raw_password, user.full_name)

            return user

        except HTTPException:
            self.db.rollback()
            raise
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error. User may already exist.")
        except Exception:
            self.db.rollback()
            raise

    def get_users(self, skip: int, limit: int) -> list[models.User]:
        """Retrieve a list of users."""
        return self.repo.list_users(skip, limit)
