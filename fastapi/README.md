# ⚡ ForceCodeX FastAPI Backend

A lightweight and extensible **FastAPI** backend built with modern Python (3.14+) and PostgreSQL.
Supports UUIDv7 identifiers, SQLAlchemy ORM, and modular routing.

---

## 🚀 Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/yourname/ForceCodeX.git
cd ForceCodeX/fastapi
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Environment Variables
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/FORCECODEX

### 3. Project structure

fastapi/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entry point
│   ├── database.py          # SQLAlchemy DB connection
│   ├── deps.py              # Dependency injection
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py          # User ORM model
│   └── routers/
│       ├── __init__.py
│       └── users.py         # User routes (GET, POST, etc.)
├── .env                     # Environment variables
├── requirements.txt
└── README.md
