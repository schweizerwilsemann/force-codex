from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import users as models
from app.schemas import users as schemas
from app.core.config import settings
from app.crud.user_repository import UserRepository
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
