from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.db.database import get_db
from app.models.menus import Menu
from app.schemas.menus import MenuCreate, MenuUpdate, Menu as MenuSchema
from app.routers.users import get_current_user
from app.models.users import User

router = APIRouter(
    responses={404: {"description": "Not found"}},
)

@router.get("/my-menu", response_model=List[MenuSchema])
def get_my_menu(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the menu structure for the current user's role.
    Only returns root items (parent_id=None). 
    Children are automatically populated by the ORM relationship if eager loading is on, 
    otherwise we might need to ensure they are loaded.
    """
    # Assuming role is stored in user.role.role_name
    # But wait, User model relationship is 'role'. Role model has 'role_name'.
    # Check User model again.
    # User.role is a relationship to Role. Role.role_name is the string.
    
    if not current_user.role:
         raise HTTPException(status_code=400, detail="User has no role assigned")
    
    role_name = current_user.role.role_name
    
    # Clean up role name if needed (e.g. lowercase)
    # The seeder creates 'student', 'admin', 'lecturer'.
    # Ideally standardizing on lowercase.
    
    menus = db.query(Menu).filter(
        Menu.role_name == role_name.lower(),
        Menu.parent_id == None
    ).order_by(asc(Menu.order_index)).all()
    
    return menus

@router.get("/", response_model=List[MenuSchema])
def get_all_menus(
    role_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all menus, optionally filtered by role.
    Admin only? For now, let's allow authenticated users but maybe restrict filtering?
    Actually, let's restrict full list to Admin.
    """
    # Check if admin
    if current_user.role.role_name.lower() != "admin": # TODO: Use a constant
        raise HTTPException(status_code=403, detail="Not authorized")

    query = db.query(Menu).filter(Menu.parent_id == None)
    if role_name:
        query = query.filter(Menu.role_name == role_name.lower())
    
    return query.order_by(asc(Menu.order_index)).all()

@router.post("/", response_model=MenuSchema)
def create_menu(
    menu: MenuCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.role_name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db_menu = Menu(**menu.dict())
    db.add(db_menu)
    db.commit()
    db.refresh(db_menu)
    return db_menu

@router.delete("/{menu_id}")
def delete_menu(
    menu_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.role_name.lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    menu = db.query(Menu).filter(Menu.menu_id == menu_id).first()
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    
    db.delete(menu)
    db.commit()
    return {"message": "Menu deleted"}
