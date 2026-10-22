import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.session import get_db
from backend.app.db.models import Rack, Row, Room, Device
from backend.app.services.redis_service import redis_service
from backend.app.schemas import (
    RackSummary,
    RackElevationResponse,
    DeviceResponse,
    ZabbixStatusSummary,
    BrandInfo,
)
from backend.app.services.brand_service import resolve_brand_metadata
from backend.app.services.zabbix_url_service import build_zabbix_web_links

router = APIRouter()


@router.get("", response_model=List[RackSummary])
async def list_racks(
    room_id: Optional[str] = Query(None, description="Filter by Room ID or omit for all"),
    db: AsyncSession = Depends(get_db)
):
    """List all racks with status summaries"""
    stmt = (
        select(Rack)
        .options(
            selectinload(Rack.row),
            selectinload(Rack.devices).selectinload(Device.device_model),
        )
    )

    if room_id:
        try:
            r_uuid = uuid.UUID(str(room_id))
            stmt = stmt.join(Rack.row).where(Row.room_id == r_uuid)
        except Exception:
            pass  # If room_id is numeric like 1, return all racks

    result = await db.execute(stmt)
    racks = result.scalars().all()

    # Batch fetch Zabbix host statuses
    all_zabbix_ids = [d.zabbix_host_id for r in racks for d in r.devices if d.zabbix_host_id]
    zabbix_summaries = await redis_service.get_hosts_summaries(all_zabbix_ids)

    summaries = []
    for rack in sorted(racks, key=lambda r: (r.row_letter, r.col_number)):
        used_u = sum(d.height_u for d in rack.devices)
        usage_pct = round((used_u / rack.total_u) * 100, 1) if rack.total_u > 0 else 0.0

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

        status = "critical" if has_critical else ("warning" if has_warning else "healthy")

        summaries.append(
            RackSummary(
                id=str(rack.id),
                name=rack.name,
                row=rack.row_letter,
                col=rack.col_number,
                total_u=rack.total_u,
                used_u=used_u,
                usage_percent=usage_pct,
                power_kw=round(1.2 + (len(rack.devices) * 0.2), 1),
                inlet_temp_c=round(24.5 + (len(rack.devices) * 0.18), 1),
                device_count=len(rack.devices),
                status=status,
                highest_severity=worst_sev,
            )
        )
    return summaries


@router.get("/{rack_id}/elevation", response_model=RackElevationResponse)
async def get_rack_elevation(rack_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get full 42U Rack Elevation with placed devices and live Zabbix status from Redis.
    Single round-trip, zero N+1 calls from frontend.
    """
    options = [
        selectinload(Rack.row),
        selectinload(Rack.devices).selectinload(Device.device_model),
    ]

    rack = None
    try:
        r_uuid = uuid.UUID(str(rack_id))
        stmt = select(Rack).where(Rack.id == r_uuid).options(*options)
        result = await db.execute(stmt)
        rack = result.scalar_one_or_none()
    except Exception:
        pass

    if not rack:
        stmt = select(Rack).where(Rack.name == str(rack_id)).options(*options)
        result = await db.execute(stmt)
        rack = result.scalar_one_or_none()

    if not rack:
        # Fallback to first rack
        stmt = select(Rack).order_by(Rack.name).options(*options)
        result = await db.execute(stmt)
        rack = result.scalars().first()

    if not rack:
        raise HTTPException(status_code=404, detail=f"Rack '{rack_id}' not found")

    # 1. Collect all zabbix_host_ids in this rack
    zabbix_ids = [d.zabbix_host_id for d in rack.devices if d.zabbix_host_id]

    # 2. MGET live Zabbix status summaries from Redis
    zabbix_summaries = await redis_service.get_hosts_summaries(zabbix_ids)

    # 3. Enrich devices
    enriched_devices: List[DeviceResponse] = []
    used_u = 0

    for dev in sorted(rack.devices, key=lambda d: d.start_u, reverse=True):
        used_u += dev.height_u
        z_status: Optional[ZabbixStatusSummary] = None

        if dev.zabbix_host_id and dev.zabbix_host_id in zabbix_summaries:
            raw = zabbix_summaries[dev.zabbix_host_id]
            z_status = ZabbixStatusSummary(**raw)

        b_meta = resolve_brand_metadata(
            model=dev.model,
            manufacturer=dev.manufacturer,
            name=dev.name,
            tags=dev.tags,
            custom_fields=dev.custom_fields,
        )

        enriched_devices.append(
            DeviceResponse(
                id=str(dev.id),
                rack_id=str(dev.rack_id) if dev.rack_id else "",
                name=dev.name,
                device_type=dev.device_type,
                model=dev.model,
                manufacturer=dev.manufacturer,
                start_u=dev.start_u,
                height_u=dev.height_u,
                position_face=dev.position_face,
                ip_address=dev.ip_address,
                serial_number=dev.serial_number,
                zabbix_host_id=dev.zabbix_host_id,
                status=getattr(dev, "status", "Active"),
                tags=dev.tags,
                custom_fields=dev.custom_fields,
                zabbix_status=z_status,
                brand_info=BrandInfo(**b_meta) if b_meta else None,
                zabbix_web_links=build_zabbix_web_links(dev.zabbix_host_id),
            )
        )

    usage_pct = round((used_u / rack.total_u) * 100, 1) if rack.total_u > 0 else 0.0

    return RackElevationResponse(
        id=str(rack.id),
        name=rack.name,
        row=rack.row_letter,
        col=rack.col_number,
        total_u=rack.total_u,
        used_u=used_u,
        usage_percent=usage_pct,
        power_kw=round(1.2 + (len(rack.devices) * 0.2), 1),
        inlet_temp_c=round(24.5 + (len(rack.devices) * 0.18), 1),
        devices=enriched_devices,
    )
