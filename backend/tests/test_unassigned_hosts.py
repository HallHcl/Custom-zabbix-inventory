import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.api.v1.zabbix import infer_device_type, parse_interface_type


def test_infer_device_type_helper():
    assert infer_device_type(["Cisco Catalyst Switches"], {}, "SW-AGG-01") == "Switch"
    assert infer_device_type(["Network Edge"], {}, "FG-100F-HA1") == "Firewall"
    assert infer_device_type(["Enterprise SAN"], {"Storage": "SAN"}, "Dell PowerStore") == "Storage"
    assert infer_device_type(["Power & Facilities"], {}, "APC-Galaxy-UPS-01") == "UPS"
    assert infer_device_type(["Linux servers"], {}, "DC1-SRV-APP-01") == "Server"


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

        # 3. Test filter by search
        search_resp = await client.get("/api/v1/zabbix/unassigned-hosts?search=nonexistent_dummy_string_xyz")
        assert search_resp.status_code == 200
        search_data = search_resp.json()
        assert len(search_data["hosts"]) == 0
