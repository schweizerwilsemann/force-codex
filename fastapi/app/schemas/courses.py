from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID


# --- Course Schemas ---
class CourseBase(BaseModel):
    course_code: str
    course_name: str
    category: Optional[str] = None
    programming_languages: List[str] = []


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    category: Optional[str] = None
    programming_languages: Optional[List[str]] = None


class Course(CourseBase):
    course_id: UUID

    class Config:
        from_attributes = True


class CourseWithStats(Course):
    problem_count: int = 0
    enrollment_count: int = 0


# --- Class Schemas (Administrative Class) ---
class ClassBase(BaseModel):
    class_code: str
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    department: Optional[str] = None


class ClassCreate(ClassBase):
    lecturer_id: Optional[UUID] = None


class ClassUpdate(BaseModel):
    class_code: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    department: Optional[str] = None
    lecturer_id: Optional[UUID] = None


class ClassResponse(ClassBase):
    class_id: UUID
    lecturer_id: Optional[UUID] = None
    lecturer_name: Optional[str] = None

    class Config:
        from_attributes = True


class ClassWithDetails(ClassResponse):
    student_count: int = 0


# --- Assignment Schemas ---
class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    max_score: int = 100


class AssignmentCreate(AssignmentBase):
    course_id: UUID
    problem_id: UUID
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    max_score: Optional[int] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


class AssignmentResponse(AssignmentBase):
    assignment_id: UUID
    course_id: UUID
    problem_id: UUID
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    problem_title: Optional[str] = None
    course_name: Optional[str] = None

    class Config:
        from_attributes = True


class AssignmentWithStats(AssignmentResponse):
    submission_count: int = 0
    completed_count: int = 0


# --- Student Enrollment in Class ---
class StudentClassAssignment(BaseModel):
    student_id: UUID


class StudentClassBulk(BaseModel):
    student_ids: List[UUID]


# --- Course Enrollment Schemas ---
class CourseEnrollmentCreate(BaseModel):
    course_id: UUID
    student_id: UUID


class CourseEnrollmentBulk(BaseModel):
    student_ids: List[UUID]


class CourseEnrollmentResponse(BaseModel):
    enrollment_id: UUID
    course_id: UUID
    student_id: UUID
    enrolled_at: datetime
    status: str = "active"
    
    class Config:
        from_attributes = True


class EnrolledStudent(BaseModel):
    student_id: UUID
    student_code: str
    full_name: str
    class_name: Optional[str] = None
    
    class Config:
        from_attributes = True
