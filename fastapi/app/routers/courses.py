from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.models import coding as models
from app.schemas import courses as schemas
from app.routers.users import get_current_user, get_current_active_user

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
    courses = db.query(models.Course).offset(skip).limit(limit).all()
    
    result = []
    for course in courses:
        result.append(schemas.CourseWithStats(
            course_id=course.course_id,
            course_code=course.course_code,
            course_name=course.course_name,
            category=course.category,
            programming_languages=course.programming_languages or [],
            problem_count=len(course.problems) if course.problems else 0,
            enrollment_count=len(course.enrollments) if course.enrollments else 0
        ))
    
    return result


@router.get("/{course_id}", response_model=schemas.Course)
def get_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get a specific course"""
    course = db.query(models.Course).filter(models.Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy Học phần")
    return course


@router.post("/", response_model=schemas.Course)
def create_course(
    course: schemas.CourseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Create a new course (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể tạo Học phần")
    
    # Check if course_code already exists
    existing = db.query(models.Course).filter(models.Course.course_code == course.course_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã Học phần đã tồn tại")
    
    db_course = models.Course(**course.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


@router.put("/{course_id}", response_model=schemas.Course)
def update_course(
    course_id: UUID,
    course: schemas.CourseUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Update a course (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể sửa Học phần")
    
    db_course = db.query(models.Course).filter(models.Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Không tìm thấy Học phần")
    
    update_data = course.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)
    
    db.commit()
    db.refresh(db_course)
    return db_course


@router.delete("/{course_id}")
def delete_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Delete a course (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể xóa Học phần")
    
    db_course = db.query(models.Course).filter(models.Course.course_id == course_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Không tìm thấy Học phần")
    
    # Check if course has classes
    if db_course.classes:
        raise HTTPException(status_code=400, detail="Không thể xóa Học phần đã có lớp học")
    
    db.delete(db_course)
    db.commit()
    return {"message": "Đã xóa Học phần thành công"}
