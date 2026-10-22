import time
from datetime import datetime, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, patch

from backend.app.main import app
from backend.app.services.sync_service import sync_service
from backend.app.services.redis_service import redis_service
from backend.app.config import settings


@pytest.mark.asyncio
async def test_zabbix_status_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/zabbix/status")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("CONNECTED", "STALE", "DISCONNECTED")
        assert "zabbix_url" in data
        assert "zabbix_web_console_url" in data
        assert "message" in data
        assert data["zabbix_web_console_url"] == settings.zabbix_web_console_url


@pytest.mark.asyncio
async def test_zabbix_status_threshold_transitions():
    now = time.time()

    # 1. Connected: Sync 60s ago (<= 120s)
    with patch.object(redis_service, "get_zabbix_sync_status", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = {
            "status": "CONNECTED",
            "last_sync_timestamp": now - 60,
            "last_sync_time": datetime.now(timezone.utc).isoformat(),
            "version": "7.0.29",
            "monitored_hosts_count": 30,
            "active_problems_count": 10,
            "message": "Zabbix 7.0.29 connected",
        }
        status = await sync_service.get_sync_status()
        assert status["status"] == "CONNECTED"
        assert status["seconds_since_last_sync"] >= 59
        assert status["version"] == "7.0.29"

    # 2. Stale: Sync 200s ago (120s < t <= 600s)
    with patch.object(redis_service, "get_zabbix_sync_status", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = {
            "status": "CONNECTED",
            "last_sync_timestamp": now - 200,
            "last_sync_time": datetime.now(timezone.utc).isoformat(),
            "version": "7.0.29",
            "monitored_hosts_count": 30,
            "active_problems_count": 10,
        }
        status = await sync_service.get_sync_status()
        assert status["status"] == "STALE"
        assert "STALE DATA" in status["message"]
        assert status["seconds_since_last_sync"] >= 199

    # 3. Disconnected: Sync 700s ago (> 600s)
    with patch.object(redis_service, "get_zabbix_sync_status", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = {
            "status": "CONNECTED",
            "last_sync_timestamp": now - 700,
            "last_sync_time": datetime.now(timezone.utc).isoformat(),
            "version": "7.0.29",
            "monitored_hosts_count": 30,
            "active_problems_count": 10,
        }
        status = await sync_service.get_sync_status()
        assert status["status"] == "DISCONNECTED"
        assert "Disconnected" in status["message"]


@pytest.mark.asyncio
async def test_zabbix_record_sync_failure():
    now = time.time()

    # Case A: Last sync was recent (30s ago) -> temporary hiccup, stays CONNECTED
    with patch.object(redis_service, "get_zabbix_sync_status", new_callable=AsyncMock) as mock_get, \
         patch.object(redis_service, "cache_zabbix_sync_status", new_callable=AsyncMock) as mock_cache:
        mock_get.return_value = {
            "status": "CONNECTED",
            "last_sync_timestamp": now - 30,
            "last_sync_time": "2026-10-22T10:00:00Z",
            "version": "7.0.29",
        }
        res = await sync_service.record_sync_failure("Timeout connecting to server")
        assert res["status"] == "CONNECTED"
        assert "Temporary sync hiccup" in res["message"]
        mock_cache.assert_awaited_once()

    # Case B: Last sync was 300s ago -> degraded to STALE
    with patch.object(redis_service, "get_zabbix_sync_status", new_callable=AsyncMock) as mock_get, \
         patch.object(redis_service, "cache_zabbix_sync_status", new_callable=AsyncMock) as mock_cache:
        mock_get.return_value = {
            "status": "CONNECTED",
            "last_sync_timestamp": now - 300,
            "last_sync_time": "2026-10-22T09:55:00Z",
            "version": "7.0.29",
        }
        res = await sync_service.record_sync_failure("Connection refused")
        assert res["status"] == "STALE"
        assert "STALE DATA" in res["message"]

    # Case C: Last sync was 800s ago -> degraded to DISCONNECTED
    with patch.object(redis_service, "get_zabbix_sync_status", new_callable=AsyncMock) as mock_get, \
         patch.object(redis_service, "cache_zabbix_sync_status", new_callable=AsyncMock) as mock_cache:
        mock_get.return_value = {
            "status": "CONNECTED",
            "last_sync_timestamp": now - 800,
            "last_sync_time": "2026-10-22T09:40:00Z",
            "version": "7.0.29",
        }
        res = await sync_service.record_sync_failure("Host unreachable")
        assert res["status"] == "DISCONNECTED"
        assert "Disconnected" in res["message"]


@pytest.mark.asyncio
async def test_overview_embeds_zabbix_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/overview")
        assert response.status_code == 200
        data = response.json()
        assert "zabbix_status" in data
        assert data["zabbix_status"] is not None
        status_obj = data["zabbix_status"]
        assert status_obj["status"] in ("CONNECTED", "STALE", "DISCONNECTED")
        assert "zabbix_url" in status_obj
        assert "zabbix_web_console_url" in status_obj
        assert status_obj["zabbix_web_console_url"] == settings.zabbix_web_console_url
