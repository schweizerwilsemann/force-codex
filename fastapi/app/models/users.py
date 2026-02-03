import uuid
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.role_id"))
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    role = relationship("app.models.roles.Role", back_populates="users")
    student_profile = relationship("Student", back_populates="user", uselist=False)
    lecturer_profile = relationship("Lecturer", back_populates="user", uselist=False)

class Student(Base):
    __tablename__ = "students"

    student_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    student_code = Column(String(20), unique=True, nullable=False, index=True)
    class_name = Column(String(100))  # Legacy field
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.class_id"))  # New FK to administrative class
    year_of_admission = Column(Integer)
    major = Column(String(100))

    user = relationship("User", back_populates="student_profile")
    admin_class = relationship("app.models.coding.Class", back_populates="students")
    course_enrollments = relationship("app.models.coding.CourseEnrollment", back_populates="student")
    submissions = relationship("app.models.coding.Submission", back_populates="student")

class Lecturer(Base):
    __tablename__ = "lecturers"

    lecturer_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    lecturer_code = Column(String(20), unique=True)
    department = Column(String(100))

    user = relationship("User", back_populates="lecturer_profile")
    classes = relationship("app.models.coding.Class", back_populates="lecturer")

class InitialPassword(Base):
    __tablename__ = "initial_passwords"

    record_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid7)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"))
    plain_password = Column(String(50), nullable=False)
    email_sent = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
