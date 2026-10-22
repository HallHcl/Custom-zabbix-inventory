import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.services.zabbix_service import zabbix_service


def test_cpu_direct_utilization_priority():
    items = [
        {"itemid": "1", "name": "Context switches", "key_": "system.cpu.switches", "lastvalue": "1957", "units": ""},
        {"itemid": "2", "name": "Interrupts", "key_": "system.cpu.intr", "lastvalue": "1309", "units": ""},
        {"itemid": "3", "name": "CPU idle time", "key_": "system.cpu.util[,idle]", "lastvalue": "96.4", "units": "%"},
        {"itemid": "4", "name": "CPU utilization", "key_": "system.cpu.util", "lastvalue": "3.6", "units": "%"},
    ]
    res = zabbix_service.resolve_telemetry_metrics(items)
    assert res.cpu_utilization == 3.6
    assert res.cpu_item_id == "4"
    assert res.cpu_is_idle is False


def test_cpu_inverted_idle_fallback():
    items = [
        {"itemid": "1", "name": "Context switches", "key_": "system.cpu.switches", "lastvalue": "1957", "units": ""},
        {"itemid": "2", "name": "CPU idle time", "key_": "system.cpu.util[,idle]", "lastvalue": "92.3", "units": "%"},
    ]
    res = zabbix_service.resolve_telemetry_metrics(items)
    assert res.cpu_utilization == 7.7
    assert res.cpu_item_id == "2"
    assert res.cpu_is_idle is True


def test_cpu_combined_user_and_system():
    items = [
        {"itemid": "1", "name": "CPU user time", "key_": "system.cpu.util[,user]", "lastvalue": "10.5", "units": "%"},
        {"itemid": "2", "name": "CPU system time", "key_": "system.cpu.util[,system]", "lastvalue": "4.5", "units": "%"},
    ]
    res = zabbix_service.resolve_telemetry_metrics(items)
    assert res.cpu_utilization == 15.0


def test_cpu_docker_container():
    items = [
        {"itemid": "10", "name": "Container CPU Usage (%): app", "key_": "docker.cpu_pct[app]", "lastvalue": "14.2", "units": "%"},
    ]
    res = zabbix_service.resolve_telemetry_metrics(items)
    assert res.cpu_utilization == 14.2
    assert res.cpu_item_id == "10"
    assert res.cpu_is_idle is False


def test_memory_raw_bytes_rejection_and_direct_util():
    # If vm.memory.size[available] in raw bytes is listed before vm.memory.util,
    # the resolver must reject the raw bytes and pick vm.memory.util!
    items = [
        {"itemid": "1", "name": "Available memory", "key_": "vm.memory.size[available]", "lastvalue": "8458633216", "units": "B"},
        {"itemid": "2", "name": "Total memory", "key_": "vm.memory.size[total]", "lastvalue": "12268797952", "units": "B"},
        {"itemid": "3", "name": "Memory utilization", "key_": "vm.memory.util", "lastvalue": "31.1", "units": "%"},
    ]
    res = zabbix_service.resolve_telemetry_metrics(items)
    assert res.memory_utilization == 31.1


def test_memory_inverted_pavailable():
    items = [
        {"itemid": "1", "name": "Available memory", "key_": "vm.memory.size[available]", "lastvalue": "8458633216", "units": "B"},
        {"itemid": "2", "name": "Available memory in %", "key_": "vm.memory.size[pavailable]", "lastvalue": "68.9", "units": "%"},
    ]
    res = zabbix_service.resolve_telemetry_metrics(items)
    assert res.memory_utilization == 31.1


def test_memory_computed_from_bytes_ratio():
    items = [
        {"itemid": "1", "name": "Available memory", "key_": "vm.memory.size[available]", "lastvalue": "2000000000", "units": "B"},
        {"itemid": "2", "name": "Total memory", "key_": "vm.memory.size[total]", "lastvalue": "10000000000", "units": "B"},
    ]
    res = zabbix_service.resolve_telemetry_metrics(items)
    assert res.memory_utilization == 80.0


def test_temperature_filtering():
    items = [
        {"itemid": "1", "name": "Fan Speed", "key_": "sensor.fans.speed", "lastvalue": "3500", "units": "RPM"},
        {"itemid": "2", "name": "Power Supply Temp", "key_": "sensor.temp.psu", "lastvalue": "45.0", "units": "°C"},
        {"itemid": "3", "name": "Inlet Temperature", "key_": "sensor.temp.inlet", "lastvalue": "24.5", "units": "°C"},
    ]
    res = zabbix_service.resolve_telemetry_metrics(items)
    # sensor.temp.inlet matches and is within valid range
    assert res.temperature_c in (45.0, 24.5)


@pytest.mark.asyncio
async def test_api_device_metrics_bounded():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        devices_resp = await client.get("/api/v1/devices")
        assert devices_resp.status_code == 200
        devices = devices_resp.json()
        assert len(devices) > 0
        target = devices[0]

        res = await client.get(f"/api/v1/devices/{target['id']}/metrics")
        assert res.status_code == 200
        data = res.json()
        if data.get("cpu_utilization") is not None:
            assert 0.0 <= data["cpu_utilization"] <= 100.0
        if data.get("memory_utilization") is not None:
            assert 0.0 <= data["memory_utilization"] <= 100.0
        if data.get("temperature_c") is not None:
            assert -20.0 <= data["temperature_c"] <= 150.0
