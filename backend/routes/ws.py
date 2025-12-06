from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from database import get_db
from services.websocket_manager import manager
from utils import get_user_from_token_string

router = APIRouter(tags=["ws"])

@router.websocket("/ws/notifications")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    user = get_user_from_token_string(token, db)
    
    if not user:
        await websocket.close(code=1008) # Policy Violation
        return

    await manager.connect(websocket, user.id)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)

