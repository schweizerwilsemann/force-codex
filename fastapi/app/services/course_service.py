from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException, status

from app.repositories.course_repository import CourseRepository
from app.schemas import courses as schemas
from app.models import coding as models
from app.models import users as user_models

class CourseService:
    def __init__(self, db: Session):
        self.repo = CourseRepository(db)

    def get_courses(self, skip: int = 0, limit: int = 100) -> List[schemas.CourseWithStats]:
        courses = self.repo.get_multi(skip, limit)
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

    def get_student_courses(self, user: user_models.User) -> List[schemas.CourseWithStats]:
        if not user.student_profile:
            return []
            
        # Get active enrollments
        enrollments = [e for e in user.student_profile.course_enrollments if e.status == 'active']
        
        result = []
        for enrollment in enrollments:
            course = enrollment.course
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

    def get_course(self, course_id: UUID) -> models.Course:
        course = self.repo.get(course_id)
        if not course:
            raise HTTPException(status_code=404, detail="Không tìm thấy Học phần")
        return course

    def create_course(self, course_in: schemas.CourseCreate, current_user: user_models.User) -> models.Course:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
            raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể tạo Học phần")
        
        if self.repo.get_by_code(course_in.course_code):
             raise HTTPException(status_code=400, detail="Mã Học phần đã tồn tại")
        
        return self.repo.create(course_in.model_dump())

    def update_course(self, course_id: UUID, course_in: schemas.CourseUpdate, current_user: user_models.User) -> models.Course:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
            raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể sửa Học phần")

        db_course = self.get_course(course_id)
        update_data = course_in.model_dump(exclude_unset=True)
        return self.repo.update(db_course, update_data)

    def delete_course(self, course_id: UUID, current_user: user_models.User) -> dict:
        if not current_user.role or current_user.role.role_name not in ['admin', 'lecturer']:
            raise HTTPException(status_code=403, detail="Chỉ admin hoặc giảng viên mới có thể xóa Học phần")

        db_course = self.get_course(course_id)
        
        if db_course.enrollments or db_course.problems or db_course.assignments:
             raise HTTPException(status_code=400, detail="Không thể xóa Học phần đã có dữ liệu (sinh viên/bài tập/phân công)")

        self.repo.delete(db_course)
        return {"message": "Đã xóa Học phần thành công"}
