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
        assert "Bangkok DC" in data["site_name"]
        assert data["room_name"] in ["Room A", "Data Hall Alpha"]
        assert data["total_racks"] == len(data["racks"])
        assert data["total_racks"] >= 12
        assert len(data["racks"]) >= 12
        assert "status_counts" in data
        assert "recent_alerts" in data
        assert "device_type_counts" in data
        assert isinstance(data["device_type_counts"], dict)
        assert sum(data["device_type_counts"].values()) == data["total_devices"]
        assert data["total_capacity_u"] >= data["total_used_u"]
        assert data["total_capacity_u"] > 0
        assert data["zabbix_status"] is not None
        assert data["zabbix_status"]["status"] in ["CONNECTED", "STALE", "DISCONNECTED", "ERROR"]


@pytest.mark.asyncio
async def test_api_racks_and_elevation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List racks
        response = await client.get("/api/v1/racks")
        assert response.status_code == 200
        racks = response.json()
        assert len(racks) >= 12

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
        srv_app = next((d for d in elev["devices"] if any(k in d["name"] for k in ["SRV", "K8S", "DB", "APP", "PP"])), None)
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

        # Fetch elevation to find an occupied slot dynamically
        elev_resp = await client.get(f"/api/v1/racks/{rack_id}/elevation")
        elev = elev_resp.json()
        occupied_dev = next((d for d in elev["devices"] if d.get("start_u")), None)
        occupied_u = occupied_dev["start_u"] if occupied_dev else 10

        # 1. Test collision against an occupied slot
        collision_payload = {
            "rack_id": rack_id,
            "name": "TEST-COLLISION",
            "device_type": "Server",
            "start_u": occupied_u,
            "height_u": 1,
            "position_face": "Front",
        }
        res_collision = await client.post("/api/v1/devices", json=collision_payload)
        assert res_collision.status_code == 400
        assert "collision" in res_collision.json()["detail"].lower()

        # 2. Mount into free slot (e.g. U2)
        valid_payload = {
            "rack_id": rack_id,
            "name": "SRV-TEST-MOUNT",
            "device_type": "Server",
            "model": "PowerEdge R450",
            "start_u": 2,
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


@pytest.mark.asyncio
async def test_api_update_device_spec():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch devices list to get a valid device
        devices_resp = await client.get("/api/v1/devices")
        assert devices_resp.status_code == 200
        devices = devices_resp.json()
        assert len(devices) > 0
        target = devices[0]
        dev_id = target["id"]

        # 2. Update hardware spec (brand, model, device_type, serial_number)
        patch_payload = {
            "name": f"{target['name']}-EDITED",
            "manufacturer": "Dell EMC",
            "model": "PowerEdge R750xs",
            "device_type": "Server",
            "serial_number": "DL-TEST-998811",
            "status": "Active",
            "custom_fields": {
                "brand": "Dell EMC",
                "vendor": "Dell EMC",
                "role": "Application Server",
            },
        }

        patch_resp = await client.patch(f"/api/v1/devices/{dev_id}", json=patch_payload)
        assert patch_resp.status_code == 200
        updated = patch_resp.json()

        assert updated["id"] == dev_id
        assert updated["name"] == patch_payload["name"]
        assert updated["manufacturer"] == "Dell EMC"
        assert updated["model"] == "PowerEdge R750xs"
        assert updated["serial_number"] == "DL-TEST-998811"
        assert updated["custom_fields"]["brand"] == "Dell EMC"
        assert updated["custom_fields"]["vendor"] == "Dell EMC"
        # Verify brand_info is resolved dynamically by backend
        assert updated.get("brand_info") is not None
        assert updated["brand_info"]["tag"] == "DELL EMC"

        # 3. Restore original fields so test is idempotent
        restore_payload = {
            "name": target["name"],
            "manufacturer": target["manufacturer"],
            "model": target["model"],
            "device_type": target["device_type"],
            "serial_number": target.get("serial_number"),
            "status": target.get("status", "Active"),
        }
        restore_resp = await client.patch(f"/api/v1/devices/{dev_id}", json=restore_payload)
        assert restore_resp.status_code == 200
