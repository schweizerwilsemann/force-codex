from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.crud.menu_repository import MenuRepository
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
        
        return self.repo.get_roots_by_role(user.role.role_name)

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
