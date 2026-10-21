from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.db.models import Device
from backend.app.schemas import UnassignedHostResponse, UnassignedHostsOverview
from backend.app.services.zabbix_service import zabbix_service
from backend.app.services.sync_service import sync_service
from backend.app.services.redis_service import redis_service

router = APIRouter()


def infer_device_type(groups: List[str], tags: Dict[str, str], name: str) -> str:
    combined = f"{' '.join(groups)} {' '.join(tags.keys())} {' '.join(tags.values())} {name}".lower()
    if any(k in combined for k in ["switch", "cisco", "huawei", "arista", "juniper", "nexus"]):
        return "Switch"
    if any(k in combined for k in ["firewall", "fortigate", "forti", "fg-", "fw-", "paloalto", "palo", "pa-", "pfsense", "vpn", "router"]):
        return "Firewall"
    if any(k in combined for k in ["storage", "san", "nas", "powerstore", "synology", "qnap", "netapp"]):
        return "Storage"
    if any(k in combined for k in ["ups", "pdu", "apc", "eaton", "vertiv"]):
        return "UPS"
    if any(k in combined for k in ["patch panel", "patch"]):
        return "Patch Panel"
    return "Server"


def parse_interface_type(type_val: Any) -> str:
    # 1=Agent, 2=SNMP, 3=IPMI, 4=JMX
    mapping = {"1": "Agent", "2": "SNMP", "3": "IPMI", "4": "JMX", 1: "Agent", 2: "SNMP", 3: "IPMI", 4: "JMX"}
    return mapping.get(str(type_val), "Agent")


@router.get("/unracked-hosts", response_model=UnassignedHostsOverview)
@router.get("/unassigned-hosts", response_model=UnassignedHostsOverview)
async def get_unassigned_hosts(
    force_refresh: bool = Query(False, description="Bypass Redis cache and query Zabbix directly"),
    search: Optional[str] = Query(None, description="Search by name, technical name, or IP"),
    device_type: Optional[str] = Query(None, description="Filter by suggested device type"),
    db: AsyncSession = Depends(get_db),
):
    """
    Reconciliation Diff Engine:
    Cross-matches live/discovered Zabbix hosts against DCIM registered devices to return
    hosts discovered by Zabbix that haven't been assigned to a Rack slot yet.
    """
    # 1. Check Redis Cache if not forcing refresh and no ad-hoc filter
    cached_data = None if force_refresh else await redis_service.get_unassigned_hosts()
    raw_hosts: List[Dict[str, Any]] = []

    if cached_data and "hosts" in cached_data:
        raw_hosts = cached_data["hosts"]
        is_cached = True
    else:
        is_cached = False
        # Query registered devices in PostgreSQL
        stmt = select(Device.zabbix_hostid).where(Device.zabbix_hostid.isnot(None))
        result = await db.execute(stmt)
        assigned_ids = {str(row[0]) for row in result.all() if row[0]}

        # Query all live Zabbix hosts
        try:
            all_zabbix_hosts = await zabbix_service.get_all_hosts()
        except Exception:
            all_zabbix_hosts = []

        if not all_zabbix_hosts:
            # Fallback to simulated auto-discovered hosts if Zabbix has none unracked
            simulated = zabbix_service.get_unassigned_hosts()
            for sim in simulated:
                if sim["zabbix_hostid"] not in assigned_ids:
                    all_zabbix_hosts.append({
                        "hostid": sim["zabbix_hostid"],
                        "host": sim["hostname"],
                        "name": f"{sim['vendor']} {sim['model']}",
                        "interfaces": [{"ip": sim["ip_address"], "main": "1", "type": "1"}],
                        "tags": [{"tag": "Category", "value": sim["category"]}],
                        "hostgroups": [{"name": sim["category"]}],
                    })

        # Get problems to classify status
        problems = await redis_service.get_active_problems()
        if problems is None:
            try:
                problems = await zabbix_service.get_active_problems()
            except Exception:
                problems = []

        # Problem count map by hostid
        problems_map: Dict[str, List[int]] = {}
        for p in problems or []:
            for h in p.get("hosts", []):
                hid = str(h.get("hostid", ""))
                if hid:
                    problems_map.setdefault(hid, []).append(int(p.get("priority", 0)))

        # Filter out hosts already assigned to a rack
        for h in all_zabbix_hosts:
            hid = str(h.get("hostid", ""))
            if not hid or hid in assigned_ids:
                continue

            # Extract main interface info
            ip = ""
            dns = None
            port = None
            iface_type = "Agent"
            for iface in h.get("interfaces", []):
                if iface.get("main") == "1" or not ip:
                    ip = iface.get("ip", "")
                    dns = iface.get("dns") or None
                    port = iface.get("port") or None
                    iface_type = parse_interface_type(iface.get("type", 1))

            groups = [g.get("name") for g in h.get("hostgroups", []) if g.get("name")]
            tags = {t.get("tag"): t.get("value", "") for t in h.get("tags", []) if t.get("tag")}
            name = h.get("name") or h.get("host", "")
            tech_name = h.get("host", "")

            # Health status classification
            host_priorities = problems_map.get(hid, [])
            if host_priorities:
                max_sev = max(host_priorities)
                status = "critical" if max_sev >= 3 else "warning"
            else:
                status = "ok"

            suggested_type = infer_device_type(groups, tags, name)

            raw_hosts.append({
                "hostid": hid,
                "name": name,
                "technical_name": tech_name,
                "ip": ip,
                "dns": dns,
                "port": port,
                "interface_type": iface_type,
                "groups": groups,
                "tags": tags,
                "suggested_device_type": suggested_type,
                "status": status,
                "problems_count": len(host_priorities),
            })

        # Cache unassigned hosts in Redis (60s TTL)
        await redis_service.cache_unassigned_hosts({
            "total_unassigned": len(raw_hosts),
            "hosts": raw_hosts,
        }, ttl=60)

    # 2. Apply filtering if requested
    filtered = raw_hosts
    if search:
        s = search.lower()
        filtered = [
            h for h in filtered
            if s in h.get("name", "").lower()
            or s in h.get("technical_name", "").lower()
            or s in h.get("ip", "").lower()
        ]

    if device_type:
        dt = device_type.lower()
        filtered = [
            h for h in filtered
            if dt == h.get("suggested_device_type", "").lower()
        ]

    # Convert to response objects
    items = [UnassignedHostResponse(**h) for h in filtered]

    return UnassignedHostsOverview(
        total_unassigned=len(raw_hosts),
        hosts=items,
        cached=is_cached,
    )


@router.get("/hosts")
async def get_zabbix_host_options() -> List[Dict[str, Any]]:
    """
    Get list of all active Zabbix hosts for dropdown picker.
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
    except Exception:
        return []


@router.post("/sync")
async def trigger_sync():
    """Manually trigger background sync from Zabbix into Redis"""
    result = await sync_service.sync_zabbix_cache()
    # Invalidate unassigned hosts cache on manual sync
    await redis_service.invalidate_unassigned_hosts()
    return {
        "status": "success",
        "result": result,
    }

