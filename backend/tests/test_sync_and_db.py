import pytest
from sqlalchemy import select
from backend.app.db.session import AsyncSessionLocal
from backend.app.db.models import Site, Room, Rack, Device
from backend.app.services.sync_service import sync_service
from backend.app.services.redis_service import redis_service


@pytest.mark.asyncio
async def test_db_topology_exists():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Site).where(Site.code == "BKK-DC1"))
        site = result.scalar_one_or_none()
        assert site is not None
        assert site.name == "Bangkok DC"

        result = await session.execute(select(Room).where(Room.site_id == site.id))
        rooms = result.scalars().all()
        assert len(rooms) >= 1

        room = rooms[0]
        result = await session.execute(select(Rack).where(Rack.room_id == room.id))
        racks = result.scalars().all()
        assert len(racks) == 12

        # Check devices in Rack B03
        rack_b03 = next((r for r in racks if "B03" in r.name), None)
        assert rack_b03 is not None

        result = await session.execute(select(Device).where(Device.rack_id == rack_b03.id))
        devices = result.scalars().all()
        assert len(devices) >= 10


@pytest.mark.asyncio
async def test_sync_service_and_redis():
    res = await sync_service.sync_zabbix_cache()
    assert res["synced_hosts"] > 0

    problems = await redis_service.get_active_problems()
    assert problems is not None
    assert len(problems) > 0
