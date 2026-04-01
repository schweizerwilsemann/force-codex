from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.menus import Menu as MenuORM
from app.models.users import User
from app.repositories.menu_repository import MenuRepository
from app.repositories.course_repository import CourseRepository
from app.repositories.enrollment_repository import EnrollmentRepository
from app.schemas.menus import MenuCreate, MenuUpdate, Menu as MenuSchema


class MenuService:
    """
    Service layer for Menu business logic.
    Responsible for transaction management (commit/rollback).
    """

    TRANSIENT_MENU_ID_START = 100_000

    def __init__(self, db: Session):
        self.db = db
        self.repo = MenuRepository(db)

    def create_menus_for_new_course(self, course, *, commit: bool = True) -> None:
        """Insert per-role course submenu rows under each role's 'courses' root."""
        self._ensure_role_course_menus("student", "/student/courses", course)
        self._ensure_role_course_menus("admin", "/admin/courses", course)
        self._ensure_role_course_menus("lecturer", "/lecturer/courses", course)
        self.db.flush()
        if commit:
            self.db.commit()

    def _ensure_role_course_menus(self, role: str, parent_path: str, course) -> None:
        parent = self.repo.find_root_menu(parent_path, role)
        if not parent:
            return
        cid = course.course_id
        if self.repo.course_menu_root_exists(parent.menu_id, cid, role):
            return
        next_order = self.repo.max_order_index_under_parent(parent.menu_id) + 1

        if role == "student":
            root = MenuORM(
                title=course.course_name,
                path=f"/student/courses/{cid}",
                icon=None,
                role_name="student",
                parent_id=parent.menu_id,
                order_index=next_order,
                course_id=cid,
                is_deleted=False,
            )
            self.db.add(root)
            self.db.flush()
            self.db.add(
                MenuORM(
                    title="Bài tập",
                    path=f"/student/courses/{cid}/problems",
                    icon="Code",
                    role_name="student",
                    parent_id=root.menu_id,
                    order_index=1,
                    course_id=cid,
                    is_deleted=False,
                )
            )
            self.db.add(
                MenuORM(
                    title="Bài tập về nhà",
                    path=f"/student/courses/{cid}/assignments",
                    icon="FileText",
                    role_name="student",
                    parent_id=root.menu_id,
                    order_index=2,
                    course_id=cid,
                    is_deleted=False,
                )
            )
            return

        root = MenuORM(
            title=course.course_name,
            path=f"/{role}/courses/{cid}",
            icon=None,
            role_name=role,
            parent_id=parent.menu_id,
            order_index=next_order,
            course_id=cid,
            is_deleted=False,
        )
        self.db.add(root)
        self.db.flush()
        submenus = [
            ("Tổng quan", f"/{role}/courses/{cid}", "LayoutDashboard", 0),
            ("Bài tập (Problems)", f"/{role}/courses/{cid}/problems", "Code2", 1),
            ("Phân công (Assignments)", f"/{role}/courses/{cid}/assignments", "ClipboardList", 2),
            ("Sinh viên", f"/{role}/courses/{cid}/students", "Users", 3),
        ]
        for title, path, icon, oix in submenus:
            self.db.add(
                MenuORM(
                    title=title,
                    path=path,
                    icon=icon,
                    role_name=role,
                    parent_id=root.menu_id,
                    order_index=oix,
                    course_id=cid,
                    is_deleted=False,
                )
            )

    def sync_course_menu_titles(self, course_id: UUID, course_name: str, *, commit: bool = True) -> None:
        self.repo.sync_course_root_titles(course_id, course_name)
        if commit:
            self.db.commit()

    def hard_delete_menus_for_course(self, course_id: UUID, *, commit: bool = True) -> None:
        self.repo.hard_delete_menus_for_course(course_id)
        if commit:
            self.db.commit()

    def backfill_course_menus_from_db(self, *, limit: int = 10_000, commit: bool = True) -> dict:
        """
        Insert per-course menu rows for every course in `courses` (same paths/titles as backend).
        Idempotent: skips when a course root already exists under the role parent.
        """
        course_repo = CourseRepository(self.db)
        courses = course_repo.get_multi(skip=0, limit=limit)
        missing_roots: list[str] = []
        for path, role in (
            ("/student/courses", "student"),
            ("/admin/courses", "admin"),
            ("/lecturer/courses", "lecturer"),
        ):
            if not self.repo.find_root_menu(path, role):
                missing_roots.append(f"{role} → {path}")
        for course in courses:
            self.create_menus_for_new_course(course, commit=False)
        if commit:
            self.db.commit()
        return {
            "courses_seen": len(courses),
            "missing_parent_menus": missing_roots,
        }

    def get_my_menu(self, user: User) -> list[MenuSchema]:
        if not user.role:
            raise HTTPException(status_code=400, detail="User has no role assigned")

        menus = self.repo.get_roots_by_role(user.role.role_name)

        if user.role.role_name == "lecturer":
            menus = [m for m in menus if m.path != "/lecturer/users" and m.title != "User Management"]

        if user.role.role_name in ("admin", "lecturer"):
            path_prefix = f"/{user.role.role_name}"
            menus = [m for m in menus if m.path != f"{path_prefix}/problems"]

        return [self._node_to_schema(m, user) for m in menus]

    def _orm_node_schema(self, m: MenuORM, children: list[MenuSchema]) -> MenuSchema:
        return MenuSchema(
            menu_id=m.menu_id,
            title=m.title,
            path=m.path,
            icon=m.icon,
            role_name=m.role_name,
            parent_id=m.parent_id,
            order_index=m.order_index,
            course_id=m.course_id,
            is_deleted=m.is_deleted,
            deleted_at=m.deleted_at,
            children=children,
        )

    def _node_to_schema(self, m: MenuORM, user: User) -> MenuSchema:
        children = self._resolve_child_schemas(m, user)
        return self._orm_node_schema(m, children)

    def _resolve_child_schemas(self, m: MenuORM, user: User) -> list[MenuSchema]:
        role = user.role.role_name

        if role == "student" and m.path == "/student/courses":
            return self._student_courses_children(m, user)

        if role in ("admin", "lecturer") and m.path == f"/{role}/courses":
            return self._staff_courses_children(m, user)

        subs = self.repo.get_active_children(m.menu_id)
        return [self._node_to_schema(c, user) for c in subs]

    def _student_courses_children(self, parent: MenuORM, user: User) -> list[MenuSchema]:
        enroll_repo = EnrollmentRepository(self.db)
        enrollments = enroll_repo.get_student_enrollments(user.user_id)
        course_ids = [e.course_id for e in enrollments if e.course_id]
        db_map = {
            row.course_id: row
            for row in self.repo.get_active_children_for_course_ids(parent.menu_id, course_ids)
            if row.course_id
        }
        transient_id = [self.TRANSIENT_MENU_ID_START]

        def next_tid() -> int:
            transient_id[0] += 1
            return transient_id[0]

        out: list[MenuSchema] = []
        for enrollment in enrollments:
            course = enrollment.course
            if not course:
                continue
            root_db = db_map.get(course.course_id)
            if root_db:
                out.append(self._node_to_schema(root_db, user))
            else:
                out.append(self._legacy_student_course_schema(course, next_tid))
        return out

    def _legacy_student_course_schema(self, course, next_tid) -> MenuSchema:
        cid = course.course_id
        rid = next_tid()
        problems_id = next_tid()
        assignments_id = next_tid()
        root = MenuSchema(
            menu_id=rid,
            title=course.course_name,
            path=f"/student/courses/{cid}",
            icon=None,
            role_name="student",
            parent_id=None,
            order_index=0,
            course_id=cid,
            children=[
                MenuSchema(
                    menu_id=problems_id,
                    title="Bài tập",
                    path=f"/student/courses/{cid}/problems",
                    icon="Code",
                    role_name="student",
                    parent_id=rid,
                    order_index=1,
                    course_id=cid,
                    children=[],
                ),
                MenuSchema(
                    menu_id=assignments_id,
                    title="Bài tập về nhà",
                    path=f"/student/courses/{cid}/assignments",
                    icon="FileText",
                    role_name="student",
                    parent_id=rid,
                    order_index=2,
                    course_id=cid,
                    children=[],
                ),
            ],
        )
        return root

    def _staff_courses_children(self, parent: MenuORM, user: User) -> list[MenuSchema]:
        course_repo = CourseRepository(self.db)
        courses = course_repo.get_multi(limit=500)
        role = user.role.role_name
        db_children = self.repo.get_active_children(parent.menu_id)
        db_map = {row.course_id: row for row in db_children if row.course_id}

        transient_id = [self.TRANSIENT_MENU_ID_START]

        def next_tid() -> int:
            transient_id[0] += 1
            return transient_id[0]

        out: list[MenuSchema] = []
        for course in courses:
            root_db = db_map.get(course.course_id)
            if root_db:
                out.append(self._node_to_schema(root_db, user))
            else:
                out.append(self._legacy_staff_course_schema(course, role, next_tid))
        return out

    def _legacy_staff_course_schema(self, course, role: str, next_tid) -> MenuSchema:
        cid = course.course_id
        base = f"/{role}/courses/{cid}"
        course_id = next_tid()
        ch_specs = [
            ("Tổng quan", base, "LayoutDashboard", 0),
            ("Bài tập (Problems)", f"{base}/problems", "Code2", 1),
            ("Phân công (Assignments)", f"{base}/assignments", "ClipboardList", 2),
            ("Sinh viên", f"{base}/students", "Users", 3),
        ]
        children: list[MenuSchema] = []
        for title, path, icon, oix in ch_specs:
            children.append(
                MenuSchema(
                    menu_id=next_tid(),
                    title=title,
                    path=path,
                    icon=icon,
                    role_name=role,
                    parent_id=course_id,
                    order_index=oix,
                    course_id=cid,
                    children=[],
                )
            )
        return MenuSchema(
            menu_id=course_id,
            title=course.course_name,
            path=base,
            icon=None,
            role_name=role,
            parent_id=None,
            order_index=0,
            course_id=cid,
            children=children,
        )

    def get_all_menus(self, user: User, role_filter: Optional[str] = None, include_deleted: bool = False) -> list[MenuSchema]:
        if user.role.role_name.lower() != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        rows = self.repo.get_all(role_filter, include_deleted=include_deleted)
        return [
            MenuSchema(
                menu_id=m.menu_id,
                title=m.title,
                path=m.path,
                icon=m.icon,
                role_name=m.role_name,
                parent_id=m.parent_id,
                order_index=m.order_index,
                course_id=m.course_id,
                is_deleted=m.is_deleted,
                deleted_at=m.deleted_at,
                children=[],
            )
            for m in rows
        ]

    def restore_menu(self, user: User, menu_id: int) -> None:
        if user.role.role_name.lower() != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        menu = self.repo.get_by_id_include_deleted(menu_id)
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found")

        try:
            # When restoring, we might also want to restore descendants,
            # but usually it's safer to just restore the one requested
            # and let the user restore children if needed, OR restore all.
            # In this case, let's restore the menu itself.
            # If it has a parent that is still deleted, it might not show up in my-menu.
            self.repo.restore_menu_ids([menu_id])
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def create_menu(self, user: User, menu_in: MenuCreate) -> MenuORM:
        if user.role.role_name.lower() != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        try:
            payload = menu_in.model_dump() if hasattr(menu_in, "model_dump") else menu_in.dict()
            db_menu = MenuORM(**payload)
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
        if user.role.role_name.lower() != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        menu = self.repo.get_by_id_include_deleted(menu_id)
        if not menu or menu.is_deleted:
            raise HTTPException(status_code=404, detail="Menu not found")

        try:
            ids = self.repo.collect_descendant_menu_ids(menu_id)
            self.repo.soft_delete_menu_ids(ids)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def update_menu(self, user: User, menu_id: int, menu_in: MenuUpdate) -> MenuORM:
        if user.role.role_name.lower() != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")

        menu = self.repo.get_by_id(menu_id)
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found")

        try:
            update_data = (
                menu_in.model_dump(exclude_unset=True)
                if hasattr(menu_in, "model_dump")
                else menu_in.dict(exclude_unset=True)
            )
            for field, value in update_data.items():
                setattr(menu, field, value)
            self.db.commit()
            self.db.refresh(menu)
            return menu
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error.")
        except Exception:
            self.db.rollback()
            raise
