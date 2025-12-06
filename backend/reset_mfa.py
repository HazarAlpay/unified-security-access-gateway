from database import SessionLocal
from models import User

def reset_mfa():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            user.is_mfa_enabled = False
            print(f"Resetting MFA for user: {user.username}")
        db.commit()
        print("All users have been reset to MFA Setup mode.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    reset_mfa()
