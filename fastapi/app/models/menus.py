from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
from app.db.database import Base


class Menu(Base):
    __tablename__ = "menus"

    menu_id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    path = Column(String, nullable=True)  # Can be null if it's just a parent group
    icon = Column(String, nullable=True)
    role_name = Column(String, nullable=False)  # 'student', 'admin', 'lecturer'
    parent_id = Column(Integer, ForeignKey("menus.menu_id"), nullable=True)
    order_index = Column(Integer, default=0)
    course_id = Column(PGUUID(as_uuid=True), ForeignKey("courses.course_id"), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Self-referential relationship for hierarchy
    parent_nav = relationship("Menu", remote_side=[menu_id], backref="children")
