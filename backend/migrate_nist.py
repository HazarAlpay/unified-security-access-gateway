import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import Session
from database import Base
from models import User, SecurityRule, AccessLog, ActiveSession, IpRateLimit, BlacklistedIp, RoleEnum
from utils import get_password_hash, generate_mfa_secret

# Configuration
DATABASE_URL = "sqlite:///./security_gateway.db"

def reset_database():
    print("Starting database reset for NIST Migration...")
    
    # Create engine
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    # Drop all tables
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    # Recreate all tables with new schema
    print("Creating tables with new schema (Likelihood/Impact fields)...")
    Base.metadata.create_all(bind=engine)
    
    # Seed Data
    session = Session(bind=engine)
    try:
        print("Seeding Users...")
        seed_users(session)
        
        print("Seeding NIST Security Rules...")
        seed_rules(session)
        
        session.commit()
        print("Database reset and migration complete.")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        session.rollback()
    finally:
        session.close()

def seed_users(db: Session):
    users = [
        {"username": "admin", "password": "admin123", "role": RoleEnum.ADMIN},
        {"username": "employee", "password": "user123", "role": RoleEnum.EMPLOYEE},
        {"username": "john", "password": "john123", "role": RoleEnum.EMPLOYEE},
    ]
    
    for u in users:
        user = User(
            username=u["username"],
            email=f"{u['username']}@example.com",
            hashed_password=get_password_hash(u["password"]),
            role=u["role"],
            mfa_secret=generate_mfa_secret(),
            is_mfa_enabled=False
        )
        db.add(user)

def seed_rules(db: Session):
    # NIST Rules with Likelihood (1-5) and Impact (1-5)
    rules = [
        {
            "name": "Block North Korea", 
            "field": "country", "operator": "equals", "value": "KP", "action": "BLOCK", 
            "rule_likelihood": 5, "rule_impact": 5 # Risk = 25
        },
        {
            "name": "Suspicious Browser (Kali)", 
            "field": "browser", "operator": "contains", "value": "Kali", "action": "ALERT", 
            "rule_likelihood": 4, "rule_impact": 3 # Risk = 12
        },
        {
            "name": "Non-Business Hours", 
            "field": "hour", "operator": "lt", "value": "6", "action": "MFA", 
            "rule_likelihood": 3, "rule_impact": 2 # Risk = 6
        },
        {
            "name": "Block Test IP", 
            "field": "ip", "operator": "equals", "value": "1.1.1.1", "action": "BLOCK", 
            "rule_likelihood": 5, "rule_impact": 5 # Risk = 25
        },
    ]
    
    for r in rules:
        rule = SecurityRule(
            name=r["name"],
            field=r["field"],
            operator=r["operator"],
            value=r["value"],
            action=r["action"],
            rule_likelihood=r["rule_likelihood"],
            rule_impact=r["rule_impact"],
            is_active=True
        )
        db.add(rule)

if __name__ == "__main__":
    # Ensure we are in backend directory
    if not os.path.exists("security_gateway.db") and not os.path.exists("database.py"):
        print("Please run this script from the backend directory.")
        exit(1)
        
    reset_database()

