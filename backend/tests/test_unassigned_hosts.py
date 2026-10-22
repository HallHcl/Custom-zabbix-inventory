import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.api.v1.zabbix import (
    infer_device_type,
    parse_interface_type,
    parse_location_tag,
    get_unassigned_hosts,
)
from backend.app.db.session import AsyncSessionLocal


def test_infer_device_type_helper():
    # Switches
    assert infer_device_type(["#Network Switch"], {"Brand": "Huawei"}, "DC1-CORE-SW-01 (Huawei CE6885)") == "Switch"
    assert infer_device_type(["#Network Switch"], {"Brand": "Cisco"}, "DC1-DIST-SW-01 (Cisco C9300-48P)") == "Switch"
    assert infer_device_type(["Cisco Catalyst Switches"], {}, "SW-AGG-01") == "Switch"

    # Firewalls
    assert infer_device_type(["#Network Security"], {"Brand": "Fortinet"}, "DC1-EDGE-FW-01 (Fortinet FG-701G)") == "Firewall"
    assert infer_device_type(["Network Edge"], {}, "FG-100F-HA1") == "Firewall"

    # Storage
    assert infer_device_type(["Enterprise SAN"], {"Brand": "Dell"}, "DC1-SAN-STOR-01 (Dell PowerStore 5000T)") == "Storage"

    # UPS
    assert infer_device_type(["Power & Facilities"], {"Brand": "APC"}, "DC1-UPS-RACK-A (APC Smart-UPS RT 10kVA)") == "UPS"

    # Servers (including Cisco UCS and Linux servers)
    assert infer_device_type([], {"Brand": "Cisco"}, "DC1-SRV-WIN-AD01 (Cisco UCS C220 AD)") == "Server"
    assert infer_device_type(["#Compute / Virtualization"], {"Brand": "Dell"}, "DC1-SRV-K8S-M01 (Dell R750 Master)") == "Server"
    assert infer_device_type(["#Compute / Virtualization"], {"Brand": "HPE"}, "DC1-SRV-PGSQL-01 (HPE DL380 Primary)") == "Server"
    assert infer_device_type([], {}, "Docker: dc_vision_frontend (8090)") == "Server"


def test_parse_location_tag():
    assert parse_location_tag({"Location": "Room A / Rack A01 / U38-U39"}) == ("R-A01", 38, 2)
    assert parse_location_tag({"Location": "Room A / Rack B01 / U36"}) == ("R-B01", 36, 1)
    assert parse_location_tag({"Location": "Room A / Rack A01 / U01-U04"}) == ("R-A01", 1, 4)
    assert parse_location_tag({"location": "Rack C02 / U12"}) == ("R-C02", 12, 1)
    assert parse_location_tag({}) == (None, None, None)


def test_parse_interface_type():
    assert parse_interface_type(1) == "Agent"
    assert parse_interface_type("2") == "SNMP"
    assert parse_interface_type("3") == "IPMI"
    assert parse_interface_type(4) == "JMX"


@pytest.mark.asyncio
async def test_api_unassigned_hosts():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch unassigned hosts
        response = await client.get("/api/v1/zabbix/unassigned-hosts?force_refresh=true")
        assert response.status_code == 200
        data = response.json()
        assert "total_unassigned" in data
        assert "hosts" in data
        assert isinstance(data["hosts"], list)
        assert data["total_unassigned"] >= 0

        # 2. Verify structure of unassigned host items if available
        if data["hosts"]:
            sample = data["hosts"][0]
            assert "hostid" in sample
            assert "name" in sample
            assert "technical_name" in sample
            assert "suggested_device_type" in sample
            assert "interface_type" in sample
            assert "status" in sample
            assert "problems_count" in sample
            assert "brand" in sample
            assert "suggested_rack_name" in sample

        # 3. Test filter by search
        search_resp = await client.get("/api/v1/zabbix/unassigned-hosts?search=nonexistent_dummy_string_xyz")
        assert search_resp.status_code == 200
        search_data = search_resp.json()
        assert len(search_data["hosts"]) == 0


@pytest.mark.asyncio
async def test_direct_invocation_unassigned_hosts():
    """Verify python direct invocation with defaults doesn't fail on Query parameters"""
    async with AsyncSessionLocal() as session:
        overview = await get_unassigned_hosts(db=session)
        assert overview.total_unassigned >= 0
        assert isinstance(overview.hosts, list)
