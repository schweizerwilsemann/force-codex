from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid

# Token Schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    role_name: str  # 'student' or 'lecturer' (admin creates these)
    # Student specific
    student_code: Optional[str] = None
    class_name: Optional[str] = None
    year_of_admission: Optional[int] = None
    major: Optional[str] = None
    # Lecturer specific
    lecturer_code: Optional[str] = None
    department: Optional[str] = None

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    user_id: uuid.UUID
    role_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserLogin(BaseModel):
    email: EmailStr
    password: str
