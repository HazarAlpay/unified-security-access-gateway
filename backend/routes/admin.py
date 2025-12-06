from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import AccessLog, ActiveSession, RoleEnum, User, BlacklistedIp
from schemas import AccessLogResponse, LogStatusUpdate, BanIpRequest, SecurityStatus, UserResponse
from services.websocket_manager import manager
from utils import get_current_user

router = APIRouter(tags=["admin"])


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != RoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resource.",
        )
    return user


@router.post("/admin/users/{username}/lock")
async def lock_user(
    username: str,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user_to_lock = db.query(User).filter(User.username == username).first()
    if not user_to_lock:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_to_lock.is_locked = True
    
    # Kill all sessions for this user
    db.query(ActiveSession).filter(ActiveSession.user_id == user_to_lock.id).delete()
    
    db.commit()
    
    # Notify user and admins
    await manager.send_personal_message({"type": "FORCE_LOGOUT", "reason": "account_locked"}, user_to_lock.id)
    await manager.broadcast_to_admins({"type": "SESSION_UPDATE"}, db)
    
    return {"message": f"User {username} has been locked and logged out."}


@router.post("/admin/users/{username}/unlock")
async def unlock_user(
    username: str,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user_to_unlock = db.query(User).filter(User.username == username).first()
    if not user_to_unlock:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_to_unlock.is_locked = False
    user_to_unlock.failed_login_attempts = 0 # Reset failures too
    db.commit()
    
    return {"message": f"User {username} has been unlocked."}


@router.post("/admin/ban-ip")
async def ban_ip(
    ban_request: BanIpRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    # Check if already banned
    existing = db.query(BlacklistedIp).filter(BlacklistedIp.ip_address == ban_request.ip_address).first()
    if existing:
        raise HTTPException(status_code=400, detail="IP is already banned")
        
    new_ban = BlacklistedIp(
        ip_address=ban_request.ip_address,
        reason=ban_request.reason,
        banned_by=admin.username
    )
    db.add(new_ban)
    
    # Kill sessions from this IP
    sessions_to_kill = db.query(ActiveSession).filter(ActiveSession.ip_address == ban_request.ip_address).all()
    for session in sessions_to_kill:
        await manager.send_personal_message({"type": "FORCE_LOGOUT", "reason": "ip_banned"}, session.user_id)
    
    db.query(ActiveSession).filter(ActiveSession.ip_address == ban_request.ip_address).delete()
    
    db.commit()
    await manager.broadcast_to_admins({"type": "SESSION_UPDATE"}, db)
    
    return {"message": f"IP {ban_request.ip_address} has been banned."}


@router.get("/admin/security-status", response_model=SecurityStatus)
def get_security_status(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    locked_users = db.query(User).filter(User.is_locked == True).all()
    banned_ips_db = db.query(BlacklistedIp).all()
    
    banned_ips = [
        {
            "ip_address": ip.ip_address,
            "reason": ip.reason,
            "banned_at": ip.banned_at,
            "banned_by": ip.banned_by
        }
        for ip in banned_ips_db
    ]
    
    return {
        "locked_users": [UserResponse.model_validate(u) for u in locked_users],
        "banned_ips": banned_ips
    }


@router.post("/admin/unban-ip")
async def unban_ip(
    payload: dict,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    ip_address = payload.get("ip_address")
    if not ip_address:
        raise HTTPException(status_code=400, detail="IP address required")
        
    banned_ip = db.query(BlacklistedIp).filter(BlacklistedIp.ip_address == ip_address).first()
    if not banned_ip:
        raise HTTPException(status_code=404, detail="IP not found in blacklist")
        
    db.delete(banned_ip)
    db.commit()
    
    return {"message": f"IP {ip_address} unbanned successfully."}


@router.get("/admin/users/{username}", response_model=UserResponse)
def get_user_details(
    username: str,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.get("/admin/users/{username}/history", response_model=list[AccessLogResponse])
def get_user_history(
    username: str,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user_obj = db.query(User).filter(User.username == username).first()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")
        
    logs = (
        db.query(AccessLog)
        .filter(AccessLog.user_id == user_obj.id)
        .order_by(AccessLog.timestamp.desc())
        .all()
    )
    return [AccessLogResponse.model_validate(log) for log in logs]


@router.get("/admin/logs", response_model=list[AccessLogResponse])
def get_logs(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    limit: int = 50,
) -> list[AccessLogResponse]:
    logs = (
        db.query(AccessLog)
        .join(User)
        .order_by(AccessLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    # Pydantic will handle the serialization, but we need to ensure the relationship is loaded or accessed
    # Since we are returning AccessLogResponse, we need to make sure it can access user.username if we add that field back or handle it here.
    # For now, let's update the schema to include username properly.
    return [AccessLogResponse.model_validate(log) for log in logs]


@router.patch("/admin/logs/{log_id}/status", response_model=AccessLogResponse)
async def update_log_status(
    log_id: int,
    status_update: LogStatusUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    log = db.query(AccessLog).filter(AccessLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log entry not found")
    
    log.investigation_status = status_update.status
    db.commit()
    db.refresh(log)
    
    return AccessLogResponse.model_validate(log)


@router.get("/admin/sessions")
def get_active_sessions(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    # Cleanup Zombie Sessions (Older than 1 hour)
    one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
    db.query(ActiveSession).filter(ActiveSession.last_activity < one_hour_ago).delete()
    db.commit()

    sessions = (
        db.query(ActiveSession)
        .join(User)
        .order_by(ActiveSession.last_activity.desc())
        .all()
    )
    
    return [
        {
            "id": s.id,
            "username": s.user.username,
            "user_is_locked": s.user.is_locked,
            "ip_address": s.ip_address,
            "location": s.location,
            "device": s.user_agent, # Frontend will parse this
            "login_time": s.created_at,
            "last_activity": s.last_activity,
            "lat": s.user.last_latitude,
            "lon": s.user.last_longitude
        }
        for s in sessions
    ]

@router.delete("/admin/sessions/{session_id}")
async def kill_session(
    session_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    session = db.query(ActiveSession).filter(ActiveSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    user_id = session.user_id
    db.delete(session)
    db.commit()

    # Notify the user via WebSocket
    await manager.send_personal_message({"type": "FORCE_LOGOUT"}, user_id)
    
    # Notify admins about session update
    await manager.broadcast_to_admins({"type": "SESSION_UPDATE"}, db)

    return {"message": "Session terminated"}
