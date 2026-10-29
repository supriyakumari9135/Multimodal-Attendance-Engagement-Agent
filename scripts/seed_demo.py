import sys
from pathlib import Path

# Add project root to path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.app.core.database import SessionLocal
from backend.app.services.seed_data import init_db, seed_demo_data

def main():
    print("Initializing SQLite database tables...")
    init_db()
    db = SessionLocal()
    try:
        print("Seeding deterministic demo data (14 students, 2 courses, 3 historical sessions)...")
        res = seed_demo_data(db, force_reset=True)
        print(f"Result: {res}")
    finally:
        db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    main()

