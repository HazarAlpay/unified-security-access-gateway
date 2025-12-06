import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
import pyotp
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import ActiveSession, User

SECRET_KEY = os.environ.get("USAG_SECRET_KEY", "change-this-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("USAG_TOKEN_EXPIRE_MINUTES", "30"))

ISSUER = "Unified Security Access Gateway"
security = HTTPBearer(auto_error=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Validate a plaintext password against the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    Generate a signed JWT containing the provided payload.
    Expiration defaults to ACCESS_TOKEN_EXPIRE_MINUTES if not supplied.
    """
    to_encode = data.copy()
    expire_delta = expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expire_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode a JWT and return its payload, raising on invalid tokens."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except InvalidTokenError as exc:
        raise ValueError("Invalid or expired token") from exc


def get_user_from_token_string(token: str, db: Session) -> Optional[User]:
    """
    Manual user extraction from token string without HTTPBearer dependency.
    Useful for WebSockets where headers are not available.
    """
    try:
        payload = decode_token(token)
    except ValueError:
        return None
    
    username = payload.get("sub")
    if not username:
        return None

    return db.query(User).filter(User.username == username).first()

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Return the authenticated user when a bearer token is supplied."""
    if not credentials:
        return None

    token = credentials.credentials

    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject"
        )

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # --- ENFORCE SESSION VALIDATION ---
    # Even if the JWT is valid, we must check if the session exists in the DB.
    # This allows admins to "Kill" sessions effectively.
    
    # In a real prod env behind proxies, consider X-Forwarded-For, but local is fine.
    # For testing backdoor in auth.py, we rely on request.client.host or the header.
    # But here let's duplicate the logic or just use the simple approach for now.
    
    # To keep it simple and robust, we will just check request.client.host.
    # If you enabled the X-Test-IP backdoor in auth.py, this logic might mismatch 
    # if we don't duplicate the `_get_ip` logic here. 
    # However, since the backdoor is commented out by default, we proceed with standard IP.
    
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")

    # Special case: MFA Setup flow uses a temp token which might not have an active session yet?
    # Actually, our ActiveSession is created AFTER login/MFA success. 
    # BUT: The 'get_current_user' is used by PROTECTED routes (Admin Dashboard).
    # The /mfa/setup and /mfa/verify routes use '_get_user_from_temp_token' usually, 
    # EXCEPT if they rely on Depends(get_current_user).
    
    # Let's check usage:
    # /mfa/setup -> Depends(get_current_user)
    # /mfa/verify -> Depends(get_current_user)
    
    # PROBLEM: When hitting /mfa/setup or /mfa/verify, the user DOES NOT have an ActiveSession yet!
    # They only get one AFTER /mfa/verify succeeds.
    # So we must SKIP this check if the token purpose is "mfa" (temp token).
    
    if payload.get("purpose") == "mfa":
        return user

    # For regular access tokens (purpose is missing or not "mfa"):
    session_exists = db.query(ActiveSession).filter(
        ActiveSession.user_id == user.id,
        ActiveSession.ip_address == client_ip,
        ActiveSession.user_agent == user_agent
    ).first()

    if not session_exists:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session terminated by admin or expired."
        )

    return user


def generate_mfa_secret() -> str:
    """Produce a new random MFA secret for TOTP."""
    return pyotp.random_base32()


def get_mfa_uri(secret: str, username: str) -> str:
    """Return the provisioning URI compatible with authenticator apps."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name=ISSUER)


def verify_totp(secret: str, code: str) -> bool:
    """Validate a provided TOTP code within a small time window."""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)

