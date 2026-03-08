from fastapi import FastAPI
from app.api.v1.endpoints import users, auth, menus, coding, courses, classes, assignments, enrollments
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

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.requests import Request
import logging

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.error(f"Validation error: {exc.body}")
    logging.error(f"Errors: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
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
        allow_origins=["http://localhost:3000","http://localhost:8000", "http://[IP_ADDRESS]", "http://[IP_ADDRESS]"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(menus.router, prefix=f"{settings.API_V1_STR}/menus", tags=["menus"])
app.include_router(coding.router, prefix=f"{settings.API_V1_STR}/coding", tags=["coding"])
app.include_router(courses.router, prefix=f"{settings.API_V1_STR}/courses", tags=["courses"])
app.include_router(classes.router, prefix=f"{settings.API_V1_STR}/classes", tags=["classes"])
app.include_router(assignments.router, prefix=f"{settings.API_V1_STR}/assignments", tags=["assignments"])
app.include_router(enrollments.router, prefix=f"{settings.API_V1_STR}/enrollments", tags=["enrollments"])

@app.get("/")
def read_root():
    return {"message": "Welcome to ForceCodeX API"}
