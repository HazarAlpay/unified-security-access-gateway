from typing import Dict

from fastapi import WebSocket
from sqlalchemy.orm import Session

from models import User, RoleEnum


class ConnectionManager:
    def __init__(self):
        # Map user_id to a list of WebSockets (in case of multiple tabs/devices)
        self.active_connections: Dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            # Send to all active connections for this user (e.g. multiple tabs)
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # Handle disconnection or error during send
                    pass

    async def broadcast_to_admins(self, message: dict, db: Session):
        # Identify which connected users are admins
        # Optimize: In a real app, we might cache roles in memory on connect
        # For now, querying DB for active user IDs is safest to get current role
        
        # Get all connected user IDs
        connected_user_ids = list(self.active_connections.keys())
        if not connected_user_ids:
            return

        # Find which of these are admins
        admins = db.query(User.id).filter(
            User.id.in_(connected_user_ids),
            User.role == RoleEnum.ADMIN
        ).all()
        
        admin_ids = {admin.id for admin in admins}

        for user_id in admin_ids:
            await self.send_personal_message(message, user_id)

manager = ConnectionManager()

