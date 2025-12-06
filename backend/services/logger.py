from typing import Any, Optional
import asyncio

from sqlalchemy.orm import Session

from models import AccessLog
from schemas import AccessLogResponse
from services.websocket_manager import manager


async def log_event(
    db: Session,
    user_id: int,
    ip: str,
    action: str,
    status: str,
    risk_score: int,
    details: Optional[Any] = None,
    country: Optional[str] = None,
    likelihood: int = 1,
    impact: int = 1,
) -> AccessLog:
    """
    Persist a new AccessLog entry with consistent defaults.
    """
    log_entry = AccessLog(
        user_id=user_id,
        ip_address=ip or "unknown",
        country=country,
        action=action,
        status=status,
        risk_score=risk_score,
        likelihood=likelihood,
        impact=impact,
        log_metadata=details,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    # Broadcast to Admins via WebSocket
    try:
        # Serialize properly using Pydantic schema
        log_data = AccessLogResponse.model_validate(log_entry).model_dump(mode="json")
        payload = {"type": "NEW_LOG", "log": log_data}
        
        await manager.broadcast_to_admins(payload, db)
    except Exception:
        # If no loop or error, skip WS broadcast (don't fail the log)
        pass

    return log_entry

