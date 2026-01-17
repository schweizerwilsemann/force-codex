from fastapi import FastAPI
from app.routes import users
from app.db.database import engine, Base

Base.metadata.create_all(bind=engine)
app = FastAPI(title="ForceCodeX API")

app.include_router(users.router)

@app.get("/")
def read_root():
    return {"message": "Connected to ForceCodeX database!"}
