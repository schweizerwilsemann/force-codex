# ForceCodeX

ForceCodeX is a lightweight coding-practice platform designed for 1st- and 2nd-year university students learning Data Structures & Algorithms (DSA) and Object-Oriented Programming (OOP). The project is structured like popular platforms (LeetCode / HackerRank) so students can practice, submit, and test solutions locally.

## Who is this for

- Students in early CS coursework learning DSA and OOP.
- Instructors or TAs who want a local, extensible playground for assignments and practice problems.

## Features

- **Coding System**: Solve algorithms in C/C++ with a real-time Monaco Editor.
- **Auto-grading**: Local `judge-worker` executes code using `subprocess` (secure sandbox planned) and verifies against test cases.
- **Full-Stack**: FastAPI backend with SQLAlchemy/Postgres, Next.js frontend with React Query.

## Tech stack

- **Backend**: FastAPI, Postgres, Redis, SQLAlchemy
- **Frontend**: Next.js, Yarn, Monaco Editor, SASS
- **Worker**: Python, Redis Queue, GCC/G++

## Quick start

### Prerequisites
- Python 3.10+
- Node.js & Yarn
- Postgres Database
- Redis Server (for job queue)
- GCC/G++ (for executing C/C++ code)

### 1. Backend Setup

```bash
cd fastapi
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies (includes redis, sqlalchemy, psycopg2)
pip install -r requirements.txt

# Run Database Migrations / Create Tables (Auto-created on start for now)
# python -m app.main 

# Start API Server
uvicorn app.main:app --reload
```

### 2. Judge Worker Setup (Required for Code Execution)

Open a new terminal:
```bash
cd judge-worker
# Ensure you are in the same venv or install dependencies
source ../fastapi/venv/bin/activate

# Run the worker
python worker.py
```

### 3. Frontend Setup

Open a new terminal:
```bash
cd frontend
# Install dependencies
yarn install

# Start Dev Server
yarn dev
```

Visit `http://localhost:3000` to access the application.

## Seed Data

To populate the database with a sample "A+B Problem" and test users:

```bash
cd judge-worker
python test_submit.py
```

## Running tests

```bash
cd fastapi
pytest
```

## Test Accounts

A default admin account is created by running the seed script:
- **Email:** `admin@example.com`
- **Password:** `admin123`

### Lecturer
- **Email:** `lecturer@example.com`
- **Password:** `lecturer123`

### Student
- **Email:** `student@example.com`
- **Password:** `student123`
- **Student Code:** `STU001`

## License
MIT
