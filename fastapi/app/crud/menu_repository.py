from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import asc
from app.models.menus import Menu


class MenuRepository:
    """
    Repository for Menu data access.
    Pure data access layer - NO transaction management (commit/rollback).
    """
    def __init__(self, db: Session):
        self.db = db

    def get_all_roots(self, role_name: Optional[str] = None) -> list[Menu]:
        query = self.db.query(Menu).filter(Menu.parent_id == None)
        if role_name:
            query = query.filter(Menu.role_name == role_name.lower())
        return query.order_by(asc(Menu.order_index)).all()

    def get_roots_by_role(self, role_name: str) -> list[Menu]:
        return self.db.query(Menu).filter(
            Menu.role_name == role_name.lower(),
            Menu.parent_id == None
        ).order_by(asc(Menu.order_index)).all()

    def get_by_id(self, menu_id: int) -> Menu | None:
        return self.db.query(Menu).filter(Menu.menu_id == menu_id).first()
