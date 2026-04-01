from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel

class MenuBase(BaseModel):
    title: str
    path: Optional[str] = None
    icon: Optional[str] = None
    role_name: str
    parent_id: Optional[int] = None
    order_index: int = 0
    course_id: Optional[UUID] = None

class MenuCreate(MenuBase):
    pass


class MenuUpdate(BaseModel):
    title: Optional[str] = None
    path: Optional[str] = None
    icon: Optional[str] = None
    role_name: Optional[str] = None
    parent_id: Optional[int] = None
    order_index: Optional[int] = None
    course_id: Optional[UUID] = None


class Menu(MenuBase):
    menu_id: int
    children: List['Menu'] = []  # For nested response
    is_deleted: Optional[bool] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


Menu.model_rebuild()
