import pytest
from httpx import ASGITransport, AsyncClient
from starlette.testclient import TestClient
from sqlalchemy import select

from backend.app.main import app
from backend.app.db.session import AsyncSessionLocal
from backend.app.db.models import Device
from backend.app.services.zabbix_service import zabbix_service
from backend.app.services.redis_service import redis_service
from backend.app.services.blast_radius_service import blast_radius_service
from backend.app.workers.zabbix_poller import poll_once


@pytest.mark.asyncio
async def test_zabbix_telemetry_simulator():
    """Verify Telemetry Simulator generates realistic thermal, power, and PUE data"""
    # 1. Rack Telemetry
    rack_data = zabbix_service.get_rack_telemetry("rack-1", "R-A01", 8000)
    assert 18.0 <= rack_data["inlet_temp_c"] <= 35.0
    assert rack_data["exhaust_temp_c"] > rack_data["inlet_temp_c"]
    assert "delta_t_c" in rack_data
    assert "pdu_a_watts" in rack_data
    assert "pdu_b_watts" in rack_data
    assert "redundancy_failover_risk" in rack_data
    assert "thermal_status" in rack_data

    # 2. Device Telemetry
    dev_data = zabbix_service.get_device_telemetry("dev-1", "10001", "SRV-COMPUTE-01")
    assert 0.0 <= dev_data["cpu_util_pct"] <= 100.0
    assert 0.0 <= dev_data["memory_util_pct"] <= 100.0
    assert dev_data["power_watts"] > 0
    assert "ping_latency_ms" in dev_data

    # 3. Facility PUE Metrics
    fac_data = zabbix_service.get_facility_metrics(145.0)
    assert 1.0 <= fac_data["pue"] <= 2.2
    assert "pue_efficiency_rating" in fac_data


@pytest.mark.asyncio
async def test_background_poller_and_redis_cache():
    """Verify Zabbix Poller refreshes and caches 24 racks, 77 devices, and facility PUE in Redis"""
    result = await poll_once()
    assert result["racks_count"] == 24
    assert result["devices_count"] >= 60
    assert result["facility_pue"] > 1.0

    # Verify Redis keys
    fac = await redis_service.get_facility_telemetry()
    assert fac is not None
    assert "pue" in fac

    racks = await redis_service.get_all_racks_telemetry()
    assert racks is not None
    assert len(racks) == 24


@pytest.mark.asyncio
async def test_blast_radius_and_single_corded_risk():
    """Verify graph traversal for ToR switch blast radius and PDU single-corded risk detection"""
    async with AsyncSessionLocal() as session:
        # Find ToR switch in R-A01
        res = await session.execute(select(Device).where(Device.name == "SW-TOR-R-A01"))
        tor_sw = res.scalar_one_or_none()
        assert tor_sw is not None

        # Find PDU-A in R-A01
        res = await session.execute(select(Device).where(Device.name == "PDU-A-R-A01"))
        pdu_a = res.scalar_one_or_none()
        assert pdu_a is not None

    # Test Switch Blast Radius
    sw_blast = await blast_radius_service.calculate_blast_radius(tor_sw.id)
    assert sw_blast["affected_devices_count"] > 0
    assert len(sw_blast["affected_departments"]) > 0
    assert len(sw_blast["affected_projects"]) > 0

    # Test PDU Single-Corded Detection
    pdu_blast = await blast_radius_service.calculate_blast_radius(pdu_a.id)
    assert len(pdu_blast["single_corded_power_risks"]) >= 1
    assert len(pdu_blast["affected_servers"]) >= 1


@pytest.mark.asyncio
async def test_webhook_receiver_alarm_correlation():
    """Verify POST /api/v1/webhooks/zabbix-event correlates alarms and publishes to Redis"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "event_id": "99881",
            "event_status": "1",
            "severity": 4,
            "zabbix_hostid": "10001",
            "hostname": "sw-tor-r-a01.dc.internal",
            "trigger_name": "Optical Transceiver High Temperature > 70C",
            "item_name": "Te1/0/1 transceiver temp",
            "item_value": "74.5",
            "timestamp": "2026-10-21T09:30:00Z",
        }
        res = await client.post("/api/v1/webhooks/zabbix-event", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["is_root_cause"] is True
        assert data["correlation_status"] == "ROOT_CAUSE"
        assert data["suppressed_children_count"] > 0


def test_websocket_live_twin():
    """Verify WebSocket connection, initial state transmission, and ping/pong"""
    with TestClient(app) as client:
        with client.websocket_connect("/ws/live-twin") as ws:
            # 1. First frame must be INITIAL_STATE
            initial = ws.receive_json()
            assert initial.get("event_type") == "INITIAL_STATE"
            assert "facility" in initial
            assert "racks_summary" in initial

            # 2. Ping / Pong
            ws.send_text("ping")
            reply = ws.receive_text()
            assert reply == "pong"


@pytest.mark.asyncio
async def test_zabbix_unracked_hosts_inbox():
    """Verify GET /api/v1/zabbix/unracked-hosts returns pending auto-discovered hosts"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/zabbix/unracked-hosts")
        assert res.status_code == 200
        data = res.json()
        assert "total_unassigned" in data
        assert "hosts" in data
        assert isinstance(data["hosts"], list)
