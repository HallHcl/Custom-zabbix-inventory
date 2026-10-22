import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.config import settings
from backend.app.services.zabbix_url_service import build_zabbix_web_links


def test_build_zabbix_web_links_helper():
    links = build_zabbix_web_links("10084")
    assert links is not None
    base = settings.zabbix_web_console_url
    assert links.base_url == base
    assert links.host_url == f"{base}/zabbix.php?action=host.edit&hostid=10084"
    assert links.latest_data_url == f"{base}/zabbix.php?action=latest.view&filter_hostids%5B%5D=10084&filter_set=1"
    assert links.problems_url == f"{base}/zabbix.php?action=problem.view&filter_hostids%5B%5D=10084&filter_set=1"
    assert links.graphs_url == f"{base}/zabbix.php?action=charts.view&filter_hostids%5B%5D=10084&filter_set=1"

    # Empty host ID
    empty_links = build_zabbix_web_links(None)
    assert empty_links is not None
    assert empty_links.base_url == base
    assert empty_links.host_url is None


@pytest.mark.asyncio
async def test_zabbix_status_web_console_url():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/zabbix/status")
        assert res.status_code == 200
        data = res.json()
        assert "zabbix_web_console_url" in data
        assert data["zabbix_web_console_url"] == settings.zabbix_web_console_url


@pytest.mark.asyncio
async def test_rack_elevation_devices_have_zabbix_deep_links():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        overview = await client.get("/api/v1/overview")
        assert overview.status_code == 200
        racks = overview.json()["racks"]
        assert len(racks) > 0
        target_rack = racks[0]

        elev = await client.get(f"/api/v1/racks/{target_rack['id']}/elevation")
        assert elev.status_code == 200
        elev_data = elev.json()
        assert "devices" in elev_data
        for dev in elev_data["devices"]:
            assert "zabbix_web_links" in dev
            if dev.get("zabbix_host_id"):
                links = dev["zabbix_web_links"]
                assert links is not None
                assert links["latest_data_url"] is not None
                assert links["problems_url"] is not None
                assert str(dev["zabbix_host_id"]) in links["latest_data_url"]


@pytest.mark.asyncio
async def test_device_overview_has_zabbix_deep_links():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        devs_res = await client.get("/api/v1/devices")
        assert devs_res.status_code == 200
        devs = devs_res.json()
        assert len(devs) > 0

        # Find one device linked to Zabbix or test first device
        target = next((d for d in devs if d.get("zabbix_host_id")), devs[0])
        detail_res = await client.get(f"/api/v1/devices/{target['id']}/overview")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert "zabbix_web_links" in detail
        if target.get("zabbix_host_id"):
            links = detail["zabbix_web_links"]
            assert links is not None
            assert links["latest_data_url"] is not None
            assert links["problems_url"] is not None


@pytest.mark.asyncio
async def test_unassigned_hosts_have_zabbix_deep_links():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/zabbix/unassigned-hosts")
        assert res.status_code == 200
        data = res.json()
        assert "hosts" in data
        for h in data["hosts"]:
            assert "zabbix_web_links" in h
            links = h["zabbix_web_links"]
            assert links is not None
            assert h["hostid"] in links["latest_data_url"]
            assert h["hostid"] in links["problems_url"]
