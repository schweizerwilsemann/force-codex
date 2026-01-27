import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import sys
import os

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db.database import Base, get_db
from app.core import security
from app.models import users as user_models
from app.models import roles as role_models
from app.models import tokens as token_models

class TestAuthFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Setup in-memory DB for testing
        cls.SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
        cls.engine = create_engine(
            cls.SQLALCHEMY_DATABASE_URL,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

        Base.metadata.create_all(bind=cls.engine)
        
        # Override get_db
        def override_get_db():
            try:
                db = cls.TestingSessionLocal()
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)
        
        
        # Create Admin User
        db = cls.TestingSessionLocal()
        role = role_models.Role(role_id=1, role_name="admin")
        db.add(role)
        role_student = role_models.Role(role_id=2, role_name="student")
        db.add(role_student)
        role_lecturer = role_models.Role(role_id=3, role_name="lecturer") # Ensure all roles exist
        db.add(role_lecturer)

        admin = user_models.User(
            email="admin@example.com",
            password_hash=security.get_password_hash("admin"),
            full_name="Admin User",
            role_id=1,
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.close()

    def test_01_login(self):
        response = self.client.post(
            "/api/v1/auth/login",
            data={"username": "admin@example.com", "password": "admin"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.json())
        self.__class__.token = response.json()["access_token"]

    def test_02_create_student(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = self.client.post(
            "/api/v1/users/",
            headers=headers,
            json={
                "email": "student@example.com",
                "full_name": "New Student",
                "role_name": "student",
                "student_code": "ST001",
                "class_name": "CS101"
            },
        )
        if response.status_code != 200:
            print(response.json())
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], "student@example.com")

    def test_03_get_users(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        response = self.client.get("/api/v1/users/", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()), 2) # Admin + Student

    def test_04_refresh_token(self):
        # Login to get refresh token
        login_response = self.client.post(
            "/api/v1/auth/login",
            data={"username": "admin@example.com", "password": "admin"},
        )
        self.assertEqual(login_response.status_code, 200)
        data = login_response.json()
        self.assertIn("refresh_token", data)
        refresh_token = data["refresh_token"]

        # Use refresh token
        response = self.client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        self.assertEqual(response.status_code, 200)
        new_data = response.json()
        self.assertIn("access_token", new_data)
        self.assertNotEqual(data["access_token"], new_data["access_token"])

if __name__ == "__main__":
    unittest.main()
