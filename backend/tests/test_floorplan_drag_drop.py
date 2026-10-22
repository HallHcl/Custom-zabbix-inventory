import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_floorplan_layout_and_drag_drop_apis():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch current Room Layout
        res = await client.get("/api/v1/rooms/1/layout")
        assert res.status_code == 200, res.text
        layout = res.json()
        assert "grid_rows" in layout
        assert "grid_cols" in layout
        assert "racks" in layout
        initial_racks_count = len(layout["racks"])

        # 2. Update room grid layout
        res_grid = await client.patch(
            "/api/v1/rooms/1/layout",
            json={"grid_rows": 6, "grid_cols": 8},
        )
        assert res_grid.status_code == 200, res_grid.text
        updated_layout = res_grid.json()
        assert updated_layout["grid_rows"] == 6
        assert updated_layout["grid_cols"] == 8

        # 3. Create a new rack at an unoccupied slot (e.g. Row F Col 7)
        res_create = await client.post(
            "/api/v1/rooms/1/racks",
            json={
                "name": "Rack F07",
                "row": "Row F",
                "col": 7,
                "total_u": 48,
            },
        )
        assert res_create.status_code == 200, res_create.text
        created_rack = res_create.json()
        rack_id = created_rack["id"]
        assert created_rack["total_u"] == 48

        # 4. Batch update rack positions (Simulating a Sims-style drag move to Row F Col 8)
        res_batch = await client.patch(
            "/api/v1/rooms/1/rack-positions",
            json={
                "positions": [
                    {"rack_id": rack_id, "row": "Row F", "col": 8}
                ]
            },
        )
        assert res_batch.status_code == 200, res_batch.text
        batch_data = res_batch.json()
        assert batch_data["status"] == "ok"

        # 5. Verify position updated in layout
        res_layout_after = await client.get("/api/v1/rooms/1/layout")
        assert res_layout_after.status_code == 200
        racks_after = res_layout_after.json()["racks"]
        moved_rack = next((r for r in racks_after if str(r["id"]) == str(rack_id)), None)
        assert moved_rack is not None
        assert moved_rack["col"] == 8

        # 6. Cleanup the test rack
        res_del = await client.delete(f"/api/v1/rooms/1/racks/{rack_id}")
        assert res_del.status_code in (200, 204), res_del.text
