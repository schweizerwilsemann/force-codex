from fastapi import FastAPI
from app.routers import users, auth, menus, coding
from app.models import coding as coding_models # Register models
from app.db.database import engine, Base
from app.core.config import settings

# Create tables (if using simple synchronous engine without migrations for now)
# Ideally we should use Alembic
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

from fastapi.middleware.cors import CORSMiddleware

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
elif True: # Fallback for development if not in settings yet
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:8000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(menus.router, prefix=f"{settings.API_V1_STR}/menus", tags=["menus"])
app.include_router(coding.router, prefix=f"{settings.API_V1_STR}/coding", tags=["coding"])

@app.get("/")
def read_root():
    return {"message": "Welcome to ForceCodeX API"}
