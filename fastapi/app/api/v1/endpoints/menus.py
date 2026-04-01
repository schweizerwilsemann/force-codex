from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.menus import MenuCreate, MenuUpdate, Menu as MenuSchema
from app.api.v1.endpoints.users import get_current_user
from app.models.users import User
from app.services.menu_service import MenuService

router = APIRouter(
    responses={404: {"description": "Not found"}},
)

@router.get("/my-menu", response_model=List[MenuSchema])
def get_my_menu(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the menu structure for the current user's role."""
    service = MenuService(db)
    return service.get_my_menu(current_user)

@router.get("/", response_model=List[MenuSchema])
def get_all_menus(
    role_name: Optional[str] = None,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all menus, optionally filtered by role. Admin only."""
    service = MenuService(db)
    return service.get_all_menus(current_user, role_name, include_deleted)

@router.post("/{menu_id}/restore")
def restore_menu(
    menu_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Restore a deleted menu item. Admin only."""
    service = MenuService(db)
    service.restore_menu(current_user, menu_id)
    return {"message": "Menu restored"}

@router.post("/", response_model=MenuSchema)
def create_menu(
    menu: MenuCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new menu item. Admin only."""
    service = MenuService(db)
    return service.create_menu(current_user, menu)

@router.delete("/{menu_id}")
def delete_menu(
    menu_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a menu item. Admin only."""
    service = MenuService(db)
    service.delete_menu(current_user, menu_id)
    return {"message": "Menu deleted"}

@router.put("/{menu_id}", response_model=MenuSchema)
def update_menu(
    menu_id: int,
    menu: MenuUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a menu item. Admin only."""
    service = MenuService(db)
    return service.update_menu(current_user, menu_id, menu)

