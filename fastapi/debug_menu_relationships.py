from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.menus import Menu
from app.core.config import settings

# Setup DB connection
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def debug_menus():
    print("Querying menus...")
    menus = db.query(Menu).filter(Menu.parent_id == None).all()
    
    for menu in menus:
        print(f"ID: {menu.menu_id}, Title: {menu.title}, Role: {menu.role_name}")
        print(f"Children type: {type(menu.children)}")
        print(f"Children value: {menu.children}")
        if menu.children is None:
            print("WARNING: Children is None!")
        else:
            print(f"Children count: {len(menu.children)}")
        print("-" * 20)

if __name__ == "__main__":
    try:
        debug_menus()
    finally:
        db.close()
