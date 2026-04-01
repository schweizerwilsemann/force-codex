"""
One-shot: fill table `menus` with per-course submenu rows for all courses in the DB.

Uses the same paths and titles as MenuService._ensure_role_course_menus (single source in code).

Run from repo (with venv + DATABASE_URL set), e.g.:
  cd fastapi && python scripts/backfill_course_menus.py

Requires root menu rows: /student/courses (student), /admin/courses, /lecturer/courses.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Register all SQLAlchemy mappers before any query (same as alembic/env.py).
from app.models.roles import Role  # noqa: F401
from app.models.tokens import RefreshToken  # noqa: F401
from app.models.users import User, Student, Lecturer, InitialPassword  # noqa: F401
from app.models.menus import Menu  # noqa: F401
from app.models import coding  # noqa: F401

from app.db.database import SessionLocal
from app.services.menu_service import MenuService


def main() -> None:
    db = SessionLocal()
    try:
        svc = MenuService(db)
        result = svc.backfill_course_menus_from_db(commit=True)
        print(f"Courses processed: {result['courses_seen']}")
        miss = result["missing_parent_menus"]
        if miss:
            print("WARN: Missing parent menu roots (subtrees for these are skipped until you add them):")
            for line in miss:
                print(f"  - {line}")
        else:
            print("OK: Parent roots present for student, admin, lecturer.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
