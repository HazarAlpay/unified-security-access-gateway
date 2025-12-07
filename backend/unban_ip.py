"""
Script to unban IP addresses from the blacklist.
Useful when you've accidentally banned your own IP.
"""
import sys
import os
from database import SessionLocal, engine, Base
from models import BlacklistedIp

# Ensure database tables exist
Base.metadata.create_all(bind=engine)


def list_banned_ips():
    """List all currently banned IP addresses."""
    db = SessionLocal()
    try:
        banned_ips = db.query(BlacklistedIp).all()
        
        if not banned_ips:
            print("✓ No IP addresses are currently banned.")
            return []
        
        print("\n" + "=" * 70)
        print("BANNED IP ADDRESSES")
        print("=" * 70)
        for ip in banned_ips:
            print(f"  IP: {ip.ip_address:<20} Reason: {ip.reason}")
            print(f"       Banned by: {ip.banned_by or 'System':<20} Date: {ip.banned_at}")
            print("-" * 70)
        
        return banned_ips
    finally:
        db.close()


def unban_ip(ip_address: str):
    """Unban a specific IP address."""
    db = SessionLocal()
    try:
        banned_ip = db.query(BlacklistedIp).filter(BlacklistedIp.ip_address == ip_address).first()
        
        if not banned_ip:
            print(f"❌ IP {ip_address} is not in the blacklist.")
            return False
        
        db.delete(banned_ip)
        db.commit()
        print(f"✓ IP {ip_address} has been unbanned successfully!")
        return True
    except Exception as e:
        print(f"❌ Error unbanning IP: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def unban_all():
    """Unban all IP addresses."""
    db = SessionLocal()
    try:
        banned_ips = db.query(BlacklistedIp).all()
        
        if not banned_ips:
            print("✓ No IP addresses to unban.")
            return
        
        count = len(banned_ips)
        for ip in banned_ips:
            db.delete(ip)
        
        db.commit()
        print(f"✓ Successfully unbanned {count} IP address(es).")
    except Exception as e:
        print(f"❌ Error unbanning IPs: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Unban IP addresses from the blacklist")
    parser.add_argument(
        "--ip",
        type=str,
        help="Specific IP address to unban",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Unban all IP addresses",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all banned IP addresses",
    )
    args = parser.parse_args()

    # Ensure we are in backend directory
    if not os.path.exists("database.py"):
        print("❌ Error: Please run this script from the backend directory.")
        sys.exit(1)

    if args.list:
        list_banned_ips()
    elif args.all:
        print("⚠️  WARNING: This will unban ALL IP addresses!")
        confirm = input("Are you sure? (yes/no): ")
        if confirm.lower() == "yes":
            unban_all()
        else:
            print("Cancelled.")
    elif args.ip:
        unban_ip(args.ip)
    else:
        # Interactive mode
        print("\n" + "=" * 70)
        print("IP UNBAN UTILITY")
        print("=" * 70)
        
        banned_ips = list_banned_ips()
        
        if banned_ips:
            print("\nOptions:")
            print("  1. Unban a specific IP")
            print("  2. Unban all IPs")
            print("  3. Exit")
            
            choice = input("\nEnter your choice (1-3): ").strip()
            
            if choice == "1":
                ip_to_unban = input("Enter the IP address to unban: ").strip()
                if ip_to_unban:
                    unban_ip(ip_to_unban)
                else:
                    print("❌ No IP address provided.")
            elif choice == "2":
                confirm = input("⚠️  Are you sure you want to unban ALL IPs? (yes/no): ")
                if confirm.lower() == "yes":
                    unban_all()
                else:
                    print("Cancelled.")
            else:
                print("Exiting...")
        else:
            print("\nNo action needed.")

