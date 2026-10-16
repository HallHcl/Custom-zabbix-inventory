from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.session import get_db
from backend.app.db.models import Room, Rack, Device
from backend.app.services.redis_service import redis_service
from backend.app.schemas import RoomOverviewResponse, RackSummary

router = APIRouter()


@router.get("", response_model=RoomOverviewResponse)
async def get_room_overview(
    room_name: str = "Room A",
    db: AsyncSession = Depends(get_db)
):
    """
    Get 3D / Isometric Floor Plan Overview with aggregated rack statuses.
    Single round-trip, zero N+1 queries.
    """
    # 1. Fetch Room with Racks and Devices
    stmt = (
        select(Room)
        .where(Room.name == room_name)
        .options(
            selectinload(Room.site),
            selectinload(Room.racks).selectinload(Rack.devices),
        )
    )
    result = await db.execute(stmt)
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail=f"Room '{room_name}' not found")

    # 2. Collect all zabbix_host_ids across all devices in the room
    all_zabbix_ids = set()
    total_devices_count = 0
    for rack in room.racks:
        total_devices_count += len(rack.devices)
        for dev in rack.devices:
            if dev.zabbix_host_id:
                all_zabbix_ids.add(dev.zabbix_host_id)

    # 3. Batch fetch Zabbix host statuses from Redis (MGET)
    zabbix_summaries = await redis_service.get_hosts_summaries(list(all_zabbix_ids))
    active_problems = await redis_service.get_active_problems() or []

    # 4. Roll-up status per rack
    status_counts = {"healthy": 0, "warning": 0, "critical": 0, "offline": 0}
    racks_summary: List[RackSummary] = []

    for rack in sorted(room.racks, key=lambda r: (r.row, r.col)):
        used_u = sum(d.height_u for d in rack.devices)
        usage_pct = round((used_u / rack.total_u) * 100, 1) if rack.total_u > 0 else 0.0

        # Roll-up rack status from devices
        worst_sev = 0
        has_warning = False
        has_critical = False

        for dev in rack.devices:
            if dev.zabbix_host_id and dev.zabbix_host_id in zabbix_summaries:
                h_summary = zabbix_summaries[dev.zabbix_host_id]
                sev = h_summary.get("highest_severity", 0)
                if sev > worst_sev:
                    worst_sev = sev
                if h_summary.get("status") == "critical":
                    has_critical = True
                elif h_summary.get("status") == "warning":
                    has_warning = True

        if has_critical:
            rack_status = "critical"
        elif has_warning:
            rack_status = "warning"
        else:
            rack_status = "healthy"

        status_counts[rack_status] = status_counts.get(rack_status, 0) + 1

        # Calculate estimated power & inlet temp
        power_kw = round(1.2 + (len(rack.devices) * 0.2), 1)
        inlet_temp = round(room.room_temp_target + (len(rack.devices) * 0.18), 1)

        racks_summary.append(
            RackSummary(
                id=rack.id,
                name=rack.name,
                row=rack.row,
                col=rack.col,
                total_u=rack.total_u,
                used_u=used_u,
                usage_percent=usage_pct,
                power_kw=power_kw,
                inlet_temp_c=inlet_temp,
                device_count=len(rack.devices),
                status=rack_status,
                highest_severity=worst_sev,
            )
        )

    # 5. Build recent alerts list and severity counts
    recent_alerts = []
    severity_counts = {
        "disaster": 0,
        "high": 0,
        "average": 0,
        "warning": 0,
        "info": 0,
        "unclassified": 0,
    }

    for p in active_problems:
        pri = int(p.get("priority", 0))
        if pri == 5:
            severity_counts["disaster"] += 1
        elif pri == 4:
            severity_counts["high"] += 1
        elif pri == 3:
            severity_counts["average"] += 1
        elif pri == 2:
            severity_counts["warning"] += 1
        elif pri == 1:
            severity_counts["info"] += 1
        else:
            severity_counts["unclassified"] += 1

    for p in active_problems[:250]:
        recent_alerts.append({
            "triggerid": p.get("triggerid"),
            "description": p.get("description"),
            "priority": int(p.get("priority", 0)),
            "host_name": p.get("hosts", [{}])[0].get("name", "Unknown") if p.get("hosts") else "Unknown",
            "lastchange": p.get("lastchange"),
        })

    total_power = round(sum(r.power_kw for r in racks_summary), 1)
    total_used_u = sum(r.used_u for r in racks_summary)
    total_cap_u = sum(r.total_u for r in racks_summary)

    return RoomOverviewResponse(
        site_name=room.site.name if room.site else "Data Center",
        room_name=room.name,
        room_temp_c=room.room_temp_target,
        total_racks=len(room.racks),
        total_devices=total_devices_count,
        total_alerts=len(active_problems),
        total_power_kw=total_power,
        total_used_u=total_used_u,
        total_capacity_u=total_cap_u,
        status_counts=status_counts,
        severity_counts=severity_counts,
        racks=racks_summary,
        recent_alerts=recent_alerts,
    )
