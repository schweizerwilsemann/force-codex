from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.schemas import courses as schemas
from app.api.v1.endpoints.users import get_current_active_user
from app.services.enrollment_service import EnrollmentService

router = APIRouter()


# --- Course Enrollment Endpoints ---

@router.get("/course/{course_id}/students", response_model=List[schemas.EnrolledStudent])
def get_course_students(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get all students enrolled in a course"""
    service = EnrollmentService(db)
    return service.get_course_students(course_id)


@router.post("/course/{course_id}/enroll", response_model=dict)
def enroll_students_to_course(
    course_id: UUID,
    enrollment: schemas.CourseEnrollmentBulk,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Enroll students in a course (admin/lecturer)"""
    service = EnrollmentService(db)
    return service.enroll_students(course_id, enrollment, current_user)


@router.delete("/course/{course_id}/students/{student_id}")
def unenroll_student_from_course(
    course_id: UUID,
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Unenroll a student from a course (admin/lecturer)"""
    service = EnrollmentService(db)
    return service.unenroll_student(course_id, student_id, current_user)


@router.get("/student/my-courses", response_model=List[schemas.Course])
def get_my_enrolled_courses(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get courses the current student is enrolled in"""
    service = EnrollmentService(db)
    return service.get_my_courses(current_user)


@router.get("/student/{student_id}/courses", response_model=List[schemas.Course])
def get_student_courses(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get courses a specific student is enrolled in (admin/lecturer)"""
    service = EnrollmentService(db)
    return service.get_student_courses(student_id, current_user)
