import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_assign_device_from_zabbix_and_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch available racks
        racks_resp = await client.get("/api/v1/racks")
        assert racks_resp.status_code == 200
        racks = racks_resp.json()
        assert len(racks) > 0
        target_rack = racks[0]
        rack_id = target_rack["id"]

        # 2. Fetch unassigned hosts from Zabbix
        unassigned_resp = await client.get("/api/v1/zabbix/unassigned-hosts")
        assert unassigned_resp.status_code == 200
        unassigned_data = unassigned_resp.json()
        if len(unassigned_data["hosts"]) == 0:
            pytest.skip("All Zabbix hosts are currently assigned to racks in the database")
        sample_host = unassigned_data["hosts"][0]
        zabbix_host_id = sample_host["hostid"]

        # 3. Find an open slot in target rack
        elev_resp = await client.get(f"/api/v1/racks/{rack_id}/elevation")
        assert elev_resp.status_code == 200
        occupied_slots = set()
        for d in elev_resp.json().get("devices", []):
            if d.get("position_face", "Front") == "Front":
                for u in range(d["start_u"], d["start_u"] + d["height_u"]):
                    occupied_slots.add(u)
        open_slots = [u for u in range(1, 43) if u not in occupied_slots]
        assert len(open_slots) > 0
        open_u = open_slots[0]

        # 4. Mount into open slot
        assign_payload = {
            "zabbix_host_id": zabbix_host_id,
            "rack_id": rack_id,
            "start_u": open_u,
            "height_u": 1,
            "position_face": "Front",
            "status": "Active",
        }
        assign_resp = await client.post("/api/v1/devices/assign-from-zabbix", json=assign_payload)
        assert assign_resp.status_code == 200, assign_resp.text

        created_device = assign_resp.json()
        device_id = created_device["id"]
        assert created_device["rack_id"] == rack_id
        assert created_device["zabbix_host_id"] == zabbix_host_id
        assert created_device["start_u"] == open_u
        assert created_device["status"] == "Active"

        # 5. Test duplicate mounting prevention (same zabbix_host_id)
        other_open_u = open_slots[1] if len(open_slots) > 1 else 42
        dup_resp = await client.post("/api/v1/devices/assign-from-zabbix", json={
            "zabbix_host_id": zabbix_host_id,
            "rack_id": rack_id,
            "start_u": other_open_u,
            "height_u": 1,
        })
        assert dup_resp.status_code == 400
        assert "already mounted" in dup_resp.json()["detail"].lower()

        # 6. Test slot collision (open_u is now occupied by created_device)
        collision_resp = await client.post("/api/v1/devices/assign-from-zabbix", json={
            "zabbix_host_id": "dummy_unassigned_99999",
            "rack_id": rack_id,
            "start_u": open_u,
            "height_u": 1,
        })
        assert collision_resp.status_code == 400
        assert "collision" in collision_resp.json()["detail"].lower()


        # 6. Test status update to Maintenance
        status_maint = await client.patch(f"/api/v1/devices/{device_id}/status", json={
            "status": "Maintenance",
            "maintenance_duration_hours": 3,
        })
        assert status_maint.status_code == 200
        assert status_maint.json()["status"] == "Maintenance"

        # 7. Test status update back to Active
        status_active = await client.patch(f"/api/v1/devices/{device_id}/status", json={
            "status": "Active",
        })
        assert status_active.status_code == 200
        assert status_active.json()["status"] == "Active"

        # 8. Clean up created device
        del_resp = await client.delete(f"/api/v1/devices/{device_id}")
        assert del_resp.status_code == 200
