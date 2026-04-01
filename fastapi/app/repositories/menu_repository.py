from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.models.menus import Menu


class MenuRepository:
    """
    Repository for Menu data access.
    Pure data access layer - NO transaction management (commit/rollback).
    """

    def __init__(self, db: Session):
        self.db = db

    def get_all_roots(self, role_name: Optional[str] = None) -> list[Menu]:
        query = self.db.query(Menu).filter(Menu.parent_id.is_(None), Menu.is_deleted.is_(False))
        if role_name:
            query = query.filter(Menu.role_name == role_name.lower())
        return query.order_by(asc(Menu.order_index)).all()

    def get_roots_by_role(self, role_name: str) -> list[Menu]:
        return (
            self.db.query(Menu)
            .filter(
                Menu.role_name == role_name.lower(),
                Menu.parent_id.is_(None),
                Menu.is_deleted.is_(False),
            )
            .order_by(asc(Menu.order_index))
            .all()
        )

    def get_by_id(self, menu_id: int) -> Menu | None:
        return (
            self.db.query(Menu)
            .filter(Menu.menu_id == menu_id, Menu.is_deleted.is_(False))
            .first()
        )

    def get_by_id_include_deleted(self, menu_id: int) -> Menu | None:
        return self.db.query(Menu).filter(Menu.menu_id == menu_id).first()

    def get_all(self, role_name: Optional[str] = None, include_deleted: bool = False) -> list[Menu]:
        query = self.db.query(Menu)
        if not include_deleted:
            query = query.filter(Menu.is_deleted.is_(False))
        if role_name:
            query = query.filter(Menu.role_name == role_name.lower())
        return query.order_by(asc(Menu.role_name), asc(Menu.order_index)).all()

    def restore_menu_ids(self, menu_ids: list[int]) -> None:
        self.db.query(Menu).filter(Menu.menu_id.in_(menu_ids)).update(
            {Menu.is_deleted: False, Menu.deleted_at: None},
            synchronize_session=False,
        )

    def get_active_children(self, parent_id: int) -> list[Menu]:
        return (
            self.db.query(Menu)
            .filter(
                Menu.parent_id == parent_id,
                Menu.is_deleted.is_(False),
            )
            .order_by(asc(Menu.order_index))
            .all()
        )

    def get_active_children_for_course_ids(self, parent_id: int, course_ids: list[UUID]) -> list[Menu]:
        if not course_ids:
            return []
        return (
            self.db.query(Menu)
            .filter(
                Menu.parent_id == parent_id,
                Menu.course_id.in_(course_ids),
                Menu.is_deleted.is_(False),
            )
            .order_by(asc(Menu.order_index))
            .all()
        )

    def find_root_menu(self, path: str, role_name: str) -> Menu | None:
        return (
            self.db.query(Menu)
            .filter(
                Menu.path == path,
                Menu.role_name == role_name.lower(),
                Menu.parent_id.is_(None),
                Menu.is_deleted.is_(False),
            )
            .first()
        )

    def max_order_index_under_parent(self, parent_id: int) -> int:
        row = (
            self.db.query(Menu.order_index)
            .filter(Menu.parent_id == parent_id)
            .order_by(Menu.order_index.desc())
            .first()
        )
        return int(row[0]) if row is not None and row[0] is not None else -1

    def course_menu_root_exists(self, parent_id: int, course_id: UUID, role_name: str) -> bool:
        return (
            self.db.query(Menu.menu_id)
            .filter(
                Menu.parent_id == parent_id,
                Menu.course_id == course_id,
                Menu.role_name == role_name.lower(),
                Menu.is_deleted.is_(False),
            )
            .first()
            is not None
        )

    def collect_descendant_menu_ids(self, root_menu_id: int) -> list[int]:
        result = [root_menu_id]
        frontier = [root_menu_id]
        while frontier:
            pid = frontier.pop()
            rows = self.db.query(Menu.menu_id).filter(Menu.parent_id == pid).all()
            for (cid,) in rows:
                result.append(cid)
                frontier.append(cid)
        return result

    def soft_delete_menu_ids(self, menu_ids: list[int]) -> None:
        now = datetime.now(timezone.utc)
        self.db.query(Menu).filter(Menu.menu_id.in_(menu_ids)).update(
            {Menu.is_deleted: True, Menu.deleted_at: now},
            synchronize_session=False,
        )

    def sync_course_root_titles(self, course_id: UUID, course_name: str) -> None:
        cid = str(course_id)
        for suffix in (
            f"/student/courses/{cid}",
            f"/admin/courses/{cid}",
            f"/lecturer/courses/{cid}",
        ):
            self.db.query(Menu).filter(
                Menu.course_id == course_id,
                Menu.path == suffix,
                Menu.is_deleted.is_(False),
            ).update({Menu.title: course_name}, synchronize_session=False)

    def hard_delete_menus_for_course(self, course_id: UUID) -> None:
        self.db.query(Menu).filter(Menu.course_id == course_id).delete(synchronize_session=False)
