from datetime import datetime, timedelta
import secrets

from fastapi import HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.schemas import users as schemas
from app.repositories.user_repository import UserRepository
from app.core import security
from app.services import email
from app.models import users as models


class UserService:
    """
    Service layer for User business logic.
    Responsible for transaction management (commit/rollback).
    """
    def __init__(self, db: Session):
        self.db = db
        self.repo = UserRepository(db)

    def create_user(
        self, 
        user_in: schemas.UserCreate, 
        creator: models.User,
        background_tasks: BackgroundTasks
    ) -> models.User:
        """
        Create a new user.
        - Admins can create students and lecturers.
        - Lecturers can only create students.
        """
        try:
            # 1. Permission Check
            is_admin = creator.role.role_name == 'admin' if creator.role else False
            is_lecturer = creator.role.role_name == 'lecturer' if creator.role else False

            if not (is_admin or is_lecturer):
                raise HTTPException(status_code=403, detail="Not authorized to create users")
                
            if is_lecturer and user_in.role_name != 'student':
                raise HTTPException(status_code=403, detail="Lecturers can only create students")

            # 2. Duplicate Check
            if self.repo.get_by_email(user_in.email):
                raise HTTPException(status_code=400, detail="The user with this email already exists in the system.")

            # 3. Role Validation
            role = self.repo.get_role_by_name(user_in.role_name)
            if not role:
                raise HTTPException(status_code=400, detail=f"Role {user_in.role_name} not found")

            # 4. Prepare User Data
            raw_password = secrets.token_urlsafe(10)
            user = models.User(
                email=user_in.email,
                password_hash=security.get_password_hash(raw_password),
                full_name=user_in.full_name,
                role_id=role.role_id,
                is_active=user_in.is_active,
            )
            self.db.add(user)
            self.db.flush()  # Get user_id before adding related entities

            # 5. Add Role-Specific Profile
            if user_in.role_name == 'student':
                student = models.Student(
                    student_id=user.user_id,
                    student_code=user_in.student_code,
                    class_name=user_in.class_name,
                    class_id=user_in.initial_class_id,  # Assign to admin class directly
                    year_of_admission=user_in.year_of_admission,
                    major=user_in.major
                )
                self.db.add(student)
            elif user_in.role_name == 'lecturer':
                lecturer = models.Lecturer(
                    lecturer_id=user.user_id,
                    lecturer_code=user_in.lecturer_code,
                    department=user_in.department
                )
                self.db.add(lecturer)

            # 6. Initial Password Record
            expires_at = datetime.utcnow() + timedelta(days=7)
            initial_pwd_record = models.InitialPassword(
                user_id=user.user_id,
                plain_password=raw_password,
                email_sent=True,
                expires_at=expires_at
            )
            self.db.add(initial_pwd_record)

            # 7. Commit Transaction
            self.db.commit()
            self.db.refresh(user)

            # 8. Send Email (REMOVED - Manual Trigger Only)
            # background_tasks.add_task(email.send_new_account_email, user.email, raw_password, user.full_name)

            # 9. REMOVED: Class enrollment via StudentEnrollment table
            # Now handled by Student.class_id directly (set above)

            return user

        except HTTPException:
            self.db.rollback()
            raise
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error. User may already exist.")
        except Exception:
            self.db.rollback()
            raise

    def get_users(self, skip: int, limit: int) -> list[models.User]:
        """Retrieve a list of users."""
        return self.repo.list_users(skip, limit)

    def bulk_import_students(
        self,
        import_data: schemas.BulkStudentImport,
        creator: models.User,
        background_tasks: BackgroundTasks
    ) -> schemas.BulkImportResult:
        """
        Bulk import students with optional assignment to administrative class.
        Uses Student.class_id instead of old StudentEnrollment.
        """
        from app.models import coding as coding_models

        total = len(import_data.students)
        created = 0
        enrolled = 0  # Now means "assigned to admin class" OR "enrolled in course"
        skipped = 0
        errors = []
        created_students = []
        enrolled_students = []

        # Get student role
        role = self.repo.get_role_by_name('student')
        if not role:
            raise HTTPException(status_code=400, detail="Role 'student' not found")

        # Verify class exists if provided
        db_class = None
        if import_data.class_id:
            db_class = self.db.query(coding_models.Class).filter(
                coding_models.Class.class_id == import_data.class_id
            ).first()
            if not db_class:
                raise HTTPException(status_code=404, detail="Không tìm thấy lớp học")

        # Verify course exists if provided
        db_course = None
        if import_data.course_id:
            db_course = self.db.query(coding_models.Course).filter(
                coding_models.Course.course_id == import_data.course_id
            ).first()
            if not db_course:
                # Ideally we should fail if the course is invalid
                raise HTTPException(status_code=404, detail="Không tìm thấy học phần")

        for student_data in import_data.students:
            try:
                # Check if email/code already exists
                existing_user = self.repo.get_by_email(student_data.email)
                
                # Check by student code too if not found by email
                if not existing_user:
                     existing_student = self.db.query(models.Student).filter(
                        models.Student.student_code == student_data.student_code
                     ).first()
                     if existing_student:
                         existing_user = self.db.query(models.User).filter(
                             models.User.user_id == existing_student.student_id
                         ).first()

                if existing_user:
                    # User exists - Update class_id if needed
                    existing_student = self.db.query(models.Student).filter(
                        models.Student.student_id == existing_user.user_id
                    ).first()
                    
                    target_class = db_class
                    if not target_class and student_data.class_name:
                        # Try to find class by code
                        target_class = self.db.query(coding_models.Class).filter(
                            coding_models.Class.class_code == student_data.class_name
                        ).first()
                    
                    if target_class and existing_student:
                        if existing_student.class_id != target_class.class_id:
                            # Assign to admin class
                            existing_student.class_id = target_class.class_id
                            existing_student.class_name = target_class.class_code
                            self.db.flush()
                            # Only count as enrolled if not also enrolling in course
                            if not db_course:
                                enrolled += 1
                                enrolled_students.append({
                                    "student_code": student_data.student_code,
                                    "full_name": existing_user.full_name,
                                    "email": existing_user.email
                                })

                    # NEW: Enroll in course if provided
                    if db_course and existing_student:
                        # Check if already enrolled
                        existing_enrollment = self.db.query(coding_models.CourseEnrollment).filter(
                            coding_models.CourseEnrollment.student_id == existing_student.student_id,
                            coding_models.CourseEnrollment.course_id == db_course.course_id
                        ).first()

                        if not existing_enrollment:
                            new_enrollment = coding_models.CourseEnrollment(
                                course_id=db_course.course_id,
                                student_id=existing_student.student_id,
                                status="active"
                            )
                            self.db.add(new_enrollment)
                            self.db.flush()
                            enrolled += 1 # Count course enrollments too
                            if existing_user.email not in [s['email'] for s in enrolled_students]:
                                enrolled_students.append({
                                    "student_code": student_data.student_code,
                                    "full_name": existing_user.full_name,
                                    "email": existing_user.email
                                })

                    if not target_class and not db_course:
                         skipped += 1 # No changes
                    
                    continue

                # Generate password
                import secrets
                raw_password = secrets.token_urlsafe(10)

                # Find target class for new student
                target_class = db_class
                if not target_class and student_data.class_name:
                    target_class = self.db.query(coding_models.Class).filter(
                        coding_models.Class.class_code == student_data.class_name
                    ).first()

                # Create user
                user = models.User(
                    email=student_data.email,
                    password_hash=security.get_password_hash(raw_password),
                    full_name=student_data.full_name,
                    role_id=role.role_id,
                    is_active=True,
                )
                self.db.add(user)
                self.db.flush()

                # Create student profile with class_id
                student = models.Student(
                    student_id=user.user_id,
                    student_code=student_data.student_code,
                    class_name=target_class.class_code if target_class else student_data.class_name,
                    class_id=target_class.class_id if target_class else None,
                    year_of_admission=student_data.year_of_admission,
                    major=student_data.major
                )
                self.db.add(student)

                # NEW: Enroll in course for new student
                if db_course:
                    new_enrollment = coding_models.CourseEnrollment(
                        course_id=db_course.course_id,
                        student_id=student.student_id,
                        status="active"
                    )
                    self.db.add(new_enrollment)

                # Password record
                from datetime import datetime, timedelta
                expires_at = datetime.utcnow() + timedelta(days=7)
                initial_pwd = models.InitialPassword(
                    user_id=user.user_id,
                    plain_password=raw_password,
                    email_sent=True,
                    expires_at=expires_at
                )
                self.db.add(initial_pwd)

                created += 1
                created_students.append({
                    "student_code": student_data.student_code,
                    "full_name": student_data.full_name,
                    "email": student_data.email
                })

            except Exception as e:
                errors.append(f"{student_data.email}: {str(e)}")
                skipped += 1
                continue

        self.db.commit()

        return schemas.BulkImportResult(
            total=total,
            created=created,
            enrolled=enrolled,
            skipped=skipped,
            errors=errors,
            created_students=created_students,
            enrolled_students=enrolled_students
        )

    def send_activation_emails(
        self,
        user_ids: list[str],
        background_tasks: BackgroundTasks
    ) -> dict:
        """
        Send activation emails to specified users.
        """
        sent_count = 0
        errors = []

        for user_id in user_ids:
            try:
                # Get User
                user = self.db.query(models.User).filter(models.User.user_id == user_id).first()
                if not user:
                    errors.append(f"User {user_id} not found")
                    continue

                # Get Initial Password
                # We need the plain text password. It should be in InitialPassword table.
                initial_pwd = self.db.query(models.InitialPassword).filter(
                    models.InitialPassword.user_id == user_id
                ).first()

                if not initial_pwd:
                    errors.append(f"No initial password record for {user.email}")
                    continue

                # Check expiry? Optional. Let's send anyway, or maybe extend expiry if needed.
                # For now just send what we have.

                background_tasks.add_task(
                    email.send_new_account_email,
                    user.email,
                    initial_pwd.plain_password,
                    user.full_name
                )
                
                # Update sent status
                initial_pwd.email_sent = True
                self.db.add(initial_pwd)
                sent_count += 1

            except Exception as e:
                errors.append(f"Error sending to {user_id}: {str(e)}")
        
        self.db.commit()
        
        return {
            "sent": sent_count,
            "errors": errors
        }

    def get_students(self, class_id: str = None, course_id: str = None, skip: int = 0, limit: int = 100) -> list[dict]:
        """Get students, optionally filtered by class or course enrollment."""
        from app.models import coding as coding_models
        from uuid import UUID

        if class_id:
            try:
                class_uuid = UUID(class_id)
            except ValueError:
                class_uuid = None
        else:
             class_uuid = None
        
        if course_id:
            try:
                course_uuid = UUID(course_id)
            except ValueError:
                course_uuid = None
        else:
             course_uuid = None
        
        # Use Repository
        results = self.repo.get_students_by_filter(class_uuid, course_uuid, skip, limit)

        return [
            {
                "user_id": str(user.user_id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "student_code": student.student_code,
                "class_name": student.class_name,
                "year_of_admission": student.year_of_admission,
                "major": student.major
            }
            for user, student in results
        ]

