import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, func

from backend.app.main import app
from backend.app.config import settings
from backend.app.db.session import AsyncSessionLocal
from backend.app.db.models import (
    Site,
    Building,
    Room,
    Row,
    Rack,
    DeviceModel,
    Device,
    DeviceConnection,
    KnowledgeDocument,
    Subnet,
)


@pytest.mark.asyncio
async def test_healthcheck_endpoints():
    """Verify both /health and /api/v1/health report healthy status with connected DB and Redis"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Root /health
        res1 = await client.get("/health")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["status"] == "healthy"
        assert data1["database"] == "connected"
        assert data1["redis"] == "connected"
        assert data1["app"] in ("NexusTwin DCIM & Digital Twin", "DC VISION Operations Portal", settings.APP_NAME)

        # 2. Versioned /api/v1/health
        res2 = await client.get("/api/v1/health")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["status"] == "healthy"
        assert data2["database"] == "connected"
        assert data2["redis"] == "connected"


@pytest.mark.asyncio
async def test_datacenter_spatial_hierarchy():
    """Verify Site -> Building -> Room -> Row -> Rack hierarchy with UUIDs and geometry"""
    async with AsyncSessionLocal() as session:
        # Site
        res = await session.execute(select(Site).where(Site.slug == "bkk-dc1"))
        site = res.scalar_one_or_none()
        assert site is not None
        assert isinstance(site.id, uuid.UUID)
        assert site.name == "Bangkok DC-1"
        assert float(site.latitude) > 13.0
        assert float(site.longitude) > 100.0

        # Building
        res = await session.execute(select(Building).where(Building.site_id == site.id))
        buildings = res.scalars().all()
        assert len(buildings) == 1
        building = buildings[0]
        assert building.name == "Facility Building A"
        assert building.floors_count == 3
        assert float(building.total_power_capacity_kw) == 1200.0

        # Rooms
        res = await session.execute(select(Room).where(Room.building_id == building.id))
        rooms = res.scalars().all()
        assert len(rooms) == 2
        room_names = [r.name for r in rooms]
        assert "Data Hall Alpha" in room_names
        assert "Data Hall Beta" in room_names

        # Rows
        res = await session.execute(select(Row))
        rows = res.scalars().all()
        assert len(rows) >= 4
        aisle_types = {r.aisle_type for r in rows}
        assert "COLD_CONTAINED" in aisle_types
        assert "HOT_CONTAINED" in aisle_types

        # Racks
        res = await session.execute(select(Rack))
        racks = res.scalars().all()
        assert len(racks) >= 24
        sample_rack = racks[0]
        assert sample_rack.u_height == 42
        assert sample_rack.zabbix_inlet_temp_itemid is not None
        assert sample_rack.zabbix_pdu_a_power_itemid is not None
        assert sample_rack.zabbix_pdu_b_power_itemid is not None


@pytest.mark.asyncio
async def test_hardware_models_and_inventory():
    """Verify hardware catalog and 70+ populated devices with lifecycle/warranty"""
    async with AsyncSessionLocal() as session:
        # Hardware Models
        res = await session.execute(select(DeviceModel))
        models = res.scalars().all()
        assert len(models) >= 10
        manufacturers = {m.manufacturer for m in models}
        assert "Dell Technologies" in manufacturers
        assert "Cisco Systems" in manufacturers
        assert "Fortinet" in manufacturers

        # Devices
        res = await session.execute(select(Device))
        devices = res.scalars().all()
        assert len(devices) >= 60

        # Verify attributes on devices
        active_devices = [d for d in devices if d.status == "ACTIVE"]
        assert len(active_devices) > 50

        # Verify serial and asset tags uniqueness
        serials = [d.serial_number for d in devices if d.serial_number]
        assert len(serials) == len(set(serials))


@pytest.mark.asyncio
async def test_device_connections_and_power_redundancy():
    """Verify dual power A/B cabling and network connections"""
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(DeviceConnection))
        connections = res.scalars().all()
        assert len(connections) >= 90

        types = {c.connection_type for c in connections}
        assert "POWER_A" in types
        assert "POWER_B" in types
        assert "FIBER_MM" in types

        # Check color coding
        pwr_a = next(c for c in connections if c.connection_type == "POWER_A")
        assert pwr_a.cable_color == "#3b82f6"
        pwr_b = next(c for c in connections if c.connection_type == "POWER_B")
        assert pwr_b.cable_color == "#ef4444"


@pytest.mark.asyncio
async def test_pgvector_knowledge_documents():
    """Verify knowledge documents with 1536-dimensional vector embeddings"""
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(KnowledgeDocument))
        docs = res.scalars().all()
        assert len(docs) == 3

        sop_doc = docs[0]
        assert isinstance(sop_doc.id, uuid.UUID)
        assert "SOP" in sop_doc.doc_type or "HARDWARE_MANUAL" in sop_doc.doc_type
        # Verify vector embedding dimensions
        assert len(sop_doc.embedding) == 1536
