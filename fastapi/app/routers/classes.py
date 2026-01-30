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


# --- Class Endpoints (Administrative Class) ---

@router.get("/", response_model=List[schemas.ClassWithDetails])
def get_classes(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get all administrative classes (filtered by lecturer if not admin)"""
    query = db.query(models.Class).options(
        joinedload(models.Class.lecturer).joinedload(user_models.Lecturer.user)
    )
    
    # Lecturers only see their own classes
    if current_user.role and current_user.role.role_name == 'lecturer':
        query = query.filter(models.Class.lecturer_id == current_user.user_id)
    
    classes = query.offset(skip).limit(limit).all()
    
    result = []
    for cls in classes:
        lecturer_name = None
        if cls.lecturer and cls.lecturer.user:
            lecturer_name = cls.lecturer.user.full_name
        
        result.append(schemas.ClassWithDetails(
            class_id=cls.class_id,
            class_code=cls.class_code,
            semester=cls.semester,
            academic_year=cls.academic_year,
            department=cls.department,
            lecturer_id=cls.lecturer_id,
            lecturer_name=lecturer_name,
            student_count=len(cls.students) if cls.students else 0
        ))
    
    return result


@router.get("/{class_id}", response_model=schemas.ClassWithDetails)
def get_class(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get a specific administrative class"""
    cls = db.query(models.Class).options(
        joinedload(models.Class.lecturer).joinedload(user_models.Lecturer.user)
    ).filter(models.Class.class_id == class_id).first()
    
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
    
    lecturer_name = None
    if cls.lecturer and cls.lecturer.user:
        lecturer_name = cls.lecturer.user.full_name
    
    return schemas.ClassWithDetails(
        class_id=cls.class_id,
        class_code=cls.class_code,
        semester=cls.semester,
        academic_year=cls.academic_year,
        department=cls.department,
        lecturer_id=cls.lecturer_id,
        lecturer_name=lecturer_name,
        student_count=len(cls.students) if cls.students else 0
    )


@router.post("/", response_model=schemas.ClassResponse)
def create_class(
    class_data: schemas.ClassCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Create a new administrative class (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể tạo lớp học")
    
    # Check if class_code already exists
    existing = db.query(models.Class).filter(models.Class.class_code == class_data.class_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã lớp học đã tồn tại")
    
    db_class = models.Class(**class_data.model_dump())
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    
    return schemas.ClassResponse(
        class_id=db_class.class_id,
        class_code=db_class.class_code,
        semester=db_class.semester,
        academic_year=db_class.academic_year,
        department=db_class.department,
        lecturer_id=db_class.lecturer_id
    )


@router.put("/{class_id}", response_model=schemas.ClassResponse)
def update_class(
    class_id: UUID,
    class_data: schemas.ClassUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Update an administrative class (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể sửa lớp học")
    
    db_class = db.query(models.Class).filter(models.Class.class_id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
    
    update_data = class_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_class, key, value)
    
    db.commit()
    db.refresh(db_class)
    
    return schemas.ClassResponse(
        class_id=db_class.class_id,
        class_code=db_class.class_code,
        semester=db_class.semester,
        academic_year=db_class.academic_year,
        department=db_class.department,
        lecturer_id=db_class.lecturer_id
    )


@router.delete("/{class_id}")
def delete_class(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Delete an administrative class (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể xóa lớp học")
    
    db_class = db.query(models.Class).filter(models.Class.class_id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
    
    # Check if class has students
    if db_class.students:
        raise HTTPException(status_code=400, detail="Không thể xóa lớp đang có sinh viên")
    
    db.delete(db_class)
    db.commit()
    return {"message": "Đã xóa lớp học thành công"}


# --- Student Assignment to Class Endpoints ---

@router.get("/{class_id}/students", response_model=List[schemas.EnrolledStudent])
def get_class_students(
    class_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Get students in an administrative class"""
    students = db.query(user_models.Student).options(
        joinedload(user_models.Student.user)
    ).filter(user_models.Student.class_id == class_id).all()
    
    result = []
    for student in students:
        if student.user:
            result.append(schemas.EnrolledStudent(
                student_id=student.student_id,
                student_code=student.student_code,
                full_name=student.user.full_name,
                class_name=student.class_name
            ))
    
    return result


@router.post("/{class_id}/students", response_model=dict)
def assign_students_to_class(
    class_id: UUID,
    assignment: schemas.StudentClassBulk,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Assign students to an administrative class (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền thêm sinh viên vào lớp")
    
    # Verify class exists
    db_class = db.query(models.Class).filter(models.Class.class_id == class_id).first()
    if not db_class:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
    
    added_count = 0
    for student_id in assignment.student_ids:
        student = db.query(user_models.Student).filter(
            user_models.Student.student_id == student_id
        ).first()
        
        if student:
            student.class_id = class_id
            student.class_name = db_class.class_code  # Update legacy field too
            added_count += 1
    
    db.commit()
    return {"message": f"Đã thêm {added_count} sinh viên vào lớp"}


@router.delete("/{class_id}/students/{student_id}")
def remove_student_from_class(
    class_id: UUID,
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user)
):
    """Remove a student from an administrative class (admin/lecturer)"""
    if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
        raise HTTPException(status_code=403, detail="Không có quyền xóa sinh viên khỏi lớp")
    
    student = db.query(user_models.Student).filter(
        user_models.Student.student_id == student_id,
        user_models.Student.class_id == class_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Sinh viên không trong lớp này")
    
    student.class_id = None
    student.class_name = None
    db.commit()
    return {"message": "Đã xóa sinh viên khỏi lớp"}
