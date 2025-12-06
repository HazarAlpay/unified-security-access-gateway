from database import Base, engine
import models  # noqa: F401

def init_database() -> None:
    """Drop and create all database tables to ensure schema sync."""
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_database()
    print("Database initialized.")
