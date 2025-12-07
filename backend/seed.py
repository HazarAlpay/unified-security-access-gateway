"""
Script to seed test users for the Unified Security Access Gateway.
Creates a variety of test users with different roles and configurations.
"""
import sys
from database import SessionLocal, engine, Base
from models import RoleEnum, User
from utils import generate_mfa_secret, get_password_hash

# Ensure database tables exist
Base.metadata.create_all(bind=engine)


def seed_test_users(clear_existing: bool = False) -> None:
    """Create test users in the database."""
    db = SessionLocal()
    try:
        if clear_existing:
            print("⚠️  Clearing existing users...")
            db.query(User).delete()
            db.commit()
            print("✓ Existing users cleared.\n")

        # Define test users
        test_users = [
            {
                "username": "admin",
                "email": "admin@test.com",
                "password": "admin123",
                "role": RoleEnum.ADMIN,
                "mfa_enabled": False,
            },
            {
                "username": "admin2",
                "email": "admin2@test.com",
                "password": "admin123",
                "role": RoleEnum.ADMIN,
                "mfa_enabled": False,
            },
            {
                "username": "employee1",
                "email": "employee1@test.com",
                "password": "user123",
                "role": RoleEnum.EMPLOYEE,
                "mfa_enabled": False,
            },
            {
                "username": "employee2",
                "email": "employee2@test.com",
                "password": "user123",
                "role": RoleEnum.EMPLOYEE,
                "mfa_enabled": False,
            },
            {
                "username": "john",
                "email": "john.doe@test.com",
                "password": "john123",
                "role": RoleEnum.EMPLOYEE,
                "mfa_enabled": False,
            },
            {
                "username": "jane",
                "email": "jane.smith@test.com",
                "password": "jane123",
                "role": RoleEnum.EMPLOYEE,
                "mfa_enabled": False,
            },
            {
                "username": "testuser",
                "email": "testuser@test.com",
                "password": "test123",
                "role": RoleEnum.EMPLOYEE,
                "mfa_enabled": False,
            },
            {
                "username": "locked_user",
                "email": "locked@test.com",
                "password": "locked123",
                "role": RoleEnum.EMPLOYEE,
                "mfa_enabled": False,
                "is_locked": True,
                "failed_login_attempts": 5,
            },
        ]

        created_count = 0
        skipped_count = 0
        updated_count = 0

        for user_data in test_users:
            username = user_data["username"]
            email = user_data["email"]
            
            # Check if user already exists
            existing_user = db.query(User).filter(
                (User.username == username) | (User.email == email)
            ).first()
            
            if existing_user:
                if existing_user.username == username:
                    print(f"⏭️  User '{username}' already exists. Skipping...")
                else:
                    print(f"⏭️  Email '{email}' already exists. Skipping...")
                skipped_count += 1
                continue

            # Create new user
            new_user = User(
                username=username,
                email=email,
                hashed_password=get_password_hash(user_data["password"]),
                role=user_data["role"],
                mfa_secret=generate_mfa_secret(),
                is_mfa_enabled=user_data.get("mfa_enabled", False),
                is_locked=user_data.get("is_locked", False),
                failed_login_attempts=user_data.get("failed_login_attempts", 0),
            )

            db.add(new_user)
            created_count += 1

        db.commit()

        # Print summary
        print("\n" + "=" * 60)
        print("SEED SUMMARY")
        print("=" * 60)
        print(f"✓ Created: {created_count} users")
        print(f"⏭️  Skipped: {skipped_count} users (already exist)")
        print(f"📊 Total test users available: {db.query(User).count()}")
        print("=" * 60)
        print("\n📝 Test User Credentials:")
        print("-" * 60)
        for user_data in test_users:
            print(f"  Username: {user_data['username']:<15} Password: {user_data['password']:<10} Role: {user_data['role'].value}")
        print("-" * 60)
        print("\n⚠️  Note: These are test credentials. Change passwords in production!")

    except Exception as e:
        print(f"\n❌ Error seeding users: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed test users for the security gateway")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear all existing users before seeding (use with caution!)",
    )
    args = parser.parse_args()

    # Ensure we are in backend directory
    import os
    if not os.path.exists("database.py"):
        print("❌ Error: Please run this script from the backend directory.")
        sys.exit(1)

    seed_test_users(clear_existing=args.clear)

