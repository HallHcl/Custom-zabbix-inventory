from typing import Optional
from backend.app.config import settings
from backend.app.schemas import ZabbixWebLinks


def build_zabbix_web_links(host_id: Optional[str]) -> Optional[ZabbixWebLinks]:
    """
    Constructs reliable deep links to the Zabbix 7.0 Web Console for a given hostid.
    Standard Zabbix 7.0 actions:
    - Host latest data: action=latest.view&filter_hostids[]={host_id}&filter_set=1
    - Host active problems: action=problem.view&filter_hostids[]={host_id}&filter_set=1
    - Host configuration edit: action=host.edit&hostid={host_id}
    - Host performance graphs: action=charts.view&filter_hostids[]={host_id}&filter_set=1
    """
    base_url = settings.zabbix_web_console_url
    if not base_url:
        return None

    if not host_id or not str(host_id).strip():
        return ZabbixWebLinks(base_url=base_url)

    hid = str(host_id).strip()
    return ZabbixWebLinks(
        base_url=base_url,
        host_url=f"{base_url}/zabbix.php?action=host.edit&hostid={hid}",
        latest_data_url=f"{base_url}/zabbix.php?action=latest.view&filter_hostids%5B%5D={hid}&filter_set=1",
        problems_url=f"{base_url}/zabbix.php?action=problem.view&filter_hostids%5B%5D={hid}&filter_set=1",
        graphs_url=f"{base_url}/zabbix.php?action=charts.view&filter_hostids%5B%5D={hid}&filter_set=1",
    )
