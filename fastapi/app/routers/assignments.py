from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.db.database import get_db
from app.models import coding as models
from app.models import users as user_models
from app.schemas import courses as schemas
from app.schemas import coding as coding_schemas
from app.routers.users import get_current_user, get_current_active_user

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
    query = db.query(models.Assignment).options(
        joinedload(models.Assignment.problem),
        joinedload(models.Assignment.course)
    )
    
    if course_id:
        query = query.filter(models.Assignment.course_id == course_id)
    
    # Lecturers see all assignments for now (can filter by their classes if needed)
    # With new schema, Class no longer has course_id - lecturers see all or need different logic
    # For now, let lecturers see all assignments
    
    # Students see assignments for their courses (via CourseEnrollment)
    if current_user.role and current_user.role.role_name == 'student':
        query = query.join(models.Course).join(models.CourseEnrollment).filter(
            models.CourseEnrollment.student_id == current_user.user_id,
            models.CourseEnrollment.status == "active"
        ).distinct()
    
    assignments = query.order_by(models.Assignment.due_date.desc().nullslast()).offset(skip).limit(limit).all()
    
    result = []
    for assignment in assignments:
        submission_count = len(assignment.submissions) if assignment.submissions else 0
        completed_count = sum(1 for s in (assignment.submissions or []) if s.status == 'accepted')
        
        result.append(schemas.AssignmentWithStats(
            assignment_id=assignment.assignment_id,
            course_id=assignment.course_id,
            problem_id=assignment.problem_id,
            title=assignment.title,
            description=assignment.description,
            max_score=assignment.max_score,
            start_date=assignment.start_date,
            due_date=assignment.due_date,
            problem_title=assignment.problem.title if assignment.problem else None,
            course_name=assignment.course.course_name if assignment.course else None,
            submission_count=submission_count,
            completed_count=completed_count
        ))
    
    return result


@router.get("/my-assignments", response_model=List[schemas.AssignmentWithStats])
def get_my_assignments(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get assignments for current student based on enrolled courses"""
    if not current_user.role or current_user.role.role_name != 'student':
        raise HTTPException(status_code=403, detail="Chỉ sinh viên mới có thể xem bài tập của mình")
    
    # Get courses the student is enrolled in via CourseEnrollment
    enrollments = db.query(models.CourseEnrollment).filter(
        models.CourseEnrollment.student_id == current_user.user_id,
        models.CourseEnrollment.status == "active"
    ).all()
    
    course_ids = [e.course_id for e in enrollments]
    
    if not course_ids:
        return []
    
    assignments = db.query(models.Assignment).options(
        joinedload(models.Assignment.problem),
        joinedload(models.Assignment.course)
    ).filter(
        models.Assignment.course_id.in_(course_ids)
    ).order_by(models.Assignment.due_date.asc().nullslast()).all()
    
    result = []
    for assignment in assignments:
        # Count this student's submissions for this assignment
        my_submissions = [s for s in (assignment.submissions or []) if s.student_id == current_user.user_id]
        completed = any(s.status == 'accepted' for s in my_submissions)
        
        result.append(schemas.AssignmentWithStats(
            assignment_id=assignment.assignment_id,
            course_id=assignment.course_id,
            problem_id=assignment.problem_id,
            title=assignment.title,
            description=assignment.description,
            max_score=assignment.max_score,
            start_date=assignment.start_date,
            due_date=assignment.due_date,
            problem_title=assignment.problem.title if assignment.problem else None,
            course_name=assignment.course.course_name if assignment.course else None,
            submission_count=len(my_submissions),
            completed_count=1 if completed else 0
        ))
    
    return result


@router.get("/{assignment_id}", response_model=schemas.AssignmentWithStats)
def get_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get a specific assignment"""
    assignment = db.query(models.Assignment).options(
        joinedload(models.Assignment.problem),
        joinedload(models.Assignment.course)
    ).filter(models.Assignment.assignment_id == assignment_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
    
    submission_count = len(assignment.submissions) if assignment.submissions else 0
    completed_count = sum(1 for s in (assignment.submissions or []) if s.status == 'accepted')
    
    return schemas.AssignmentWithStats(
        assignment_id=assignment.assignment_id,
        course_id=assignment.course_id,
        problem_id=assignment.problem_id,
        title=assignment.title,
        description=assignment.description,
        max_score=assignment.max_score,
        start_date=assignment.start_date,
        due_date=assignment.due_date,
        problem_title=assignment.problem.title if assignment.problem else None,
        course_name=assignment.course.course_name if assignment.course else None,
        submission_count=submission_count,
        completed_count=completed_count
    )


@router.post("/", response_model=schemas.AssignmentResponse)
def create_assignment(
    assignment: schemas.AssignmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Create a new assignment for a course (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền tạo bài tập")
    
    # Verify course exists
    course = db.query(models.Course).filter(models.Course.course_id == assignment.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy học phần")
    
    # If lecturer, ensure they teach at least one class in this course? 
    # Or just let them assign to any course? 
    # Better: Ensure they are a lecturer for a class in this course.
    # Lecturers: Skip teaching check for now since Class no longer has course_id
    # Future: implement lecturer-course assignment table
    # For now, allow any lecturer to create assignments

    # Verify problem exists
    problem = db.query(models.Problem).filter(models.Problem.problem_id == assignment.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề bài")
    
    db_assignment = models.Assignment(**assignment.model_dump())
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    
    return schemas.AssignmentResponse(
        assignment_id=db_assignment.assignment_id,
        course_id=db_assignment.course_id,
        problem_id=db_assignment.problem_id,
        title=db_assignment.title,
        description=db_assignment.description,
        max_score=db_assignment.max_score,
        start_date=db_assignment.start_date,
        due_date=db_assignment.due_date,
        problem_title=problem.title,
        course_name=course.course_name
    )


@router.put("/{assignment_id}", response_model=schemas.AssignmentResponse)
def update_assignment(
    assignment_id: UUID,
    assignment: schemas.AssignmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Update an assignment (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền sửa bài tập")
    
    db_assignment = db.query(models.Assignment).filter(
        models.Assignment.assignment_id == assignment_id
    ).first()
    
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
    
    # Lecturers can only update their own course assignments
    # Lecturers: Skip teaching check for now since Class no longer has course_id
    # Future: implement lecturer-course assignment table
    
    update_data = assignment.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_assignment, key, value)
    
    db.commit()
    db.refresh(db_assignment)
    return db_assignment


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Delete an assignment (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền xóa bài tập")
    
    db_assignment = db.query(models.Assignment).filter(
        models.Assignment.assignment_id == assignment_id
    ).first()
    
    if not db_assignment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
    
    # Lecturers can only delete their own course assignments
    # Lecturers: Skip teaching check for now since Class no longer has course_id
    # Future: implement lecturer-course assignment table
    
    db.delete(db_assignment)
    db.commit()
    return {"message": "Đã xóa bài tập thành công"}


# --- Assignment Submissions ---

@router.get("/{assignment_id}/submissions", response_model=List[coding_schemas.SubmissionListItem])
def get_assignment_submissions(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get all submissions for an assignment (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền xem submissions")
    
    submissions = db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id
    ).order_by(models.Submission.created_at.desc()).all()
    
    return submissions
