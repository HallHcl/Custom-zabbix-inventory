import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_rack_collision_front_front():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        overview_resp = await client.get("/api/v1/overview")
        assert overview_resp.status_code == 200
        racks = overview_resp.json()["racks"]
        assert len(racks) > 0
        target_rack = racks[0]
        rack_id = target_rack["id"]

        # 1. Mount 2U base device at U5 (occupies U5-U6)
        res1 = await client.post(
            "/api/v1/devices",
            json={
                "rack_id": rack_id,
                "name": "TEST-COLLISION-BASE-1",
                "start_u": 5,
                "height_u": 2,
                "position_face": "FRONT",
                "device_type": "Server",
                "model": "PowerEdge R750",
            },
        )
        assert res1.status_code == 200
        dev_base_id = res1.json()["id"]

        try:
            # 2. Attempt to mount 1U at U6 (overlapping slot) -> MUST fail with 400
            res_conflict = await client.post(
                "/api/v1/devices",
                json={
                    "rack_id": rack_id,
                    "name": "TEST-COLLISION-CONFLICT",
                    "start_u": 6,
                    "height_u": 1,
                    "position_face": "FRONT",
                    "device_type": "Server",
                    "model": "Generic",
                },
            )
            assert res_conflict.status_code == 400
            assert "collision" in res_conflict.json()["detail"].lower()
        finally:
            # Guaranteed cleanup
            await client.delete(f"/api/v1/devices/{dev_base_id}")


@pytest.mark.asyncio
async def test_rack_collision_both_faces():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        overview_resp = await client.get("/api/v1/overview")
        racks = overview_resp.json()["racks"]
        target_rack = racks[0]
        rack_id = target_rack["id"]

        # Mount 2U device at U35 with BOTH faces (occupies U35-U36, BOTH)
        res_both = await client.post(
            "/api/v1/devices",
            json={
                "rack_id": rack_id,
                "name": "TEST-DEEP-CHASSIS-BOTH",
                "start_u": 35,
                "height_u": 2,
                "position_face": "BOTH",
                "device_type": "Server",
            },
        )
        assert res_both.status_code == 200
        dev_id = res_both.json()["id"]

        try:
            # 1. Collision on FRONT at U35
            res_front = await client.post(
                "/api/v1/devices",
                json={
                    "rack_id": rack_id,
                    "name": "TEST-FRONT-CONFLICT",
                    "start_u": 35,
                    "height_u": 1,
                    "position_face": "FRONT",
                },
            )
            assert res_front.status_code == 400
            assert "collision" in res_front.json()["detail"].lower()

            # 2. Collision on REAR at U36
            res_rear = await client.post(
                "/api/v1/devices",
                json={
                    "rack_id": rack_id,
                    "name": "TEST-REAR-CONFLICT",
                    "start_u": 36,
                    "height_u": 1,
                    "position_face": "REAR",
                },
            )
            assert res_rear.status_code == 400
            assert "collision" in res_rear.json()["detail"].lower()
        finally:
            await client.delete(f"/api/v1/devices/{dev_id}")


@pytest.mark.asyncio
async def test_rack_different_faces_allowed():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        overview_resp = await client.get("/api/v1/overview")
        racks = overview_resp.json()["racks"]
        target_rack = racks[0]
        rack_id = target_rack["id"]

        # Clean slot e.g. U37
        res_front = await client.post(
            "/api/v1/devices",
            json={
                "rack_id": rack_id,
                "name": "TEST-FACING-FRONT",
                "start_u": 37,
                "height_u": 1,
                "position_face": "FRONT",
            },
        )
        assert res_front.status_code == 200
        dev_front_id = res_front.json()["id"]

        try:
            # Mount REAR at the exact same U slot (U37) -> MUST succeed!
            res_rear = await client.post(
                "/api/v1/devices",
                json={
                    "rack_id": rack_id,
                    "name": "TEST-FACING-REAR",
                    "start_u": 37,
                    "height_u": 1,
                    "position_face": "REAR",
                },
            )
            assert res_rear.status_code == 200
            dev_rear_id = res_rear.json()["id"]

            await client.delete(f"/api/v1/devices/{dev_rear_id}")
        finally:
            await client.delete(f"/api/v1/devices/{dev_front_id}")


@pytest.mark.asyncio
async def test_rack_bounds_validation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        overview_resp = await client.get("/api/v1/overview")
        target_rack = overview_resp.json()["racks"][0]
        rack_id = target_rack["id"]

        # 1. start_u = 0 (below 1)
        r0 = await client.post(
            "/api/v1/devices",
            json={
                "rack_id": rack_id,
                "name": "TEST-BOUNDS-0",
                "start_u": 0,
                "height_u": 1,
            },
        )
        assert r0.status_code == 400
        assert "exceed" in r0.json()["detail"].lower()

        # 2. Exceeds rack total_u (42U rack: start_u=42, height_u=2 => U43)
        r43 = await client.post(
            "/api/v1/devices",
            json={
                "rack_id": rack_id,
                "name": "TEST-BOUNDS-43",
                "start_u": 42,
                "height_u": 2,
            },
        )
        assert r43.status_code == 400
        assert "exceed" in r43.json()["detail"].lower()


@pytest.mark.asyncio
async def test_device_move_and_resizing_collision():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        overview_resp = await client.get("/api/v1/overview")
        target_rack = overview_resp.json()["racks"][0]
        rack_id = target_rack["id"]

        # Mount Dev 1 at U20
        dev1_resp = await client.post(
            "/api/v1/devices",
            json={
                "rack_id": rack_id,
                "name": "TEST-MOVE-DEV1",
                "start_u": 20,
                "height_u": 1,
                "position_face": "FRONT",
            },
        )
        assert dev1_resp.status_code == 200
        dev1_id = dev1_resp.json()["id"]

        try:
            # Mount Dev 2 at U22
            dev2_resp = await client.post(
                "/api/v1/devices",
                json={
                    "rack_id": rack_id,
                    "name": "TEST-MOVE-DEV2",
                    "start_u": 22,
                    "height_u": 1,
                    "position_face": "FRONT",
                },
            )
            assert dev2_resp.status_code == 200
            dev2_id = dev2_resp.json()["id"]

            try:
                # 1. Attempt to move Dev 1 onto Dev 2 (U22) -> MUST fail with 400 collision
                move_conflict = await client.patch(
                    f"/api/v1/devices/{dev1_id}",
                    json={"start_u": 22},
                )
                assert move_conflict.status_code == 400
                assert "collision" in move_conflict.json()["detail"].lower()

                # 2. Update Dev 1 metadata without moving slot -> MUST succeed without self-collision
                rename_resp = await client.patch(
                    f"/api/v1/devices/{dev1_id}",
                    json={"name": "TEST-MOVE-DEV1-RENAMED"},
                )
                assert rename_resp.status_code == 200
                assert rename_resp.json()["name"] == "TEST-MOVE-DEV1-RENAMED"

                # 3. Move Dev 1 to vacant U21 -> MUST succeed
                move_ok = await client.patch(
                    f"/api/v1/devices/{dev1_id}",
                    json={"start_u": 21},
                )
                assert move_ok.status_code == 200
                assert move_ok.json()["start_u"] == 21
            finally:
                await client.delete(f"/api/v1/devices/{dev2_id}")
        finally:
            await client.delete(f"/api/v1/devices/{dev1_id}")


@pytest.mark.asyncio
async def test_unmount_device_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        overview_resp = await client.get("/api/v1/overview")
        rack_id = overview_resp.json()["racks"][0]["id"]

        # Mount temporary device at U28
        mount_res = await client.post(
            "/api/v1/devices",
            json={
                "rack_id": rack_id,
                "name": "TEMP-TO-UNMOUNT",
                "start_u": 28,
                "height_u": 1,
            },
        )
        assert mount_res.status_code == 200
        dev_id = mount_res.json()["id"]

        # DELETE endpoint
        del_res = await client.delete(f"/api/v1/devices/{dev_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "success"

        # Verify device no longer exists
        get_res = await client.get(f"/api/v1/devices/{dev_id}/overview")
        # Should either 404 or not find the device
        if get_res.status_code == 200:
            assert get_res.json().get("device_id") != dev_id
