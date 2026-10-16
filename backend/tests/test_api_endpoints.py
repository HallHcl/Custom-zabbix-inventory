import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_api_overview():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/overview")
        assert response.status_code == 200
        data = response.json()
        assert data["site_name"] == "Bangkok DC"
        assert data["room_name"] == "Room A"
        assert data["total_racks"] == 12
        assert len(data["racks"]) == 12
        assert "status_counts" in data
        assert "recent_alerts" in data


@pytest.mark.asyncio
async def test_api_racks_and_elevation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List racks
        response = await client.get("/api/v1/racks")
        assert response.status_code == 200
        racks = response.json()
        assert len(racks) == 12

        # 2. Get Rack B03 elevation
        rack_b03 = next((r for r in racks if "B03" in r["name"]), None)
        assert rack_b03 is not None
        rack_id = rack_b03["id"]

        elev_resp = await client.get(f"/api/v1/racks/{rack_id}/elevation")
        assert elev_resp.status_code == 200
        elev = elev_resp.json()
        assert elev["id"] == rack_id
        assert elev["total_u"] == 42
        assert elev["used_u"] > 0
        assert len(elev["devices"]) > 0

        # Check that devices have zabbix_status enriched
        srv_app = next((d for d in elev["devices"] if "APP" in d["name"] or "WEB" in d["name"]), None)
        assert srv_app is not None
        assert "start_u" in srv_app
        assert "height_u" in srv_app


@pytest.mark.asyncio
async def test_api_device_mount_and_collision():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Find Rack B03
        racks_resp = await client.get("/api/v1/racks")
        rack_b03 = next((r for r in racks_resp.json() if "B03" in r["name"]))
        rack_id = rack_b03["id"]

        # 1. Test collision (U27 is occupied by SRV-APP-03)
        collision_payload = {
            "rack_id": rack_id,
            "name": "TEST-COLLISION",
            "device_type": "Server",
            "start_u": 27,
            "height_u": 1,
            "position_face": "Front",
        }
        res_collision = await client.post("/api/v1/devices", json=collision_payload)
        assert res_collision.status_code == 400
        assert "collision" in res_collision.json()["detail"].lower()

        # 2. Mount into free slot (e.g. U15)
        valid_payload = {
            "rack_id": rack_id,
            "name": "SRV-TEST-MOUNT",
            "device_type": "Server",
            "model": "PowerEdge R450",
            "start_u": 15,
            "height_u": 1,
            "position_face": "Front",
            "ip_address": "10.10.20.99",
        }
        res_mount = await client.post("/api/v1/devices", json=valid_payload)
        assert res_mount.status_code == 200
        created = res_mount.json()
        assert created["name"] == "SRV-TEST-MOUNT"
        dev_id = created["id"]

        # 3. Clean up by unmounting
        res_del = await client.delete(f"/api/v1/devices/{dev_id}")
        assert res_del.status_code == 200


@pytest.mark.asyncio
async def test_api_zabbix_hosts_and_metrics():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Zabbix hosts dropdown options
        res_hosts = await client.get("/api/v1/zabbix/hosts")
        assert res_hosts.status_code == 200
        hosts = res_hosts.json()
        assert len(hosts) > 0

        # Device metrics for first device
        devices_resp = await client.get("/api/v1/devices")
        assert devices_resp.status_code == 200
        devices = devices_resp.json()
        first_dev = devices[0]

        res_metrics = await client.get(f"/api/v1/devices/{first_dev['id']}/metrics")
        assert res_metrics.status_code == 200
        metrics = res_metrics.json()
        assert "cpu_utilization" in metrics
        assert "memory_utilization" in metrics
        assert "temperature_c" in metrics
