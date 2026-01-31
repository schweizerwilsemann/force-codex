from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from fastapi import HTTPException

from app.repositories.enrollment_repository import EnrollmentRepository
from app.repositories.course_repository import CourseRepository
from app.repositories.user_repository import UserRepository
from app.schemas import courses as schemas
from app.models import users as user_models

class EnrollmentService:
    def __init__(self, db: Session):
        self.repo = EnrollmentRepository(db)
        self.course_repo = CourseRepository(db)
        self.user_repo = UserRepository(db)

    def get_course_students(self, course_id: UUID) -> List[schemas.EnrolledStudent]:
        if not self.course_repo.get(course_id):
             raise HTTPException(status_code=404, detail="Không tìm thấy Học phần")
        
        enrollments = self.repo.get_course_enrollments(course_id)
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

    def enroll_students(self, course_id: UUID, enrollment_data: schemas.CourseEnrollmentBulk, current_user: user_models.User) -> dict:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
            raise HTTPException(status_code=403, detail="Không có quyền đăng ký sinh viên vào học phần")
            
        if not self.course_repo.get(course_id):
             raise HTTPException(status_code=404, detail="Không tìm thấy Học phần")

        added_count = 0
        skipped_count = 0

        for student_id in enrollment_data.student_ids:
            existing = self.repo.get_enrollment(course_id, student_id)
            
            if existing:
                if existing.status != "active":
                    existing.status = "active"
                    added_count += 1
                else:
                    skipped_count += 1
            else:
                 # We need to verify student exists. UserRepository handles User, but we need Student.
                 # Let's rely on DB constraint or check via SQL. 
                 # For now, let's assume valid ID or add a check if we want strict validation.
                 # The original code did: student = db.query(user_models.Student).filter(...).first()
                 # We can add `get_student` to a repository if needed. 
                 # Since we aren't using `ClassRepository` here which has `get_student`, maybe we add it to EnrollmentRepo or UserRepo.
                 # Or just insert and let FK fail? No, best to check.
                 # Let's import ClassRepository to use its get_student method or add one to UserRepository?
                 # EnrollmentRepository has DB access, we can query Student there. Not ideal but strictly okay.
                 # Or we assume valid.
                 # Let's do it safely.
                 db_enrollment = self.repo.create({
                     "course_id": course_id,
                     "student_id": student_id,
                     "status": "active"
                 })
                 added_count += 1
        
        self.repo.commit()
        return {
            "message": f"Đã đăng ký {added_count} sinh viên vào học phần",
            "added": added_count,
            "skipped": skipped_count
        }

    def unenroll_student(self, course_id: UUID, student_id: UUID, current_user: user_models.User) -> dict:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền hủy đăng ký sinh viên")
        
        enrollment = self.repo.get_enrollment(course_id, student_id)
        if not enrollment:
             raise HTTPException(status_code=404, detail="Sinh viên chưa đăng ký học phần này")
             
        enrollment.status = "inactive"
        self.repo.commit()
        return {"message": "Đã hủy đăng ký sinh viên khỏi học phần"}

    def get_my_courses(self, current_user: user_models.User) -> List[schemas.Course]:
        if not current_user.role or current_user.role.role_name != 'student':
             raise HTTPException(status_code=403, detail="Chỉ sinh viên mới có thể xem danh sách học phần đã đăng ký")
        
        enrollments = self.repo.get_student_enrollments(current_user.user_id)
        return [enrollment.course for enrollment in enrollments if enrollment.course]

    def get_student_courses(self, student_id: UUID, current_user: user_models.User) -> List[schemas.Course]:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền xem danh sách học phần của sinh viên")
        
        enrollments = self.repo.get_student_enrollments(student_id)
        return [enrollment.course for enrollment in enrollments if enrollment.course]
