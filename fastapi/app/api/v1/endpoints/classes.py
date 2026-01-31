from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.schemas import courses as schemas
from app.api.v1.endpoints.users import get_current_active_user
from app.services.class_service import ClassService

router = APIRouter()

# --- Class Endpoints (Administrative Class) ---

@router.get("/", response_model=List[schemas.ClassWithDetails])
def get_classes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get all administrative classes (filtered by lecturer if not admin)"""
    service = ClassService(db)
    return service.get_classes(skip, limit, current_user)


@router.get("/{class_id}", response_model=schemas.ClassWithDetails)
def get_class(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get a specific administrative class"""
    service = ClassService(db)
    return service.get_class(class_id)


@router.post("/", response_model=schemas.ClassResponse)
def create_class(
    class_data: schemas.ClassCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Create a new administrative class (admin/lecturer)"""
    service = ClassService(db)
    return service.create_class(class_data, current_user)


@router.put("/{class_id}", response_model=schemas.ClassResponse)
def update_class(
    class_id: UUID,
    class_data: schemas.ClassUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Update an administrative class (admin/lecturer)"""
    service = ClassService(db)
    return service.update_class(class_id, class_data, current_user)


@router.delete("/{class_id}")
def delete_class(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Delete an administrative class (admin/lecturer)"""
    service = ClassService(db)
    return service.delete_class(class_id, current_user)


# --- Student Assignment to Class Endpoints ---

@router.get("/{class_id}/students", response_model=List[schemas.EnrolledStudent])
def get_class_students(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get students in an administrative class"""
    service = ClassService(db)
    return service.get_class_students(class_id)


@router.post("/{class_id}/students", response_model=dict)
def assign_students_to_class(
    class_id: UUID,
    assignment: schemas.StudentClassBulk,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Assign students to an administrative class (admin/lecturer)"""
    service = ClassService(db)
    return service.assign_students(class_id, assignment, current_user)


@router.delete("/{class_id}/students/{student_id}")
def remove_student_from_class(
    class_id: UUID,
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Remove a student from an administrative class (admin/lecturer)"""
    service = ClassService(db)
    return service.remove_student(class_id, student_id, current_user)
