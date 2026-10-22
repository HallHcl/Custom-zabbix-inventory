import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.services.zabbix_provision_service import parse_location_tag, resolve_model_name

def test_parse_location_tag():
    # Standard format: 'Room A / Rack A01 / U34-U35'
    rack, u, h = parse_location_tag({"Location": "Room A / Rack A01 / U34-U35"})
    assert rack == "R-A01"
    assert u == 34
    assert h == 2

    # Single U format: 'Room A / Rack B02 / U28'
    rack, u, h = parse_location_tag({"Location": "Room A / Rack B02 / U28"})
    assert rack == "R-B02"
    assert u == 28
    assert h == 1

    # 4U format: 'Room A / Rack A01 / U01-U04'
    rack, u, h = parse_location_tag({"Location": "Room A / Rack A01 / U01-U04"})
    assert rack == "R-A01"
    assert u == 1
    assert h == 4

    # Empty
    rack, u, h = parse_location_tag({})
    assert rack is None
    assert u is None
    assert h is None

def test_resolve_model_name():
    assert resolve_model_name("DC1-CORE-SW-01 (Huawei CE6885)", "DC1-CORE-SW-01", {}) == "CloudEngine 6885-48S6CQ"
    assert resolve_model_name("DC1-EDGE-FW-01 (Fortinet FG-701G)", "DC1-EDGE-FW-01", {}) == "FortiGate 701G"
    assert resolve_model_name("DC1-SRV-K8S-M01 (Dell R750 Master)", "DC1-SRV-K8S-M01", {}) == "PowerEdge R750"
    assert resolve_model_name("Docker: dc_vision_frontend (8090)", "Docker-dc_vision_frontend", {}) == "Containerized Service"

@pytest.mark.asyncio
async def test_auto_provision_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/zabbix/auto-provision?wipe_mock_devices=false")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["provisioned"] > 0
