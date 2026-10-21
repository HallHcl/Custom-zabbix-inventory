from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.session import get_db
from backend.app.db.models import Rack, Device
from backend.app.services.redis_service import redis_service
from backend.app.schemas import (
    RackSummary,
    RackElevationResponse,
    DeviceResponse,
    ZabbixStatusSummary,
    BrandInfo,
)
from backend.app.services.brand_service import resolve_brand_metadata

router = APIRouter()


@router.get("", response_model=List[RackSummary])
async def list_racks(room_id: int = 1, db: AsyncSession = Depends(get_db)):
    """List all racks in a room with basic stats"""
    stmt = (
        select(Rack)
        .where(Rack.room_id == room_id)
        .options(selectinload(Rack.devices))
        .order_by(Rack.row, Rack.col)
    )
    result = await db.execute(stmt)
    racks = result.scalars().all()

    # Batch fetch Zabbix host statuses
    all_zabbix_ids = [d.zabbix_host_id for r in racks for d in r.devices if d.zabbix_host_id]
    zabbix_summaries = await redis_service.get_hosts_summaries(all_zabbix_ids)

    summaries = []
    for rack in racks:
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
                id=rack.id,
                name=rack.name,
                row=rack.row,
                col=rack.col,
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
async def get_rack_elevation(rack_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get full 42U Rack Elevation with placed devices and live Zabbix status from Redis.
    Single round-trip, zero N+1 calls from frontend.
    """
    stmt = (
        select(Rack)
        .where(Rack.id == rack_id)
        .options(selectinload(Rack.devices))
    )
    result = await db.execute(stmt)
    rack = result.scalar_one_or_none()

    if not rack:
        raise HTTPException(status_code=404, detail=f"Rack ID {rack_id} not found")

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
                id=dev.id,
                rack_id=dev.rack_id,
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
            )
        )

    usage_pct = round((used_u / rack.total_u) * 100, 1) if rack.total_u > 0 else 0.0

    return RackElevationResponse(
        id=rack.id,
        name=rack.name,
        row=rack.row,
        col=rack.col,
        total_u=rack.total_u,
        used_u=used_u,
        usage_percent=usage_pct,
        power_kw=round(1.2 + (len(rack.devices) * 0.2), 1),
        inlet_temp_c=round(24.5 + (len(rack.devices) * 0.18), 1),
        devices=enriched_devices,
    )
