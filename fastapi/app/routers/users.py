from typing import Any, List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, get_db
from app.models import users as models
from app.models import roles as role_models
from app.schemas import users as schemas
from app.core import security
from app.services import email
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
import secrets
import uuid

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.user_id == user_uuid).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_admin(current_user: models.User = Depends(get_current_active_user)) -> models.User:
    if not current_user.role or current_user.role.role_name != 'admin':
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")
    return current_user

@router.post("/", response_model=schemas.User)
async def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: schemas.UserCreate,
    current_user: models.User = Depends(get_current_active_user), # Allow lect/admin
    background_tasks: BackgroundTasks
) -> Any:
    """
    Create new user.
    Only Admin or Lecturer can create users.
    Lecturer can only create Students. 
    Admin can create Students or Lecturers.
    """
    
    # Permission check
    is_admin = current_user.role.role_name == 'admin' if current_user.role else False
    is_lecturer = current_user.role.role_name == 'lecturer' if current_user.role else False
    
    if not (is_admin or is_lecturer):
        raise HTTPException(status_code=403, detail="Not authorized to create users")
        
    if is_lecturer and user_in.role_name != 'student':
         raise HTTPException(status_code=403, detail="Lecturers can only create students")

    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Generate random password
    raw_password = secrets.token_urlsafe(10)
    
    # Get Role
    role = db.query(role_models.Role).filter(role_models.Role.role_name == user_in.role_name).first()
    if not role:
         raise HTTPException(status_code=400, detail=f"Role {user_in.role_name} not found")

    user = models.User(
        email=user_in.email,
        password_hash=security.get_password_hash(raw_password),
        full_name=user_in.full_name,
        role_id=role.role_id,
        is_active=user_in.is_active,
    )
    db.add(user)
    db.flush() # flush to get user_id before related inserts

    # Add role specific info
    if user_in.role_name == 'student':
        student = models.Student(
            student_id=user.user_id,
            student_code=user_in.student_code,
            class_name=user_in.class_name,
            year_of_admission=user_in.year_of_admission,
            major=user_in.major
        )
        db.add(student)
    elif user_in.role_name == 'lecturer':
        lecturer = models.Lecturer(
            lecturer_id=user.user_id,
            lecturer_code=user_in.lecturer_code,
            department=user_in.department
        )
        db.add(lecturer)

    # Save initial password
    expires_at = datetime.utcnow() + timedelta(days=7)
    initial_pwd_record = models.InitialPassword(
        user_id=user.user_id,
        plain_password=raw_password,
        email_sent=True, # Will be sent by background task
        expires_at=expires_at
    )
    db.add(initial_pwd_record)

    # Sending email
    background_tasks.add_task(email.send_new_account_email, user.email, raw_password, user.full_name)

    db.commit()
    db.refresh(user)
    return user

@router.get("/", response_model=List[schemas.User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve users.
    """
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users
