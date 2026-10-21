import asyncio
import json
import logging
from typing import List, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis

from backend.app.config import settings
from backend.app.services.redis_service import redis_service

logger = logging.getLogger("NexusTwinWebSocket")
router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._redis_sub_task: asyncio.Task | None = None
        self._running = False

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"[WebSocket] Client connected. Active clients: {len(self.active_connections)}")

        # Start Redis subscriber listener if not running
        if self._redis_sub_task is None or self._redis_sub_task.done():
            self._running = True
            self._redis_sub_task = asyncio.create_task(self._listen_redis_pubsub())

        # Send initial snapshot immediately so client doesn't wait
        try:
            facility = await redis_service.get_facility_telemetry()
            racks_all = await redis_service.get_all_racks_telemetry()
            initial_payload = {
                "event_type": "INITIAL_STATE",
                "facility": facility,
                "racks_summary": racks_all,
            }
            await websocket.send_json(initial_payload)
        except Exception as e:
            logger.warning(f"[WebSocket] Could not send initial state: {e}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"[WebSocket] Client disconnected. Active clients: {len(self.active_connections)}")

    async def broadcast_json(self, message: dict):
        if not self.active_connections:
            return

        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

    async def _listen_redis_pubsub(self):
        """Background task subscribing to Redis live twin channels and relaying to WebSockets"""
        logger.info("[WebSocket] Starting Redis Pub/Sub subscriber...")
        client = aioredis.from_url(settings.redis_url, decode_responses=True)
        pubsub = client.pubsub()
        await pubsub.subscribe("twin:live_events", "twin:telemetry_stream")

        try:
            async for message in pubsub.listen():
                if not self._running:
                    break
                if message["type"] == "message":
                    channel = message["channel"]
                    raw_data = message["data"]
                    try:
                        data = json.loads(raw_data)
                    except Exception:
                        data = {"raw": raw_data}

                    # Relay to all connected frontend clients
                    await self.broadcast_json(data)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"[WebSocket] Redis Pub/Sub listener error: {e}")
        finally:
            await pubsub.unsubscribe("twin:live_events", "twin:telemetry_stream")
            await pubsub.close()
            await client.close()
            logger.info("[WebSocket] Redis Pub/Sub subscriber stopped.")

    async def stop(self):
        self._running = False
        if self._redis_sub_task and not self._redis_sub_task.done():
            self._redis_sub_task.cancel()


manager = ConnectionManager()


@router.websocket("/ws/live-twin")
async def websocket_live_twin(websocket: WebSocket):
    """
    Real-Time Digital Twin WebSocket Stream:
    - Streams live thermal & power telemetry updates every 30s
    - Pushes instantaneous (<200ms) Zabbix Webhook alarms with Root-Cause correlation
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive & listen for client messages / heartbeat
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"[WebSocket] Connection closed with exception: {e}")
        manager.disconnect(websocket)
