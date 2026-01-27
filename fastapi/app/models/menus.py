from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class Menu(Base):
    __tablename__ = "menus"

    menu_id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    path = Column(String, nullable=True) # Can be null if it's just a parent group
    icon = Column(String, nullable=True)
    role_name = Column(String, nullable=False) # 'student', 'admin', 'lecturer'
    parent_id = Column(Integer, ForeignKey("menus.menu_id"), nullable=True)
    order_index = Column(Integer, default=0)

    # Self-referential relationship for hierarchy
    # parent attribute accesses the parent Menu object
    # children attribute (via backref) accesses the list of child Menu objects
    parent_nav = relationship("Menu", remote_side=[menu_id], backref="children")
