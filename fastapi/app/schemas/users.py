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
    must_change_password: bool = False

class TokenData(BaseModel):
    user_id: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: Optional[bool] = True
    must_change_password: Optional[bool] = False

class UserCreate(UserBase):
    role_name: str  # 'student' or 'lecturer' (admin creates these)
    # Student specific
    student_code: Optional[str] = None
    class_name: Optional[str] = None
    year_of_admission: Optional[int] = None
    major: Optional[str] = None
    initial_class_id: Optional[uuid.UUID] = None  # Enrollment on creation (Standard Class)
    initial_course_id: Optional[uuid.UUID] = None   # Enrollment on creation (Course Module)
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


# --- Bulk Student Import Schemas ---

class StudentImportItem(BaseModel):
    """Single student data for import"""
    student_code: str
    full_name: str
    email: EmailStr
    class_name: Optional[str] = None
    year_of_admission: Optional[int] = None
    major: Optional[str] = None


class BulkStudentImport(BaseModel):
    """Bulk import request with class enrollment"""
    class_id: Optional[uuid.UUID] = None  # Optional: enroll all students in this class
    course_id: Optional[uuid.UUID] = None # Optional: context for creating classes if missing
    students: List[StudentImportItem]


class BulkImportResult(BaseModel):
    """Result of bulk import operation"""
    total: int
    created: int
    enrolled: int  # Existing students enrolled
    skipped: int
    errors: List[str]
    created_students: List[dict]
    enrolled_students: List[dict]


class UserEmailRequest(BaseModel):
    """Request to send activation emails to users"""
    user_ids: List[uuid.UUID]

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class StudentBasic(BaseModel):
    student_id: uuid.UUID
    student_code: str
    full_name: str
    email: EmailStr
    class_name: Optional[str] = None

    class Config:
        from_attributes = True
