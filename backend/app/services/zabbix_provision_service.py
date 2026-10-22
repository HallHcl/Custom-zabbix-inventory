import logging
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.models import Device, DeviceConnection, DeviceModel, Rack, Room
from backend.app.services.zabbix_service import zabbix_service
from backend.app.services.redis_service import redis_service
from backend.app.workers.zabbix_poller import poll_once

logger = logging.getLogger(__name__)

# Device Model Definitions for Real Zabbix Hardware
HARDWARE_MODELS = [
    {
        "manufacturer": "Huawei",
        "model_name": "CloudEngine 6885-48S6CQ",
        "category": "SWITCH",
        "u_height": 1,
        "typical_power_watts": 350,
        "weight_kg": 8.5,
    },
    {
        "manufacturer": "Cisco",
        "model_name": "Catalyst 9300-48P",
        "category": "SWITCH",
        "u_height": 1,
        "typical_power_watts": 450,
        "weight_kg": 7.6,
    },
    {
        "manufacturer": "Fortinet",
        "model_name": "FortiGate 701G",
        "category": "FIREWALL",
        "u_height": 2,
        "typical_power_watts": 650,
        "weight_kg": 15.2,
    },
    {
        "manufacturer": "Dell",
        "model_name": "PowerStore 5000T",
        "category": "STORAGE",
        "u_height": 3,
        "typical_power_watts": 1200,
        "weight_kg": 38.0,
    },
    {
        "manufacturer": "APC",
        "model_name": "Smart-UPS RT 10kVA",
        "category": "UPS",
        "u_height": 4,
        "typical_power_watts": 8000,
        "weight_kg": 110.0,
    },
    {
        "manufacturer": "Dell",
        "model_name": "PowerEdge R750",
        "category": "SERVER",
        "u_height": 2,
        "typical_power_watts": 750,
        "weight_kg": 24.5,
    },
    {
        "manufacturer": "HPE",
        "model_name": "ProLiant DL380 Gen10",
        "category": "SERVER",
        "u_height": 2,
        "typical_power_watts": 700,
        "weight_kg": 23.0,
    },
    {
        "manufacturer": "Cisco",
        "model_name": "UCS C220 M6",
        "category": "SERVER",
        "u_height": 1,
        "typical_power_watts": 400,
        "weight_kg": 14.0,
    },
    {
        "manufacturer": "Supermicro",
        "model_name": "SuperServer 2029U",
        "category": "SERVER",
        "u_height": 2,
        "typical_power_watts": 650,
        "weight_kg": 22.0,
    },
    {
        "manufacturer": "Docker",
        "model_name": "Containerized Service",
        "category": "SERVER",
        "u_height": 0,
        "typical_power_watts": 50,
        "weight_kg": 0.0,
    },
    {
        "manufacturer": "Generic",
        "model_name": "Generic Host",
        "category": "SERVER",
        "u_height": 1,
        "typical_power_watts": 200,
        "weight_kg": 10.0,
    },
]


def parse_location_tag(tags: Dict[str, str]) -> Tuple[Optional[str], Optional[int], Optional[int]]:
    """
    Extract rack name, start U, and height U from Zabbix Location tag.
    Example: 'Room A / Rack A01 / U34-U35' -> ('R-A01', 34, 2)
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


def resolve_model_name(name: str, host: str, tags: Dict[str, str]) -> str:
    combined = f"{name} {host} {' '.join(tags.values())}".lower()
    if "ce6885" in combined or "huawei" in combined:
        return "CloudEngine 6885-48S6CQ"
    if "c9300" in combined or "cisco" in combined and "sw" in combined:
        return "Catalyst 9300-48P"
    if "fg-701g" in combined or "fortinet" in combined:
        return "FortiGate 701G"
    if "powerstore" in combined or "san-" in combined:
        return "PowerStore 5000T"
    if "smart-ups" in combined or "ups" in combined:
        return "Smart-UPS RT 10kVA"
    if "r750" in combined or "k8s" in combined:
        return "PowerEdge R750"
    if "dl380" in combined or "pgsql" in combined:
        return "ProLiant DL380 Gen10"
    if "c220" in combined or "ad01" in combined:
        return "UCS C220 M6"
    if "supermicro" in combined or "elastic" in combined:
        return "SuperServer 2029U"
    if "docker" in combined:
        return "Containerized Service"
    return "Generic Host"


async def auto_provision_zabbix_hosts(session: AsyncSession, wipe_mock_devices: bool = True) -> Dict[str, Any]:
    """
    Wipes out mock demo devices and auto-provisions all live Zabbix 7.0 hosts into CMDB
    matching physical location tags to Racks and Slots.
    """
    logger.info("[AutoProvision] Starting Zabbix 7.0 host reconciliation and auto-provisioning...")

    # 1. Fetch Room (Data Hall Alpha)
    room_stmt = select(Room).order_by(Room.name)
    room_res = await session.execute(room_stmt)
    room = room_res.scalars().first()
    if not room:
        raise ValueError("No Datacenter room found in database")
    room_id = room.id

    # 2. Fetch all Racks in Room and build comprehensive lookup map
    rack_stmt = select(Rack)
    rack_res = await session.execute(rack_stmt)
    all_racks = rack_res.scalars().all()
    rack_map: Dict[str, Rack] = {}
    for r in all_racks:
        raw_name = r.name.upper()
        rack_map[raw_name] = r
        # Robust regex matching: 'Rack A01', 'R-A01', 'R-C01'
        m = re.search(r"(?:RACK|R)?\s*[-_]?\s*([A-Z])(\d+)", raw_name, re.IGNORECASE)
        if m:
            row_code, num_code = m.group(1).upper(), m.group(2)
            rack_map[f"{row_code}{num_code}"] = r
            rack_map[f"R-{row_code}{num_code}"] = r
            rack_map[f"RACK {row_code}{num_code}"] = r

    # 3. Ensure DeviceModels exist
    model_map: Dict[str, uuid.UUID] = {}
    for spec in HARDWARE_MODELS:
        m_stmt = select(DeviceModel).where(DeviceModel.model_name == spec["model_name"])
        m_res = await session.execute(m_stmt)
        existing = m_res.scalars().first()
        if existing:
            model_map[spec["model_name"]] = existing.id
        else:
            new_model = DeviceModel(
                manufacturer=spec["manufacturer"],
                model_name=spec["model_name"],
                category=spec["category"],
                u_height=spec["u_height"],
                typical_power_watts=spec["typical_power_watts"],
                weight_kg=spec["weight_kg"],
            )
            session.add(new_model)
            await session.flush()
            model_map[spec["model_name"]] = new_model.id

    # 4. Wipe mock devices if requested
    if wipe_mock_devices:
        logger.info("[AutoProvision] Wiping existing mock devices and connections...")
        await session.execute(delete(DeviceConnection))
        await session.execute(delete(Device))
        await session.flush()

    # 5. Fetch all live Zabbix hosts
    zabbix_hosts = await zabbix_service.get_all_hosts()
    logger.info(f"[AutoProvision] Fetched {len(zabbix_hosts)} hosts from Zabbix 7.0")

    provisioned_count = 0
    slotted_count = 0
    unslotted_count = 0

    for zh in zabbix_hosts:
        hostid = str(zh.get("hostid", ""))
        name = zh.get("name") or zh.get("host", f"Host-{hostid}")
        tech_name = zh.get("host", "")
        tags = {t.get("tag"): t.get("value", "") for t in zh.get("tags", []) if t.get("tag")}

        # Primary interface IP
        ip = ""
        for iface in zh.get("interfaces", []):
            if iface.get("main") == "1" or not ip:
                ip = iface.get("ip", "")

        # Resolve Model
        model_name = resolve_model_name(name, tech_name, tags)
        model_id = model_map.get(model_name) or model_map["Generic Host"]

        # Parse Location
        target_rack_name, start_u, height_u = parse_location_tag(tags)

        # Fallback placement for Core / Dist switches if not tagged
        if not target_rack_name:
            if "core-sw-01" in tech_name.lower():
                target_rack_name, start_u, height_u = "R-A01", 41, 1
            elif "core-sw-02" in tech_name.lower():
                target_rack_name, start_u, height_u = "R-A02", 41, 1
            elif "dist-sw-01" in tech_name.lower():
                target_rack_name, start_u, height_u = "R-B01", 41, 1
            elif "dist-sw-02" in tech_name.lower():
                target_rack_name, start_u, height_u = "R-B02", 41, 1

        rack = rack_map.get(target_rack_name) if target_rack_name else None
        rack_id = rack.id if rack else None

        # Build custom fields from Zabbix tags
        custom_fields = {
            "vendor": tags.get("Vendor") or tags.get("Brand") or "",
            "role": tags.get("Role") or "",
            "version": tags.get("Version") or "",
            "user": tags.get("User") or "",
            "platform": tags.get("Platform") or "",
            "project": tags.get("Project") or "",
            "tier": tags.get("Tier") or "",
            "zabbix_host": tech_name,
        }

        existing_dev = None
        if not wipe_mock_devices and hostid:
            dev_stmt = select(Device).where(Device.zabbix_hostid == hostid)
            dev_res = await session.execute(dev_stmt)
            existing_dev = dev_res.scalars().first()

        if existing_dev:
            existing_dev.name = name
            existing_dev.hostname = tech_name
            existing_dev.device_model_id = model_id
            existing_dev.rack_id = rack_id
            existing_dev.u_position_start = start_u
            existing_dev.management_ip = ip
            existing_dev.custom_fields = custom_fields
            existing_dev.tags = tags
        else:
            device = Device(
                device_model_id=model_id,
                rack_id=rack_id,
                room_id=room_id,
                name=name,
                hostname=tech_name,
                zabbix_hostid=hostid,
                u_position_start=start_u,
                rack_face="FRONT",
                management_ip=ip,
                status="ACTIVE",
                custom_fields=custom_fields,
                tags=tags,
            )
            session.add(device)

        provisioned_count += 1
        if rack_id and start_u:
            slotted_count += 1
        else:
            unslotted_count += 1

    await session.commit()

    # 6. Invalidate caches and trigger poller
    await redis_service.invalidate_unassigned_hosts()
    try:
        await poll_once()
    except Exception as e:
        logger.warning(f"[AutoProvision] Telemetry poll failed after provision: {e}")

    logger.info(
        f"[AutoProvision] Successfully provisioned {provisioned_count} devices "
        f"({slotted_count} slotted into racks, {unslotted_count} unslotted/virtual)."
    )

    return {
        "status": "success",
        "total_hosts": len(zabbix_hosts),
        "provisioned": provisioned_count,
        "slotted_in_racks": slotted_count,
        "unslotted_virtual": unslotted_count,
    }
