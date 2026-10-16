from typing import Any, Dict, List
from fastapi import APIRouter
from backend.app.services.zabbix_service import zabbix_service
from backend.app.services.sync_service import sync_service

router = APIRouter()


@router.get("/hosts")
async def get_zabbix_host_options() -> List[Dict[str, Any]]:
    """
    Get list of all active Zabbix hosts for the dropdown picker.
    Returns: [{ hostid, name, host, ip }]
    """
    try:
        hosts = await zabbix_service.get_all_hosts()
        options = []
        for h in sorted(hosts, key=lambda x: x.get("name", "").lower()):
            ip = ""
            for iface in h.get("interfaces", []):
                if iface.get("main") == "1" or not ip:
                    ip = iface.get("ip", "")
            options.append({
                "hostid": h.get("hostid"),
                "name": h.get("name", h.get("host")),
                "technical_name": h.get("host"),
                "ip": ip,
            })
        return options
    except Exception as e:
        return []


@router.post("/sync")
async def trigger_sync():
    """Manually trigger background sync from Zabbix into Redis"""
    result = await sync_service.sync_zabbix_cache()
    return {
        "status": "success",
        "result": result,
    }
