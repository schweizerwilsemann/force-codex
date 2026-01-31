from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from fastapi import HTTPException

from app.repositories.class_repository import ClassRepository
from app.schemas import courses as schemas
from app.models import users as user_models
from app.models import coding as models

class ClassService:
    def __init__(self, db: Session):
        self.repo = ClassRepository(db)

    def get_classes(self, skip: int, limit: int, current_user: user_models.User) -> List[schemas.ClassWithDetails]:
        lecturer_id = None
        if current_user.role and current_user.role.role_name == 'lecturer':
            lecturer_id = current_user.user_id
        
        classes = self.repo.get_classes(skip, limit, lecturer_id)
        
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

    def get_class(self, class_id: UUID) -> schemas.ClassWithDetails:
        cls = self.repo.get_class(class_id)
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

    def create_class(self, class_data: schemas.ClassCreate, current_user: user_models.User) -> schemas.ClassResponse:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
            raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể tạo lớp học")
        
        existing = self.repo.get_by_code(class_data.class_code)
        if existing:
            raise HTTPException(status_code=400, detail="Mã lớp học đã tồn tại")
        
        db_class = self.repo.create(class_data.model_dump())
        
        return schemas.ClassResponse(
            class_id=db_class.class_id,
            class_code=db_class.class_code,
            semester=db_class.semester,
            academic_year=db_class.academic_year,
            department=db_class.department,
            lecturer_id=db_class.lecturer_id
        )

    def update_class(self, class_id: UUID, class_data: schemas.ClassUpdate, current_user: user_models.User) -> schemas.ClassResponse:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
            raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể sửa lớp học")
        
        db_class = self.repo.get_class(class_id)
        if not db_class:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        
        update_data = class_data.model_dump(exclude_unset=True)
        db_class = self.repo.update(db_class, update_data)
        
        return schemas.ClassResponse(
            class_id=db_class.class_id,
            class_code=db_class.class_code,
            semester=db_class.semester,
            academic_year=db_class.academic_year,
            department=db_class.department,
            lecturer_id=db_class.lecturer_id
        )

    def delete_class(self, class_id: UUID, current_user: user_models.User) -> dict:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
            raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể xóa lớp học")
        
        db_class = self.repo.get_class(class_id)
        if not db_class:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
        
        if db_class.students:
            raise HTTPException(status_code=400, detail="Không thể xóa lớp đang có sinh viên")
        
        self.repo.delete(db_class)
        return {"message": "Đã xóa lớp học thành công"}

    def get_class_students(self, class_id: UUID) -> List[schemas.EnrolledStudent]:
        students = self.repo.get_students(class_id)
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

    def assign_students(self, class_id: UUID, assignment: schemas.StudentClassBulk, current_user: user_models.User) -> dict:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền thêm sinh viên vào lớp")
        
        db_class = self.repo.get_class(class_id)
        if not db_class:
            raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")
            
        added_count = 0
        for student_id in assignment.student_ids:
             student = self.repo.get_student(student_id)
             if student:
                 # Need to call update directly since it is updating Student entity via repo
                 # Using the underlying db session to commit for batch is cleaner or we add a method to repo
                 student.class_id = class_id
                 student.class_name = db_class.class_code
                 added_count += 1
        
        self.repo.db.commit() # Bulk commit
        return {"message": f"Đã thêm {added_count} sinh viên vào lớp"}

    def remove_student(self, class_id: UUID, student_id: UUID, current_user: user_models.User) -> dict:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền xóa sinh viên khỏi lớp")
        
        student = self.repo.get_student_in_class(student_id, class_id)
        if not student:
            raise HTTPException(status_code=404, detail="Sinh viên không trong lớp này")
        
        student.class_id = None
        student.class_name = None
        self.repo.db.commit()
        return {"message": "Đã xóa sinh viên khỏi lớp"}
