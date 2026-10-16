import pytest
from backend.app.services.zabbix_service import zabbix_service


@pytest.mark.asyncio
async def test_zabbix_connection_and_auth():
    version = await zabbix_service.get_version()
    assert version is not None
    assert isinstance(version, str)
    assert len(version) > 0

    hosts = await zabbix_service.get_all_hosts()
    assert isinstance(hosts, list)
    assert len(hosts) > 0

    print(f"\n[Zabbix Test] Connected successfully! Version: {version}, Total Monitored Hosts: {len(hosts)}")
    sample_host = hosts[0]
    print(f"[Zabbix Test] Sample Host: id={sample_host.get('hostid')}, name={sample_host.get('name')}")
