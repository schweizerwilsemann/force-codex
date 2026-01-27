import sys
import os

# Add parent dir to path
sys.path.append(os.getcwd())

from app.db.database import engine, Base
from app.models import tokens
from app.models import users # Load User model for FK

def create_tables():
    print("Creating refresh_tokens table...")
    tokens.RefreshToken.__table__.create(bind=engine, checkfirst=True)
    print("Done.")

if __name__ == "__main__":
    create_tables()
