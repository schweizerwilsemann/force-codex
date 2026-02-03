from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import users as models
from app.schemas import users as schemas
from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.services.user_service import UserService

from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import uuid

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# --- Dependencies ---

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

    repo = UserRepository(db)
    user = repo.get_by_id(user_uuid)
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

# --- Endpoints ---

@router.post("/", response_model=schemas.User)
async def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: schemas.UserCreate,
    current_user: models.User = Depends(get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    """
    Create new user.
    Only Admin or Lecturer can create users.
    Lecturer can only create Students. 
    Admin can create Students or Lecturers.
    """
    service = UserService(db)
    return service.create_user(user_in, current_user, background_tasks)

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
    service = UserService(db)
    return service.get_users(skip, limit)


@router.post("/bulk-import", response_model=schemas.BulkImportResult)
async def bulk_import_students(
    *,
    db: Session = Depends(get_db),
    import_data: schemas.BulkStudentImport,
    current_user: models.User = Depends(get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    """
    Bulk import students with optional class enrollment.
    Admin and Lecturer can use this.
    """
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền import sinh viên")
    
    service = UserService(db)

    return service.bulk_import_students(import_data, current_user, background_tasks)


@router.post("/send-activation-emails", response_model=dict)
async def send_activation_emails(
    *,
    db: Session = Depends(get_db),
    email_request: schemas.UserEmailRequest,
    current_user: models.User = Depends(get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    """
    Manually trigger activation emails for users.
    Only Admin or Lecturer can do this.
    """
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền gửi email")
    
    service = UserService(db)
    return service.send_activation_emails(email_request.user_ids, background_tasks)


@router.get("/students", response_model=List[dict])
def get_students(
    class_id: str = None,
    course_id: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
) -> Any:
    """
    Get students, optionally filtered by class.
    """
    service = UserService(db)
    return service.get_students(class_id, course_id, skip, limit)

@router.get("/me", response_model=schemas.User)
def read_user_me(
    current_user: models.User = Depends(get_current_active_user),
) -> Any:
    """
    Get current user profile.
    """
    return current_user

@router.put("/me/password", response_model=Any)
def update_password_me(
    *,
    db: Session = Depends(get_db),
    password_in: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_active_user),
) -> Any:
    """
    Update own password.
    """
    service = UserService(db)
    return service.change_password(current_user, password_in.old_password, password_in.new_password)
