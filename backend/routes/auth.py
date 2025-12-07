from datetime import datetime, timezone
import os
import requests
from dotenv import load_dotenv

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import ActiveSession, User, IpRateLimit, BlacklistedIp
from schemas import (
    LoginInitResponse,
    LoginResponse,
    MFASetupResponse,
    MFAVerifyRequest,
    TempTokenRequest,
    UserLogin,
)
from services.geoip import calculate_distance, get_location_from_ip
from services.logger import log_event
from services.rule_engine import RuleEngine
from services.websocket_manager import manager
from utils import (
    create_access_token,
    decode_token,
    generate_mfa_secret,
    get_mfa_uri,
    get_current_user,
    verify_password,
    verify_totp,
)

# Load environment variables
load_dotenv()
RECAPTCHA_SECRET_KEY = os.getenv("RECAPTCHA_SECRET_KEY")

router = APIRouter(tags=["auth"])

TEMP_TOKEN_PURPOSE = "mfa"
MAX_FAILED_ATTEMPTS = 3


def _get_ip(request: Request) -> str:
    # UNCOMMENT THE LINES BELOW TO ENABLE IP SPOOFING FOR TESTING (IMPOSSIBLE TRAVEL)
    # test_ip = request.headers.get("X-Test-IP")
    # if test_ip:
    #     print(f"DEBUG: Spoofed IP detected: {test_ip}")
    #     return test_ip
    return request.client.host if request.client else "unknown"


def _get_user_from_temp_token(temp_token: str, db: Session) -> User:
    try:
        payload = decode_token(temp_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)
        ) from exc

    if payload.get("purpose") != TEMP_TOKEN_PURPOSE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token purpose"
        )

    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token missing subject"
        )

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return user


def _create_active_session(db: Session, user: User, ip: str, ua: str):
    # Helper to create session record or update existing one
    loc_data = get_location_from_ip(ip)
    location_str = f"{loc_data.get('city', 'Unknown')}, {loc_data.get('country', 'Unknown')}"
    
    existing_session = db.query(ActiveSession).filter(
        ActiveSession.user_id == user.id,
        ActiveSession.ip_address == ip,
        ActiveSession.user_agent == ua
    ).first()

    if existing_session:
        existing_session.last_activity = datetime.now(timezone.utc)
        existing_session.location = location_str # Update location just in case
        db.commit()
        return

    new_session = ActiveSession(
        user_id=user.id,
        ip_address=ip,
        user_agent=ua,
        location=location_str
    )
    db.add(new_session)
    db.commit()

@router.post("/logout")
async def logout(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ip = _get_ip(request)
    ua = request.headers.get("user-agent")
    
    # Find and delete specific session matching user, IP, and UA
    db.query(ActiveSession).filter(
        ActiveSession.user_id == user.id,
        ActiveSession.ip_address == ip,
        ActiveSession.user_agent == ua
    ).delete()
    
    db.commit()

    # Broadcast session update to admins
    await manager.broadcast_to_admins({"type": "SESSION_UPDATE"}, db)

    return {"message": "Logged out successfully"}

@router.post("/login", response_model=LoginInitResponse)
async def login(
    credentials: UserLogin, request: Request, db: Session = Depends(get_db)
) -> LoginInitResponse:
    ip_address = _get_ip(request)
    
    # Check Blacklist
    banned_ip = db.query(BlacklistedIp).filter(BlacklistedIp.ip_address == ip_address).first()
    if banned_ip:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"IP Address Banned: {banned_ip.reason}"
        )

    user = db.query(User).filter(User.username == credentials.username).first()
    
    # Check Account Lock
    if user and user.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account Locked by Admin. Contact support."
        )

    user_agent = request.headers.get("user-agent")
    
    # --- SECURITY RULE ENGINE CHECK ---
    current_time = datetime.now(timezone.utc)
    current_location = get_location_from_ip(ip_address)
    
    rule_context = {
        "ip": ip_address,
        "country": current_location.get("country", "Unknown"),
        "hour": current_time.hour,
        "browser": user_agent,
        "role": user.role.value if user and user.role else "unknown",
    }
    
    rule_actions, rule_likelihood, rule_impact = RuleEngine.evaluate(rule_context, db)
    
    # Base Risk (Likelihood=1, Impact=1) -> Lowest Score 1
    base_likelihood = 1
    base_impact = 1

    # Update base risk with rule findings (High Watermark)
    base_likelihood = max(base_likelihood, rule_likelihood)
    base_impact = max(base_impact, rule_impact)

    current_risk_score = base_likelihood * base_impact

    if "BLOCK" in rule_actions:
        await log_event(
            db=db,
            user_id=user.id if user else None,
            ip=ip_address,
            action="RULE_BLOCK",
            status="BLOCKED",
            risk_score=current_risk_score,
            likelihood=base_likelihood,
            impact=base_impact,
            details={
                "reason": "security_rule_block", 
                "rule_actions": rule_actions,
                "likelihood": base_likelihood, 
                "impact": base_impact
            }
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Blocked by Security Rule."
        )
        
    force_mfa_by_rule = "MFA" in rule_actions
    if "ALERT" in rule_actions:
         await log_event(
            db=db,
            user_id=user.id if user else None,
            ip=ip_address,
            action="RULE_ALERT",
            status="WARNING",
            risk_score=current_risk_score,
            likelihood=base_likelihood,
            impact=base_impact,
            details={
                "reason": "security_rule_alert", 
                "rule_actions": rule_actions,
                "likelihood": base_likelihood, 
                "impact": base_impact
            }
        )
    # ----------------------------------

    # IP Rate Limiting
    ip_record = db.query(IpRateLimit).filter(IpRateLimit.ip_address == ip_address).first()
    if not ip_record:
        ip_record = IpRateLimit(ip_address=ip_address)
        db.add(ip_record)
        db.commit()
        db.refresh(ip_record)

    # Determine if CAPTCHA is required
    # Strict IP-based Brute Force Protection to prevent username enumeration
    # We trigger ONLY on IP failures.
    ip_failed_attempts = ip_record.failure_count
    captcha_required = ip_failed_attempts >= MAX_FAILED_ATTEMPTS

    # Verify CAPTCHA if required
    if captcha_required:
        # If RECAPTCHA_SECRET_KEY is not configured, skip verification (for development/testing)
        if not RECAPTCHA_SECRET_KEY:
            print("⚠️  WARNING: RECAPTCHA_SECRET_KEY not configured. Skipping captcha verification.")
            # Log that captcha was required but skipped
            await log_event(
                db=db,
                user_id=user.id if user else None,
                ip=ip_address,
                action="CAPTCHA_SKIP",
                status="WARNING",
                risk_score=15,
                details={"reason": "captcha_not_configured", "user_agent": user_agent},
            )
            # Continue without captcha verification (development mode)
        else:
            # Captcha is configured, require token
            if not credentials.captcha_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={"message": "Too many failed attempts", "captcha_required": True}
                )
            
            # Verify Captcha
            print("Verifying Captcha Token...")
            masked_secret = RECAPTCHA_SECRET_KEY[:5] + "..." if RECAPTCHA_SECRET_KEY else "None"
            print(f"Secret Key Loaded: {masked_secret}")
            
            try:
                response = requests.post(
                    "https://www.google.com/recaptcha/api/siteverify",
                    data={
                        "secret": RECAPTCHA_SECRET_KEY,
                        "response": credentials.captcha_token
                    },
                    timeout=10
                )
                print(f"Google Response: {response.text}")
                result = response.json()
                
                if not result.get("success"):
                    error_codes = result.get("error-codes", [])
                    print(f"Captcha Verification Failed. Error codes: {error_codes}")
                    
                    await log_event(
                        db=db,
                        user_id=user.id if user else None,
                        ip=ip_address,
                        action="CAPTCHA_FAIL",
                        status="FAILURE",
                        risk_score=50,
                        details={"reason": "bot_verification_failed", "error_codes": error_codes, "user_agent": user_agent},
                    )
                    
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail={"message": "Captcha failed", "captcha_required": True}
                    )
            except requests.RequestException as e:
                print(f"Captcha Request Error: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail={"message": "Captcha verification service unavailable", "captcha_required": True}
                )

    # Impossible Travel Logic
    # current_location and current_time defined above
    
    # Base Risk (Likelihood=1, Impact=1) -> Lowest Score 1
    # We start with the rule-based risk and then take the MAX with other factors.
    current_likelihood = base_likelihood
    current_impact = base_impact
    mfa_reason = None

    if user and user.last_login_at and user.last_latitude is not None:
        distance_km = calculate_distance(
            user.last_latitude,
            user.last_longitude,
            current_location["lat"],
            current_location["lon"],
        )
        
        # Time delta in hours
        # Ensure last_login_at is timezone-aware (UTC) before subtraction
        last_login_at = user.last_login_at
        if last_login_at.tzinfo is None:
            last_login_at = last_login_at.replace(tzinfo=timezone.utc)

        time_delta = current_time - last_login_at
        time_delta_hours = time_delta.total_seconds() / 3600.0
        
        # Avoid division by zero
        if time_delta_hours < 0.01:
            speed_kmh = distance_km / 0.01
        else:
            speed_kmh = distance_km / time_delta_hours

        # BLOCKING RULE: Impossible Travel
        # NIST: Likelihood=5 (Almost Certain), Impact=5 (Critical) -> Risk=25
        if speed_kmh > 900 and distance_km > 500:
            imp_travel_risk = 25
            await log_event(
                db=db,
                user_id=user.id,
                ip=ip_address,
                action="IMPOSSIBLE_TRAVEL",
                status="BLOCKED",
                risk_score=imp_travel_risk,
                likelihood=5,
                impact=5,
                details={
                    "speed_kmh": round(speed_kmh, 2),
                    "distance_km": round(distance_km, 2),
                    "prev_loc": {"lat": user.last_latitude, "lon": user.last_longitude},
                    "curr_loc": current_location,
                    "user_agent": user_agent,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Suspicious travel activity detected. Login blocked.",
            )
        
        # ADAPTIVE RULE: Location Change
        # NIST: Likelihood=3 (Possible), Impact=2 (Minor) -> Risk=6
        if distance_km > 50:
            current_likelihood = max(current_likelihood, 3)
            current_impact = max(current_impact, 2)
            mfa_reason = "location_change"

    if not user or not verify_password(credentials.password, user.hashed_password):
        # Increment failures
        if user:
            user.failed_login_attempts += 1
        
        ip_record.failure_count += 1
        db.commit()
        
        # Re-evaluate captcha requirement
        new_ip_failed = ip_record.failure_count
        is_captcha_now_required = new_ip_failed >= MAX_FAILED_ATTEMPTS

        # NIST: Bad Password
        # Likelihood=3 (Possible), Impact=3 (Moderate) -> Risk=9
        fail_likelihood = 3
        fail_impact = 3
        
        # Combine with rule risk
        final_likelihood = max(fail_likelihood, base_likelihood)
        final_impact = max(fail_impact, base_impact)
        final_risk = final_likelihood * final_impact

        await log_event(
            db=db,
            user_id=user.id if user else None,
            ip=ip_address,
            action="LOGIN_ATTEMPT",
            status="FAILURE",
            risk_score=final_risk,
            likelihood=final_likelihood,
            impact=final_impact,
            details={
                "reason": "bad_credentials", 
                "user_agent": user_agent, 
                "ip_failed_attempts": new_ip_failed
            },
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"message": "Invalid credentials", "captcha_required": is_captcha_now_required}
        )

    # Reset failed attempts on successful password verification
    if user.failed_login_attempts > 0:
        user.failed_login_attempts = 0
    
    if ip_record.failure_count > 0:
        ip_record.failure_count = 0
        
    db.commit()

    # Simplified MFA Logic: Only ask if NOT set up.
    if user.is_mfa_enabled:
        # Strict Context Matching: IP AND User-Agent must match
        is_trusted = (
            user.last_known_ip == ip_address and 
            user.last_user_agent == user_agent and
            mfa_reason != "location_change" and
            not force_mfa_by_rule
        )

        if is_trusted:
            # Skip MFA - Trusted Login
            # NIST: Likelihood=1, Impact=1 -> Risk=1
            # Or inherit from rules if they alerted but didn't block/MFA
            final_likelihood = base_likelihood
            final_impact = base_impact
            final_risk = final_likelihood * final_impact

            # Update location info
            user.last_latitude = current_location["lat"]
            user.last_longitude = current_location["lon"]
            user.last_login_at = current_time
            db.commit()

            _create_active_session(db, user, ip_address, user_agent)
            # Broadcast session update
            await manager.broadcast_to_admins({"type": "SESSION_UPDATE"}, db)

            await log_event(
                db=db,
                user_id=user.id,
                ip=ip_address,
                action="LOGIN_SUCCESS",
                status="SUCCESS",
                risk_score=final_risk,
                likelihood=final_likelihood,
                impact=final_impact,
                details={"mfa": "skipped_trusted_device", "user_agent": user_agent},
            )

            token_payload = {"sub": user.username, "role": getattr(user.role, "value", user.role)}
            access_token = create_access_token(token_payload)

            return {
                "mfa_required": False,
                "temp_token": None,
                "is_mfa_setup": True,
                "access_token": access_token,
                "token_type": "bearer",
                "role": getattr(user.role, "value", user.role),
            }
        
        # Untrusted Context (New IP or New Browser) -> Fallthrough to MFA Required

    # MFA Required (First Time Setup OR Untrusted Context)
    # NIST: New Context -> Likelihood=3, Impact=2 -> Risk=6
    # Or use calculated risk from rules/location
    mfa_req_likelihood = max(current_likelihood, 3)
    mfa_req_impact = max(current_impact, 2)
    mfa_req_risk = mfa_req_likelihood * mfa_req_impact

    await log_event(
        db=db,
        user_id=user.id,
        ip=ip_address,
        action="LOGIN_INIT",
        status="MFA_REQ",
        risk_score=mfa_req_risk,
        likelihood=mfa_req_likelihood,
        impact=mfa_req_impact,
        details={"mfa_required": True, "reason": mfa_reason or "new_context_or_setup", "user_agent": user_agent},
    )

    temp_token = create_access_token({"sub": user.username, "purpose": TEMP_TOKEN_PURPOSE})

    return {
        "mfa_required": True,
        "temp_token": temp_token,
        "is_mfa_setup": user.is_mfa_enabled,
    }


@router.post("/mfa/setup", response_model=MFASetupResponse)
def mfa_setup(
    payload: TempTokenRequest,
    _: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MFASetupResponse:
    user = _get_user_from_temp_token(payload.temp_token, db)
    secret = generate_mfa_secret()
    user.mfa_secret = secret
    user.is_mfa_enabled = False
    db.commit()

    uri = get_mfa_uri(secret, user.username)
    return {"secret": secret, "uri": uri}


@router.post("/mfa/verify", response_model=LoginResponse)
async def mfa_verify(
    payload: MFAVerifyRequest,
    request: Request,
    _: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LoginResponse:
    user = _get_user_from_temp_token(payload.temp_token, db)
    ip_address = _get_ip(request)
    user_agent = request.headers.get("user-agent")

    if not verify_totp(user.mfa_secret, payload.code):
        await log_event(
            db=db,
            user_id=user.id,
            ip=ip_address,
            action="MFA_FAIL",
            status="FAILURE",
            risk_score=60,
            details={"reason": "invalid_code", "user_agent": user_agent},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid MFA code"
        )

    user.is_mfa_enabled = True
    user.last_known_ip = ip_address
    user.last_user_agent = user_agent
    
    # Update Location Logic
    current_location = get_location_from_ip(ip_address)
    user.last_latitude = current_location["lat"]
    user.last_longitude = current_location["lon"]
    user.last_login_at = datetime.now(timezone.utc)
    
    db.commit()

    _create_active_session(db, user, ip_address, user_agent)
    # Broadcast session update
    await manager.broadcast_to_admins({"type": "SESSION_UPDATE"}, db)

    token_payload = {"sub": user.username, "role": getattr(user.role, "value", user.role)}
    access_token = create_access_token(token_payload)

    await log_event(
        db=db,
        user_id=user.id,
        ip=ip_address,
        action="LOGIN_SUCCESS",
        status="SUCCESS",
        risk_score=5,
        details={"mfa": "verified", "user_agent": user_agent},
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": getattr(user.role, "value", user.role),
    }
