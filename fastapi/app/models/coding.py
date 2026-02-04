from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, Boolean, JSON, ARRAY, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import uuid

class Course(Base):
    __tablename__ = "courses"
    
    course_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    course_code = Column(String, unique=True, index=True, nullable=False)
    course_name = Column(String, nullable=False)
    category = Column(String)
    programming_languages = Column(ARRAY(String))
    
    problems = relationship("Problem", back_populates="course")
    assignments = relationship("Assignment", back_populates="course")
    enrollments = relationship("CourseEnrollment", back_populates="course")

class Class(Base):
    """Administrative class - students belong to one class"""
    __tablename__ = "classes"
    
    class_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    class_code = Column(String, unique=True, nullable=False)
    lecturer_id = Column(UUID(as_uuid=True), ForeignKey("lecturers.lecturer_id"))
    semester = Column(String)
    academic_year = Column(String(20))
    department = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    lecturer = relationship("app.models.users.Lecturer", back_populates="classes")
    students = relationship("app.models.users.Student", back_populates="admin_class")


class CourseEnrollment(Base):
    """Student enrollment in a course (academic subject)"""
    __tablename__ = "course_enrollments"
    
    enrollment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.course_id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.student_id"), nullable=False)
    enrolled_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    status = Column(String, default="active")
    
    course = relationship("Course", back_populates="enrollments")
    student = relationship("app.models.users.Student", back_populates="course_enrollments")



class Problem(Base):
    __tablename__ = "problems"

    problem_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.course_id"), nullable=True) # Optional link to course
    problem_code = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    difficulty = Column(String, default="medium")
    time_limit = Column(Integer, default=1000) # ms
    memory_limit = Column(Integer, default=256) # MB
    allowed_languages = Column(ARRAY(String))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())

    course = relationship("Course", back_populates="problems")
    test_cases = relationship("TestCase", back_populates="problem", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="problem")

class TestCase(Base):
    __tablename__ = "test_cases"

    test_case_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.problem_id"), nullable=False)
    input = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, default=False)
    points = Column(Integer, default=10)
    order_index = Column(Integer, default=0)

    problem = relationship("Problem", back_populates="test_cases")
    test_results = relationship("SubmissionTestResult", back_populates="test_case", cascade="all, delete-orphan")

class Assignment(Base):
    __tablename__ = "assignments"
    
    assignment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.course_id"), nullable=False)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.problem_id"), nullable=False)
    title = Column(String)
    description = Column(Text)
    max_score = Column(Integer, default=100)
    start_date = Column(TIMESTAMP(timezone=True))
    due_date = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    course = relationship("Course", back_populates="assignments")
    problem = relationship("Problem", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment")

class Submission(Base):
    __tablename__ = "submissions"

    submission_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.assignment_id"), nullable=True) # Can be null if practice?
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.student_id"), nullable=False)
    problem_id = Column(UUID(as_uuid=True), ForeignKey("problems.problem_id"), nullable=True) # Direct link if no assignment?
    language = Column(String, nullable=False)
    source_code = Column(Text, nullable=False)
    status = Column(String, default="pending") # pending, judging, accepted, wrong_answer, etc.
    score = Column(Integer, default=0)
    execution_time = Column(Integer)
    memory_used = Column(Integer)
    test_cases_passed = Column(Integer, default=0)
    total_test_cases = Column(Integer, default=0)
    judged_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("app.models.users.Student", back_populates="submissions")
    test_results = relationship("SubmissionTestResult", back_populates="submission", cascade="all, delete-orphan")

class SubmissionTestResult(Base):
    __tablename__ = "submission_test_results"

    result_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.submission_id"), nullable=False)
    test_case_id = Column(UUID(as_uuid=True), ForeignKey("test_cases.test_case_id"), nullable=False)
    status = Column(String, nullable=False)
    execution_time = Column(Integer)
    memory_used = Column(Integer)
    actual_output = Column(Text)
    error_message = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    submission = relationship("Submission", back_populates="test_results")
    test_case = relationship("TestCase", back_populates="test_results")
