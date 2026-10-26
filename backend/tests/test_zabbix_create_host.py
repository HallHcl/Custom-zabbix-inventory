import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_get_zabbix_hostgroups():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/zabbix/hostgroups")
        assert response.status_code == 200
        groups = response.json()
        assert isinstance(groups, list)
        if len(groups) > 0:
            assert "groupid" in groups[0]
            assert "name" in groups[0]


@pytest.mark.asyncio
async def test_get_zabbix_templates():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/zabbix/templates")
        assert response.status_code == 200
        templates = response.json()
        assert isinstance(templates, list)
        if len(templates) > 0:
            assert "templateid" in templates[0]
            assert "name" in templates[0]


@pytest.mark.asyncio
async def test_create_zabbix_host_validation_error():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Missing required group_ids and interfaces
        response = await client.post("/api/v1/zabbix/hosts", json={
            "host": "test-host-missing-fields",
        })
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_zabbix_host_and_mount_flow(monkeypatch):
    import random
    from sqlalchemy import text
    from backend.app.services.zabbix_service import zabbix_service
    from backend.app.db.session import AsyncSessionLocal

    mock_host_id = str(random.randint(900000, 999999))

    # Mock zabbix_service.create_host to avoid creating dummy test hosts on live production Zabbix
    async def mock_create_host(params):
        return {"hostids": [mock_host_id]}

    monkeypatch.setattr(zabbix_service, "create_host", mock_create_host)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test creation without rack mount
        payload_standalone = {
            "host": f"test-standalone-{mock_host_id}.infra.local",
            "name": "Test Standalone Server",
            "group_ids": ["2"],
            "interfaces": [
                {
                    "type": 1,
                    "main": 1,
                    "useip": 1,
                    "ip": "10.10.10.50",
                    "dns": "",
                    "port": "10050"
                }
            ],
            "template_ids": ["10001"],
            "tags": {"Environment": "Testing", "ManagedBy": "Antigravity"},
            "description": "Created via automated unit test",
            "status": 0
        }
        resp = await client.post("/api/v1/zabbix/hosts", json=payload_standalone)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["hostid"] == mock_host_id
        assert data["device_id"] is None

        # 2. Test creation with rack mount into a free slot in Rack B03 or first available rack
        racks_resp = await client.get("/api/v1/racks")
        assert racks_resp.status_code == 200
        racks = racks_resp.json()
        assert len(racks) > 0
        target_rack = racks[0]
        rack_id = target_rack["id"]

        # Fetch elevation to find a free U
        elev_resp = await client.get(f"/api/v1/racks/{rack_id}/elevation")
        assert elev_resp.status_code == 200
        occupied_slots = set()
        for d in elev_resp.json().get("devices", []):
            start = d["start_u"]
            h = d["height_u"]
            for u in range(start, start + h):
                occupied_slots.add(u)

        # Find a free 1U slot
        free_u = None
        for u in range(1, 42):
            if u not in occupied_slots:
                free_u = u
                break

        if free_u:
            payload_mounted = {
                "host": f"test-mounted-{mock_host_id}.infra.local",
                "name": "Test Mounted Server",
                "group_ids": ["2"],
                "interfaces": [
                    {
                        "type": 1,
                        "main": 1,
                        "useip": 1,
                        "ip": "10.10.10.51",
                        "port": "10050"
                    }
                ],
                "mount_rack_id": rack_id,
                "mount_start_u": free_u,
                "mount_height_u": 1,
                "mount_position_face": "Front",
                "device_type": "Server",
                "manufacturer": "Dell",
                "model": "PowerEdge R650"
            }
            mount_resp = await client.post("/api/v1/zabbix/hosts", json=payload_mounted)
            assert mount_resp.status_code == 200
            mount_data = mount_resp.json()
            assert mount_data["status"] == "success"
            assert mount_data["device_id"] is not None
            assert mount_data["rack_name"] is not None

            # Teardown / cleanup created device from DB
            async with AsyncSessionLocal() as db:
                await db.execute(text("DELETE FROM devices WHERE zabbix_hostid = :hid"), {"hid": mock_host_id})
                await db.commit()

