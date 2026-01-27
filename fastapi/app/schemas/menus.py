from typing import List, Optional
from pydantic import BaseModel

class MenuBase(BaseModel):
    title: str
    path: Optional[str] = None
    icon: Optional[str] = None
    role_name: str
    parent_id: Optional[int] = None
    order_index: int = 0

class MenuCreate(MenuBase):
    pass

class MenuUpdate(MenuBase):
    title: Optional[str] = None
    role_name: Optional[str] = None

class Menu(MenuBase):
    menu_id: int
    children: List['Menu'] = [] # For nested response

    class Config:
        from_attributes = True
