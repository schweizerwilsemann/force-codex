from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional
from fastapi import HTTPException

from app.repositories.problem_repository import ProblemRepository
from app.schemas import coding as schemas
from app.models import users as user_models
from app.models import coding as models

class ProblemService:
    def __init__(self, db: Session):
        self.repo = ProblemRepository(db)

    def get_problems(self, skip: int, limit: int) -> List[models.Problem]:
        return self.repo.get_problems(skip, limit)

    def get_problem(self, problem_id: UUID) -> models.Problem:
        problem = self.repo.get_problem(problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")
        
        # Inject sample test cases into the response via transient attribute if it's not a Pydantic model response
        # or rely on the endpoint to format it. 
        # But we can set the attribute for Pydantic 'from_attributes' to pick up.
        problem.sample_test_cases = [tc for tc in problem.test_cases if tc.is_sample]
        return problem

    def create_problem(self, problem: schemas.ProblemCreate, current_user: user_models.User) -> models.Problem:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền tạo bài tập")
        
        db_problem = self.repo.create(problem.model_dump())
        db_problem.sample_test_cases = [] # Initialize for schema
        return db_problem

    def update_problem(self, problem_id: UUID, problem: schemas.ProblemCreate, current_user: user_models.User) -> models.Problem:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền sửa bài tập")
        
        db_problem = self.repo.get_problem(problem_id)
        if not db_problem:
            raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
            
        updated = self.repo.update(db_problem, problem.model_dump())
        updated.sample_test_cases = [tc for tc in updated.test_cases if tc.is_sample]
        return updated

    def delete_problem(self, problem_id: UUID, current_user: user_models.User) -> dict:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền xóa bài tập")
        
        db_problem = self.repo.get_problem(problem_id)
        if not db_problem:
             raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
        
        self.repo.delete(db_problem)
        return {"message": "Đã xóa bài tập"}

    # --- Test Cases ---

    def create_test_case(self, problem_id: UUID, test_case: schemas.TestCaseCreate, current_user: user_models.User) -> models.TestCase:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền thêm test case")
        
        if not self.repo.get_problem(problem_id):
             raise HTTPException(status_code=404, detail="Không tìm thấy bài tập")
             
        data = test_case.model_dump()
        data['problem_id'] = problem_id
        return self.repo.create_test_case(data)

    def get_test_cases(self, problem_id: UUID, current_user: user_models.User) -> List[models.TestCase]:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền xem test cases")
        
        return self.repo.get_test_cases(problem_id)

    def delete_test_case(self, test_case_id: UUID, current_user: user_models.User) -> dict:
        if current_user.role and current_user.role.role_name not in ['admin', 'lecturer']:
             raise HTTPException(status_code=403, detail="Không có quyền xóa test case")
        
        test_case = self.repo.get_test_case(test_case_id)
        if not test_case:
             raise HTTPException(status_code=404, detail="Không tìm thấy test case")
        
        self.repo.delete_test_case(test_case)
        return {"message": "Đã xóa test case"}
