import sys
import os

# Add parent dir to path
sys.path.append(os.getcwd())

from app.db.database import SessionLocal, engine, Base
from app.models import users as user_models
from app.models import roles as role_models
from app.core import security

def seed_data():
    db = SessionLocal()
    try:
        # Create Tables
        Base.metadata.create_all(bind=engine)

        # 1. Create Roles
        roles = ["admin", "student", "lecturer"]
        for role_name in roles:
            role = db.query(role_models.Role).filter(role_models.Role.role_name == role_name).first()
            if not role:
                print(f"Creating role: {role_name}")
                new_role = role_models.Role(role_name=role_name)
                db.add(new_role)
        db.commit()

        # 2. Create Admin User
        admin_email = "admin@example.com"
        admin = db.query(user_models.User).filter(user_models.User.email == admin_email).first()
        
        if not admin:
            print(f"Creating admin user: {admin_email}")
            admin_role = db.query(role_models.Role).filter(role_models.Role.role_name == "admin").first()
            
            new_admin = user_models.User(
                email=admin_email,
                full_name="System Administrator",
                password_hash=security.get_password_hash("admin123"), # Default password
                role_id=admin_role.role_id,
                is_active=True
            )
            db.add(new_admin)
            db.commit()
            print("Admin user created successfully.")
            print("Email: admin@example.com")
            print("Password: admin123")
        else:
            print("Admin user already exists.")
            # Update password just in case
            admin.password_hash = security.get_password_hash("admin123")
            db.commit()
            print("Admin password reset to: admin123")

        # 3. Create Lecturer User
        lecturer_email = "lecturer@example.com"
        lecturer = db.query(user_models.User).filter(user_models.User.email == lecturer_email).first()
        if not lecturer:
            print(f"Creating lecturer user: {lecturer_email}")
            lecturer_role = db.query(role_models.Role).filter(role_models.Role.role_name == "lecturer").first()
            new_lecturer = user_models.User(
                email=lecturer_email,
                full_name="Lecturer One",
                password_hash=security.get_password_hash("lecturer123"),
                role_id=lecturer_role.role_id,
                is_active=True
            )
            db.add(new_lecturer)
            db.commit()
            print("Lecturer user created successfully.")

        # 4. Create Student User
        student_email = "student@example.com"
        student = db.query(user_models.User).filter(user_models.User.email == student_email).first()
        if not student:
            print(f"Creating student user: {student_email}")
            student_role = db.query(role_models.Role).filter(role_models.Role.role_name == "student").first()
            new_student = user_models.User(
                email=student_email,
                full_name="Student One",
                password_hash=security.get_password_hash("student123"),
                role_id=student_role.role_id,
                is_active=True
            )
            db.add(new_student)
            db.flush() # Flush to get student_id

            # Create Student Profile
            # Check if student profile exists (though usually 1-to-1 with user creation)
            student_profile = user_models.Student(
                student_id=new_student.user_id,
                student_code="STU001",
                class_name="CS101"
            )
            db.add(student_profile)
            
            db.commit()
            print("Student user created successfully.")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

def seed_menus(db):
    try:
        from app.models.menus import Menu
        if db.query(Menu).count() > 0:
            print("Menus already exist. Skipping.")
            return

        print("Seeding menus...")
        
        # Admin Menus
        admin_menus = [
            Menu(title="Dashboard", path="/admin", icon="LayoutDashboard", role_name="admin", order_index=1),
            Menu(title="User Management", path="/admin/users", icon="Users", role_name="admin", order_index=2),
            Menu(title="Menu Management", path="/admin/menus", icon="Menu", role_name="admin", order_index=3),
        ]
        db.add_all(admin_menus)
        
        # Student Menus
        student_exams = Menu(title="My Exams", path="/student/exams", icon="FileText", role_name="student", order_index=1)
        student_practice = Menu(title="Practice Problems", path="/student/practice", icon="Code", role_name="student", order_index=2)
        student_grades = Menu(title="Grades", path="/student/grades", icon="BarChart", role_name="student", order_index=3)
        student_profile = Menu(title="Profile", path="/student/profile", icon="User", role_name="student", order_index=4)

        db.add_all([student_exams, student_practice, student_grades, student_profile])
        db.flush()

        # Submenus for Exams
        db.add(Menu(title="Upcoming", path="/student/exams/upcoming", icon="Calendar", role_name="student", parent_id=student_exams.menu_id, order_index=1))
        db.add(Menu(title="History", path="/student/exams/history", icon="History", role_name="student", parent_id=student_exams.menu_id, order_index=2))
        
        # Lecturer Menus
        lecturer_courses = Menu(title="Courses", path="/lecturer/courses", icon="Book", role_name="lecturer", order_index=1)
        lecturer_assignments = Menu(title="Assignments", path="/lecturer/assignments", icon="ClipboardList", role_name="lecturer", order_index=2)
        db.add_all([lecturer_courses, lecturer_assignments])

        db.commit()
        print("Menus seeded successfully.")
    except Exception as e:
        print(f"Error seeding menus: {e}")
        db.rollback()

if __name__ == "__main__":
    seed_data()
    # Re-open session or pass it? seed_data closes it.
    # refactor seed_data to call seed_menus or call it separately
    
    # Let's just create a new session
    db = SessionLocal()
    seed_menus(db)
    db.close()
