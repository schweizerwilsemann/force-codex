from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.db.database import get_db
from app.schemas import courses as schemas
from app.schemas import coding as coding_schemas
from app.api.v1.endpoints.users import get_current_active_user
from app.services.assignment_service import AssignmentService

router = APIRouter()

# --- Assignment Endpoints ---

@router.get("/", response_model=List[schemas.AssignmentWithStats])
def get_assignments(
    course_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get all assignments, optionally filtered by course"""
    service = AssignmentService(db)
    return service.get_assignments(skip, limit, course_id, current_user)


@router.get("/my-assignments", response_model=List[schemas.AssignmentWithStats])
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get assignments for current student based on enrolled courses"""
    service = AssignmentService(db)
    return service.get_my_assignments(current_user)


@router.get("/{assignment_id}", response_model=schemas.AssignmentWithStats)
def get_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get a specific assignment"""
    service = AssignmentService(db)
    return service.get_assignment(assignment_id)


@router.post("/", response_model=schemas.AssignmentResponse)
def create_assignment(
    assignment: schemas.AssignmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Create a new assignment for a course (admin/lecturer)"""
    service = AssignmentService(db)
    return service.create_assignment(assignment, current_user)


@router.put("/{assignment_id}", response_model=schemas.AssignmentResponse)
def update_assignment(
    assignment_id: UUID,
    assignment: schemas.AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Update an assignment (admin/lecturer)"""
    service = AssignmentService(db)
    return service.update_assignment(assignment_id, assignment, current_user)


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Delete an assignment (admin/lecturer)"""
    service = AssignmentService(db)
    return service.delete_assignment(assignment_id, current_user)


# --- Assignment Submissions ---

@router.get("/{assignment_id}/submissions", response_model=List[coding_schemas.SubmissionListItem])
def get_assignment_submissions(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get all submissions for an assignment (admin/lecturer)"""
    service = AssignmentService(db)
    return service.get_assignment_submissions(assignment_id, current_user)
