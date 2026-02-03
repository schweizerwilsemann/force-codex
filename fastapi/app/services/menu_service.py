from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.repositories.menu_repository import MenuRepository
from app.models.users import User
from app.models.menus import Menu
from app.schemas.menus import MenuCreate


class MenuService:
    """
    Service layer for Menu business logic.
    Responsible for transaction management (commit/rollback).
    """
    def __init__(self, db: Session):
        self.db = db
        self.repo = MenuRepository(db)

    def get_my_menu(self, user: User) -> list[Menu]:
        """Get menu items for the current user's role."""
        if not user.role:
            raise HTTPException(status_code=400, detail="User has no role assigned")
        
        menus = self.repo.get_roots_by_role(user.role.role_name)
        
        # Filter out menus as requested
        # For Lecturers: Remove 'User Management'
        if user.role.role_name == 'lecturer':
            menus = [m for m in menus if m.path != '/lecturer/users' and m.title != 'User Management']

        # For Admin/Lecturer: Remove global 'Problems' menu to force course-scoped management
        if user.role.role_name in ['admin', 'lecturer']:
             path_prefix = f"/{user.role.role_name}"
             menus = [m for m in menus if m.path != f"{path_prefix}/problems"]

        # Dynamic Injection: Courses
        # We need transient IDs for these dynamic items. We'll use a counter starting high.
        transient_id_counter = 100000

        if user.role.role_name == 'student':
            from app.repositories.enrollment_repository import EnrollmentRepository
            enroll_repo = EnrollmentRepository(self.db)
            enrollments = enroll_repo.get_student_enrollments(user.user_id)
            
            # Find "Học phần của tôi" template in DB (expected to be seeded as a template with {course_id})
            my_courses_menu = next((m for m in menus if m.path == '/student/courses'), None)
            
            if my_courses_menu:
                my_courses_menu.children = [] # Reset/Ensure empty
                for enrollment in enrollments:
                    course = enrollment.course
                    transient_id_counter += 1

                    # Create Course Menu Item
                    course_item = Menu(
                        menu_id=transient_id_counter,
                        title=course.course_name,
                        path=f'/student/courses/{course.course_id}',
                        icon=None,
                        role_name='student',
                        children=[],
                        order_index=0 # Order by enrollment?
                    )

                    # Sub-menus
                    # 1. Overview (Default click)
                    # 2. Problems
                    # 3. Assignments

                    transient_id_counter += 1
                    problems_item = Menu(
                        menu_id=transient_id_counter,
                        title='Bài tập',
                        path=f'/student/courses/{course.course_id}/problems',
                        icon='Code',
                        role_name='student',
                        children=[],
                        order_index=1
                    )

                    transient_id_counter += 1
                    assignments_item = Menu(
                         menu_id=transient_id_counter,
                         title='Bài tập về nhà',
                         path=f'/student/courses/{course.course_id}/assignments',
                         icon='FileText',
                         role_name='student',
                         children=[],
                         order_index=2
                    )

                    course_item.children = [problems_item, assignments_item]
                    my_courses_menu.children.append(course_item)

        elif user.role.role_name in ['admin', 'lecturer']:
            # Prefer DB-seeded per-course menus under the role's courses parent
            from app.repositories.course_repository import CourseRepository
            course_repo = CourseRepository(self.db)
            # Fetch ALL courses for now as requested/assumed
            courses = course_repo.get_multi(limit=500)
            
            # Find "Học phần" (Admin/Lecturer)
            # Admin path: /admin/courses, Lecturer path: /lecturer/courses
            target_path = f'/{user.role.role_name}/courses'
            courses_menu = next((m for m in menus if m.path == target_path), None)
            
            if courses_menu:
                # Fallback to dynamic creation if DB wasn't seeded with per-course rows
                    courses_menu.children = []
                    for course in courses:
                        transient_id_counter += 1
                        course_item = Menu(
                            menu_id=transient_id_counter,
                            title=course.course_name,
                            path=f'/{user.role.role_name}/courses/{course.course_id}',
                            icon=None,
                            role_name=user.role.role_name,
                            children=[],
                            order_index=0
                        )

                        transient_id_counter += 1
                        overview_item = Menu(
                             menu_id=transient_id_counter,
                             title='Tổng quan',
                             path=f'/{user.role.role_name}/courses/{course.course_id}',
                             icon='LayoutDashboard',
                             role_name=user.role.role_name,
                             children=[], 
                             order_index=0
                        )

                        transient_id_counter += 1
                        problems_item = Menu(
                            menu_id=transient_id_counter,
                            title='Bài tập (Problems)',
                            path=f'/{user.role.role_name}/courses/{course.course_id}/problems',
                            icon='Code2',
                            role_name=user.role.role_name,
                            children=[],
                            order_index=1
                        )
                        
                        transient_id_counter += 1
                        assignments_item = Menu(
                            menu_id=transient_id_counter,
                            title='Phân công (Assignments)',
                            path=f'/{user.role.role_name}/courses/{course.course_id}/assignments',
                            icon='ClipboardList',
                            role_name=user.role.role_name,
                            children=[],
                            order_index=2
                        )
                        
                        transient_id_counter += 1
                        students_item = Menu(
                            menu_id=transient_id_counter,
                            title='Sinh viên',
                            path=f'/{user.role.role_name}/courses/{course.course_id}/students',
                            icon='Users',
                            role_name=user.role.role_name,
                            children=[],
                            order_index=3
                        )
                        
                        course_item.children = [overview_item, problems_item, assignments_item, students_item]
                        courses_menu.children.append(course_item)
        return menus

    def get_all_menus(self, user: User, role_filter: Optional[str] = None) -> list[Menu]:
        """Get all menus. Admin only."""
        if user.role.role_name.lower() != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        
        return self.repo.get_all_roots(role_filter)

    def create_menu(self, user: User, menu_in: MenuCreate) -> Menu:
        """Create a new menu item. Admin only."""
        if user.role.role_name.lower() != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        
        try:
            db_menu = Menu(**menu_in.dict())
            self.db.add(db_menu)
            self.db.commit()
            self.db.refresh(db_menu)
            return db_menu
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error.")
        except Exception:
            self.db.rollback()
            raise

    def delete_menu(self, user: User, menu_id: int) -> None:
        """Delete a menu item. Admin only."""
        if user.role.role_name.lower() != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        
        menu = self.repo.get_by_id(menu_id)
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found")
        
        try:
            self.db.delete(menu)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
