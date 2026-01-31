from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.schemas import courses as schemas
from app.api.v1.endpoints.users import get_current_active_user
from app.services.course_service import CourseService

router = APIRouter()

# --- Course Endpoints ---

@router.get("/", response_model=List[schemas.CourseWithStats])
def get_courses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get all courses with statistics"""
    service = CourseService(db)
    return service.get_courses(skip, limit)


@router.get("/{course_id}", response_model=schemas.Course)
def get_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get a specific course"""
    service = CourseService(db)
    return service.get_course(course_id)


@router.post("/", response_model=schemas.Course)
def create_course(
    course: schemas.CourseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Create a new course (admin/lecturer)"""
    service = CourseService(db)
    return service.create_course(course, current_user)


@router.put("/{course_id}", response_model=schemas.Course)
def update_course(
    course_id: UUID,
    course: schemas.CourseUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Update a course (admin/lecturer)"""
    service = CourseService(db)
    return service.update_course(course_id, course, current_user)


@router.delete("/{course_id}")
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Delete a course (admin/lecturer)"""
    service = CourseService(db)
    return service.delete_course(course_id, current_user)
