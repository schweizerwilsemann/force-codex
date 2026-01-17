from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.deps import get_db
from app.models.users import User

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()
