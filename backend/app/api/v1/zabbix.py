import re
from typing import Any, Dict, List, Optional, Tuple
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.db.models import Device
from backend.app.schemas import (
    UnassignedHostResponse,
    UnassignedHostsOverview,
    ZabbixConnectionStatus,
    ZabbixHostGroupOption,
    ZabbixTemplateOption,
    ZabbixHostCreateRequest,
    ZabbixHostCreateResponse,
)
from backend.app.services.zabbix_service import zabbix_service
from backend.app.services.sync_service import sync_service
from backend.app.services.redis_service import redis_service
from backend.app.services.zabbix_url_service import build_zabbix_web_links

router = APIRouter()


def parse_location_tag(tags: Dict[str, str]) -> Tuple[Optional[str], Optional[int], Optional[int]]:
    """
    Extract suggested rack name, start U, and height U from Zabbix Location tag.
    Example: 'Room A / Rack A01 / U38-U39' -> ('R-A01', 38, 2)
    """
    loc_str = tags.get("Location") or tags.get("location") or ""
    if not loc_str:
        return None, None, None

    rack_name = None
    rack_match = re.search(r"Rack\s+([A-Za-z0-9]+)", loc_str, re.IGNORECASE)
    if rack_match:
        raw_r = rack_match.group(1).upper()
        rack_name = f"R-{raw_r}" if not raw_r.startswith("R-") else raw_r

    start_u = None
    height_u = None
    u_range = re.search(r"U(\d+)(?:-U?(\d+))?", loc_str, re.IGNORECASE)
    if u_range:
        u1 = int(u_range.group(1))
        u2 = int(u_range.group(2)) if u_range.group(2) else u1
        start_u = min(u1, u2)
        height_u = abs(u2 - u1) + 1

    return rack_name, start_u, height_u


def infer_device_type(groups: List[str], tags: Dict[str, str], name: str) -> str:
    combined = f"{' '.join(groups)} {' '.join(tags.keys())} {' '.join(tags.values())} {name}".lower()

    # 1. Firewalls
    if any(k in combined for k in ["firewall", "fortigate", "forti", "fg-", "fw-", "paloalto", "palo", "pa-", "pfsense"]):
        return "Firewall"

    # 2. Storage
    if any(k in combined for k in ["storage", "san-", "nas-", "powerstore", "synology", "qnap", "netapp", "purestorage"]):
        return "Storage"

    # 3. UPS & PDU
    if any(k in combined for k in ["smart-ups", "ups-", "pdu", "apc", "eaton", "vertiv", "tripplite"]):
        return "UPS"

    # 4. Patch Panels
    if any(k in combined for k in ["patch panel", "patch-panel", "patch"]):
        return "Patch Panel"

    # 5. Servers (Prioritized before generic switch vendor match to prevent Cisco UCS / HPE / Dell servers from becoming Switch)
    server_indicators = [
        "srv-", "server", "k8s", "worker", "master", "node", "compute",
        "dl380", "r750", "r650", "poweredge", "proliant", "ucs c", "supermicro",
        "elastic", "pgsql", "database", "win-ad", "ad01", "docker:"
    ]
    if any(k in combined for k in server_indicators):
        return "Server"

    # 6. Switches
    if any(k in combined for k in ["switch", "cisco", "huawei", "arista", "juniper", "nexus", "tor-", "core-sw", "dist-sw", "ce68"]):
        return "Switch"

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

        if not all_zabbix_hosts and settings.SIMULATE_ZABBIX_TELEMETRY:
            # Fallback to simulated auto-discovered hosts ONLY when simulation mode is explicitly enabled
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
            hid = str(h.get("hostid", "")).strip()
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
            brand = tags.get("Brand") or tags.get("Vendor") or None
            sug_rack, sug_start_u, sug_height_u = parse_location_tag(tags)

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
                "brand": brand,
                "suggested_rack_name": sug_rack,
                "suggested_start_u": sug_start_u,
                "suggested_height_u": sug_height_u,
                "status": status,
                "problems_count": len(host_priorities),
                "zabbix_web_links": build_zabbix_web_links(hid).model_dump() if build_zabbix_web_links(hid) else None,
            })

        # Cache unassigned hosts in Redis (60s TTL)
        await redis_service.cache_unassigned_hosts({
            "total_unassigned": len(raw_hosts),
            "hosts": raw_hosts,
        }, ttl=60)

    # 2. Apply filtering if requested
    filtered = raw_hosts
    if search and isinstance(search, str):
        s = search.lower().strip()
        filtered = [
            h for h in filtered
            if s in h.get("name", "").lower()
            or s in h.get("technical_name", "").lower()
            or s in h.get("ip", "").lower()
            or s in (h.get("suggested_rack_name") or "").lower()
            or s in (h.get("brand") or "").lower()
        ]

    if device_type and isinstance(device_type, str):
        dt = device_type.lower().strip()
        filtered = [
            h for h in filtered
            if dt == h.get("suggested_device_type", "").lower()
        ]

    # Convert to response objects, ensuring zabbix_web_links is populated
    for h in filtered:
        if not h.get("zabbix_web_links"):
            links = build_zabbix_web_links(h.get("hostid"))
            h["zabbix_web_links"] = links.model_dump() if links else None

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


@router.get("/status", response_model=ZabbixConnectionStatus)
async def get_zabbix_status():
    """
    Get real-time Zabbix connectivity status and sync metadata.
    Evaluates CONNECTED (<=120s), STALE (120s-600s), or DISCONNECTED (>600s).
    """
    status_data = await sync_service.get_sync_status()
    return ZabbixConnectionStatus(**status_data)


@router.post("/auto-provision")
async def trigger_auto_provision(
    wipe_mock_devices: bool = Query(True, description="Wipe old demo mock devices before provisioning"),
    db: AsyncSession = Depends(get_db),
):
    """
    Auto-provision real Zabbix 7.0 hosts into CMDB:
    - Cleans out mock demo devices
    - Ensures proper hardware DeviceModels exist
    - Slots hosts into Racks based on Zabbix Location tags
    - Registers virtual/container hosts
    """
    from backend.app.services.zabbix_provision_service import auto_provision_zabbix_hosts
    result = await auto_provision_zabbix_hosts(db, wipe_mock_devices=wipe_mock_devices)
    return result


@router.get("/hostgroups", response_model=List[ZabbixHostGroupOption])
async def list_zabbix_hostgroups():
    """List available host groups from Zabbix for host creation"""
    try:
        groups = await zabbix_service.get_host_groups()
        return [
            ZabbixHostGroupOption(groupid=str(g["groupid"]), name=g["name"])
            for g in groups
            if "groupid" in g and "name" in g
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch host groups: {str(e)}")


@router.get("/templates", response_model=List[ZabbixTemplateOption])
async def list_zabbix_templates(search: Optional[str] = Query(None, description="Search templates by name")):
    """List available templates from Zabbix for host creation"""
    try:
        templates = await zabbix_service.get_templates(search=search)
        return [
            ZabbixTemplateOption(
                templateid=str(t["templateid"]),
                name=t.get("name", t.get("host", "")),
                host=t.get("host", ""),
            )
            for t in templates
            if "templateid" in t
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch templates: {str(e)}")


@router.post("/hosts", response_model=ZabbixHostCreateResponse)
async def create_zabbix_host(
    payload: ZabbixHostCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new Host in Zabbix 7.0 and optionally mount into DCIM Rack (Step 4 of Stepper).
    """
    # 1. Format payload for Zabbix host.create
    groups_payload = [{"groupid": str(gid)} for gid in payload.group_ids]
    templates_payload = [{"templateid": str(tid)} for tid in (payload.template_ids or [])]
    interfaces_payload = []
    primary_ip = ""

    for iface in payload.interfaces:
        if_data: Dict[str, Any] = {
            "type": iface.type,
            "main": iface.main,
            "useip": iface.useip,
            "ip": iface.ip,
            "dns": iface.dns,
            "port": str(iface.port),
        }
        if iface.type == 2 and iface.details:  # SNMP
            if_data["details"] = iface.details
        interfaces_payload.append(if_data)
        if iface.main == 1 or not primary_ip:
            primary_ip = iface.ip

    # Tags handling
    tags_dict = dict(payload.tags or {})

    # 2. Check DCIM rack collision first if mount is requested
    rack_obj = None
    if payload.mount_rack_id and payload.mount_start_u:
        from backend.app.api.v1.devices import resolve_rack, validate_slot_and_collision
        rack_obj = await resolve_rack(payload.mount_rack_id, db)
        if not rack_obj:
            raise HTTPException(status_code=404, detail=f"Rack '{payload.mount_rack_id}' not found in DCIM")

        height_u = payload.mount_height_u or 1
        await validate_slot_and_collision(
            rack=rack_obj,
            start_u=payload.mount_start_u,
            height_u=height_u,
            face=payload.mount_position_face or "Front",
            db=db,
        )

        # Populate Location tag in Zabbix
        end_u = payload.mount_start_u + height_u - 1
        u_str = f"U{payload.mount_start_u}" if height_u == 1 else f"U{payload.mount_start_u}-U{end_u}"
        tags_dict["Location"] = f"Rack {rack_obj.name} / {u_str}"

    tags_payload = [{"tag": k, "value": v} for k, v in tags_dict.items()]

    zabbix_params: Dict[str, Any] = {
        "host": payload.host,
        "name": payload.name or payload.host,
        "groups": groups_payload,
        "interfaces": interfaces_payload,
        "status": payload.status,
    }
    if templates_payload:
        zabbix_params["templates"] = templates_payload
    if tags_payload:
        zabbix_params["tags"] = tags_payload
    if payload.description:
        zabbix_params["description"] = payload.description

    # 3. Call Zabbix API
    try:
        zabbix_res = await zabbix_service.create_host(zabbix_params)
        created_hostids = zabbix_res.get("hostids", [])
        if not created_hostids:
            raise RuntimeError("Zabbix API did not return hostid")
        created_hostid = str(created_hostids[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Zabbix host creation failed: {str(e)}")

    # 4. If DCIM mount was requested, register Device in PostgreSQL
    created_device_id = None
    rack_name = None
    if rack_obj and payload.mount_start_u:
        from backend.app.api.v1.devices import resolve_or_create_device_model
        from backend.app.db.models import Room

        height_u = payload.mount_height_u or 1
        dm_id = await resolve_or_create_device_model(
            model_name=payload.model,
            manufacturer=payload.manufacturer,
            device_type=payload.device_type or "Server",
            height_u=height_u,
            db=db,
        )
        room_id = rack_obj.row.room_id if rack_obj.row and rack_obj.row.room_id else None
        if not room_id:
            first_room = (await db.execute(select(Room).limit(1))).scalar_one_or_none()
            if first_room:
                room_id = first_room.id

        new_device = Device(
            rack_id=rack_obj.id,
            room_id=room_id,
            device_model_id=dm_id,
            name=payload.name or payload.host,
            device_type=payload.device_type or "Server",
            model=payload.model,
            manufacturer=payload.manufacturer,
            start_u=payload.mount_start_u,
            height_u=height_u,
            position_face=(payload.mount_position_face or "Front").upper(),
            ip_address=primary_ip,
            zabbix_host_id=created_hostid,
            status="Active",
            tags=tags_dict,
        )
        db.add(new_device)
        await db.commit()
        await db.refresh(new_device)
        created_device_id = str(new_device.id)
        rack_name = rack_obj.name

    # 5. Invalidate caches
    await redis_service.invalidate_unassigned_hosts()

    return ZabbixHostCreateResponse(
        hostid=created_hostid,
        host=payload.host,
        name=payload.name or payload.host,
        message=f"Host '{payload.host}' created successfully in Zabbix" + (f" and mounted into {rack_name}" if rack_name else ""),
        device_id=created_device_id,
        rack_name=rack_name,
        status="success",
    )



