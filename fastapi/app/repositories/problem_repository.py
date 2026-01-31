from sqlalchemy.orm import Session
from app.models import coding as models
from uuid import UUID
from typing import List, Optional

class ProblemRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_problems(self, skip: int, limit: int) -> List[models.Problem]:
        return self.db.query(models.Problem).offset(skip).limit(limit).all()

    def get_problem(self, problem_id: UUID) -> Optional[models.Problem]:
        return self.db.query(models.Problem).filter(models.Problem.problem_id == problem_id).first()

    def create(self, problem_data: dict) -> models.Problem:
        db_problem = models.Problem(**problem_data)
        self.db.add(db_problem)
        self.db.commit()
        self.db.refresh(db_problem)
        return db_problem

    def update(self, db_problem: models.Problem, update_data: dict) -> models.Problem:
        for key, value in update_data.items():
            setattr(db_problem, key, value)
        self.db.commit()
        self.db.refresh(db_problem)
        return db_problem

    def delete(self, db_problem: models.Problem) -> None:
        self.db.delete(db_problem)
        self.db.commit()

    # --- Test Cases ---
    def get_test_cases(self, problem_id: UUID) -> List[models.TestCase]:
        return self.db.query(models.TestCase).filter(
            models.TestCase.problem_id == problem_id
        ).order_by(models.TestCase.order_index).all()

    def get_test_case(self, test_case_id: UUID) -> Optional[models.TestCase]:
        return self.db.query(models.TestCase).filter(models.TestCase.test_case_id == test_case_id).first()

    def create_test_case(self, test_case_data: dict) -> models.TestCase:
        db_test_case = models.TestCase(**test_case_data)
        self.db.add(db_test_case)
        self.db.commit()
        self.db.refresh(db_test_case)
        return db_test_case

    def delete_test_case(self, db_test_case: models.TestCase) -> None:
        self.db.delete(db_test_case)
        self.db.commit()
