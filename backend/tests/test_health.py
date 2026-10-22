import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.config import settings


@pytest.mark.asyncio
async def test_health():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Root /health
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ("healthy", "degraded")
        assert data["app"] == settings.APP_NAME
        assert "version" in data
        assert "database" in data
        assert "redis" in data
        assert "zabbix_web_console_url" in data

        # 2. /api/v1/health
        v1_resp = await client.get("/api/v1/health")
        assert v1_resp.status_code == 200
        assert v1_resp.json()["status"] in ("healthy", "degraded")


@pytest.mark.asyncio
async def test_api_key_auth_perimeter():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Default: disabled, public access works without key header
        res = await client.get("/api/v1/status")
        assert res.status_code == 200

        # When perimeter key is enabled:
        original_enabled = settings.API_KEY_ENABLED
        original_key = settings.API_KEY
        try:
            settings.API_KEY_ENABLED = True
            settings.API_KEY = "test-secret-noc-key-999"

            # 1. /health and /api/v1/health must remain publicly accessible without key
            health_res = await client.get("/health")
            assert health_res.status_code == 200

            v1_health_res = await client.get("/api/v1/health")
            assert v1_health_res.status_code == 200

            # 2. Protected endpoint without key fails with 401
            unauth_res = await client.get("/api/v1/status")
            assert unauth_res.status_code == 401
            assert "unauthorized" in unauth_res.json()["detail"].lower()

            # 3. Protected endpoint with valid X-API-Key succeeds
            auth_res = await client.get(
                "/api/v1/status",
                headers={"X-API-Key": "test-secret-noc-key-999"},
            )
            assert auth_res.status_code == 200
        finally:
            settings.API_KEY_ENABLED = original_enabled
            settings.API_KEY = original_key
