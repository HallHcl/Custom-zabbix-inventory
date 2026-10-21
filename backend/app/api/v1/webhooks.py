from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.services.blast_radius_service import blast_radius_service
from backend.app.services.redis_service import redis_service

router = APIRouter()


class ZabbixWebhookPayload(BaseModel):
    event_id: Optional[str] = Field(None, description="Zabbix {EVENT.ID}")
    event_status: Optional[str] = Field("1", description="Zabbix {EVENT.VALUE} (1=PROBLEM, 0=RESOLVED)")
    severity: Optional[int] = Field(4, description="Zabbix {EVENT.NSEVERITY} (0-5)")
    zabbix_hostid: str = Field(..., description="Zabbix {HOST.ID}")
    hostname: Optional[str] = Field(None, description="Zabbix {HOST.NAME}")
    trigger_name: str = Field(..., description="Zabbix {TRIGGER.NAME}")
    item_name: Optional[str] = Field(None, description="Zabbix {ITEM.NAME}")
    item_value: Optional[str] = Field(None, description="Zabbix {ITEM.LASTVALUE}")
    timestamp: Optional[str] = Field(None, description="Event timestamp in ISO format")


@router.post("/zabbix-event", status_code=status.HTTP_200_OK)
async def receive_zabbix_webhook(payload: ZabbixWebhookPayload) -> Dict[str, Any]:
    """
    Real-Time Zabbix Webhook Receiver:
    1. Looks up device by zabbix_hostid in dcim_db.
    2. Runs Blast-Radius & Root-Cause graph correlation against device_connections.
    3. Publishes delta event to Redis channel 'twin:live_events' for immediate (<200ms) WebSocket broadcast.
    """
    event_ts = payload.timestamp or datetime.now(timezone.utc).isoformat()

    # 1. Correlate alarm & blast radius
    correlation = await blast_radius_service.correlate_alarm_event(
        zabbix_hostid=payload.zabbix_hostid,
        hostname=payload.hostname or payload.zabbix_hostid,
        trigger_name=payload.trigger_name,
        severity=payload.severity or 4,
    )

    # 2. Construct Live Event Envelope
    live_event = {
        "event_type": "ZABBIX_ALARM",
        "event_id": payload.event_id or f"evt_{int(datetime.now(timezone.utc).timestamp())}",
        "event_status": "PROBLEM" if str(payload.event_status) in ["1", "PROBLEM"] else "RESOLVED",
        "severity": payload.severity or 4,
        "trigger_name": payload.trigger_name,
        "item_name": payload.item_name,
        "item_value": payload.item_value,
        "correlation": correlation,
        "timestamp": event_ts,
    }

    # 3. Broadcast to Redis Pub/Sub channel
    await redis_service.publish_live_event("twin:live_events", live_event)

    return {
        "status": "success",
        "received_event_id": payload.event_id,
        "correlation_status": correlation["correlation_status"],
        "is_root_cause": correlation["is_root_cause"],
        "suppressed_children_count": correlation["suppressed_children_count"],
        "target_device": correlation["target_device"],
        "published_channel": "twin:live_events",
    }
