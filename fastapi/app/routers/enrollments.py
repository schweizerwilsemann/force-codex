from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.models import coding as models
from app.models import users as user_models
from app.schemas import courses as schemas
from app.routers.users import get_current_user, get_current_active_user

router = APIRouter()


# --- Course Enrollment Endpoints ---

@router.get("/course/{course_id}/students", response_model=List[schemas.EnrolledStudent])
def get_course_students(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get all students enrolled in a course"""
    # Verify course exists
    course = db.query(models.Course).filter(models.Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy Học phần")
    
    enrollments = db.query(models.CourseEnrollment).options(
        joinedload(models.CourseEnrollment.student).joinedload(user_models.Student.user)
    ).filter(
        models.CourseEnrollment.course_id == course_id,
        models.CourseEnrollment.status == "active"
    ).all()
    
    result = []
    for enrollment in enrollments:
        if enrollment.student and enrollment.student.user:
            result.append(schemas.EnrolledStudent(
                student_id=enrollment.student_id,
                student_code=enrollment.student.student_code,
                full_name=enrollment.student.user.full_name,
                class_name=enrollment.student.class_name
            ))
    
    return result


@router.post("/course/{course_id}/enroll", response_model=dict)
def enroll_students_to_course(
    course_id: UUID,
    enrollment: schemas.CourseEnrollmentBulk,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Enroll students in a course (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền đăng ký sinh viên vào học phần")
    
    # Verify course exists
    course = db.query(models.Course).filter(models.Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy Học phần")
    
    added_count = 0
    skipped_count = 0
    
    for student_id in enrollment.student_ids:
        # Check if already enrolled
        existing = db.query(models.CourseEnrollment).filter(
            models.CourseEnrollment.course_id == course_id,
            models.CourseEnrollment.student_id == student_id
        ).first()
        
        if existing:
            # Reactivate if inactive
            if existing.status != "active":
                existing.status = "active"
                added_count += 1
            else:
                skipped_count += 1
        else:
            # Verify student exists
            student = db.query(user_models.Student).filter(
                user_models.Student.student_id == student_id
            ).first()
            
            if student:
                db_enrollment = models.CourseEnrollment(
                    course_id=course_id,
                    student_id=student_id,
                    status="active"
                )
                db.add(db_enrollment)
                added_count += 1
    
    db.commit()
    return {
        "message": f"Đã đăng ký {added_count} sinh viên vào học phần",
        "added": added_count,
        "skipped": skipped_count
    }


@router.delete("/course/{course_id}/students/{student_id}")
def unenroll_student_from_course(
    course_id: UUID,
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Unenroll a student from a course (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền hủy đăng ký sinh viên")
    
    enrollment = db.query(models.CourseEnrollment).filter(
        models.CourseEnrollment.course_id == course_id,
        models.CourseEnrollment.student_id == student_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Sinh viên chưa đăng ký học phần này")
    
    # Soft delete - set status to inactive
    enrollment.status = "inactive"
    db.commit()
    return {"message": "Đã hủy đăng ký sinh viên khỏi học phần"}


@router.get("/student/my-courses", response_model=List[schemas.Course])
def get_my_enrolled_courses(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get courses the current student is enrolled in"""
    if not current_user.role or current_user.role.role_name != 'student':
        raise HTTPException(status_code=403, detail="Chỉ sinh viên mới có thể xem danh sách học phần đã đăng ký")
    
    enrollments = db.query(models.CourseEnrollment).options(
        joinedload(models.CourseEnrollment.course)
    ).filter(
        models.CourseEnrollment.student_id == current_user.user_id,
        models.CourseEnrollment.status == "active"
    ).all()
    
    return [enrollment.course for enrollment in enrollments if enrollment.course]


@router.get("/student/{student_id}/courses", response_model=List[schemas.Course])
def get_student_courses(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get courses a specific student is enrolled in (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền xem danh sách học phần của sinh viên")
    
    enrollments = db.query(models.CourseEnrollment).options(
        joinedload(models.CourseEnrollment.course)
    ).filter(
        models.CourseEnrollment.student_id == student_id,
        models.CourseEnrollment.status == "active"
    ).all()
    
    return [enrollment.course for enrollment in enrollments if enrollment.course]
