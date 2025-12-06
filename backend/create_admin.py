"""
Script to create an admin user for the Unified Security Access Gateway.
"""
import sys
from getpass import getpass

from database import SessionLocal, engine, Base
from models import RoleEnum, User
from utils import generate_mfa_secret, get_password_hash

# Ensure database tables exist
Base.metadata.create_all(bind=engine)


def create_admin_user(username: str, email: str, password: str) -> None:
    """Create an admin user in the database."""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"❌ User '{username}' already exists!")
            if existing_user.role == RoleEnum.ADMIN:
                print(f"   This user is already an admin.")
            else:
                response = input(f"   Update '{username}' to admin role? (y/n): ")
                if response.lower() == 'y':
                    existing_user.role = RoleEnum.ADMIN
                    existing_user.hashed_password = get_password_hash(password)
                    db.commit()
                    print(f"✓ Updated '{username}' to admin with new password.")
                    return
                else:
                    print("Cancelled.")
                    return
        
        # Create new admin user
        admin_user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(password),
            role=RoleEnum.ADMIN,
            mfa_secret=generate_mfa_secret(),
            is_mfa_enabled=False,
            is_locked=False,
            failed_login_attempts=0,
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print(f"\n✓ Admin user '{username}' created successfully!")
        print(f"   Email: {email}")
        print(f"   Role: {admin_user.role.value}")
        print(f"   User ID: {admin_user.id}")
        print(f"\n⚠️  Remember to enable MFA for enhanced security!")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Create an admin user for USAG")
    parser.add_argument("--username", "-u", default="admin", help="Admin username (default: admin)")
    parser.add_argument("--email", "-e", help="Admin email (default: username@example.com)")
    parser.add_argument("--password", "-p", help="Admin password (will prompt if not provided)")
    
    args = parser.parse_args()
    
    username = args.username
    email = args.email or f"{username}@example.com"
    
    if args.password:
        password = args.password
    else:
        print("=" * 60)
        print("Create Admin User - Unified Security Access Gateway")
        print("=" * 60)
        print()
        password = getpass("Enter admin password: ").strip()
        if not password:
            print("❌ Password cannot be empty!")
            sys.exit(1)
        password_confirm = getpass("Confirm admin password: ").strip()
        if password != password_confirm:
            print("❌ Passwords do not match!")
            sys.exit(1)
        print()
    
    create_admin_user(username, email, password)


