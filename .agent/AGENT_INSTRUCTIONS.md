# Agent Instructions for ForceCodeX

This document provides instructions on how to develop, run, and maintain the `ForceCodeX` project.

## Project Structure
- `fastapi/`: Backend application (FastAPI)
- `frontend/`: Frontend application (Next.js)
- `tests/`: Backend tests

## Environment Setup

### Virtual Environment
Always use the virtual environment located at `fastapi/venv`.
To run commands using the venv without activation:
```bash
./fastapi/venv/bin/<command>
# Example:
./fastapi/venv/bin/pip list
./fastapi/venv/bin/uvicorn app.main:app --reload
```

### Database
The project uses PostgreSQL 18.
- **Connection**: Check `.env` (default is often localhost:5432).
- **Client**: Use `psql` for manual database interactions.
  ```bash
  psql -h localhost -U postgres -d forcecodex
  ```
- **Seeding**: Use `python seed_db.py` to create initial roles and admin user.

## Running the Application

### Backend
1. Navigate to `fastapi/` directory.
2. Run using `venv` python:
   ```bash
   venv/bin/python3 -m uvicorn app.main:app --reload
   ```

### Frontend
1. Navigate to `frontend/` directory.
2. Run development server using bun instead of npm:
   ```bash
   bun dev
   ```

## Verification & Testing
- **Backend Tests**:
  Located in `fastapi/tests/`.
  Run using `unittest` (as `pytest` might have path issues):
  ```bash
  PYTHONPATH=. venv/bin/python3 tests/test_auth_flow.py
  ```

## Common Tasks
- **Updating Dependencies**:
  Always update `requirements.txt` after installing new packages:
  ```bash
  venv/bin/pip freeze > requirements.txt
  ```

- **Authentication**:
  The system uses JWT. `app/core/security.py` handles hashing (using direct `bcrypt`) and token generation (`jose`).

- **User Management**:
  Admin users can create other users (Students/Lecturers) via the API or Frontend Admin Dashboard.
