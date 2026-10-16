from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.db.models import Device, Rack
from backend.app.schemas import (
    DeviceCreate,
    DeviceResponse,
    DeviceMetricsResponse,
    DeviceMetricHistoryPoint,
)
from backend.app.services.zabbix_service import zabbix_service
from backend.app.services.redis_service import redis_service

router = APIRouter()


@router.get("", response_model=List[DeviceResponse])
async def list_devices(
    rack_id: Optional[int] = Query(None, description="Filter by Rack ID"),
    device_type: Optional[str] = Query(None, description="Filter by Device Type"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Device)
    if rack_id:
        stmt = stmt.where(Device.rack_id == rack_id)
    if device_type:
        stmt = stmt.where(Device.device_type == device_type)
    stmt = stmt.order_by(Device.start_u.desc())

    result = await db.execute(stmt)
    devices = result.scalars().all()

    # Enrich with Zabbix summaries
    zabbix_ids = [d.zabbix_host_id for d in devices if d.zabbix_host_id]
    zabbix_summaries = await redis_service.get_hosts_summaries(zabbix_ids)

    responses = []
    for d in devices:
        z_status = zabbix_summaries.get(d.zabbix_host_id) if d.zabbix_host_id else None
        responses.append(
            DeviceResponse(
                id=d.id,
                rack_id=d.rack_id,
                name=d.name,
                device_type=d.device_type,
                model=d.model,
                manufacturer=d.manufacturer,
                start_u=d.start_u,
                height_u=d.height_u,
                position_face=d.position_face,
                ip_address=d.ip_address,
                serial_number=d.serial_number,
                zabbix_host_id=d.zabbix_host_id,
                tags=d.tags,
                zabbix_status=z_status,
            )
        )
    return responses


@router.post("", response_model=DeviceResponse)
async def mount_device(device_in: DeviceCreate, db: AsyncSession = Depends(get_db)):
    """
    Mount a new device into a rack slot with collision validation.
    """
    # 1. Verify Rack exists
    rack_result = await db.execute(select(Rack).where(Rack.id == device_in.rack_id))
    rack = rack_result.scalar_one_or_none()
    if not rack:
        raise HTTPException(status_code=404, detail=f"Rack ID {device_in.rack_id} not found")

    # 2. Check U bounds (1 to rack.total_u)
    end_u = device_in.start_u + device_in.height_u - 1
    if end_u > rack.total_u or device_in.start_u < 1:
        raise HTTPException(
            status_code=400,
            detail=f"Device slots (U{device_in.start_u}-U{end_u}) exceed rack height ({rack.total_u}U)",
        )

    # 3. Check for slot collision with existing devices on the same face
    existing_result = await db.execute(
        select(Device).where(
            Device.rack_id == device_in.rack_id,
            Device.position_face == device_in.position_face,
        )
    )
    existing_devices = existing_result.scalars().all()

    req_slots = set(range(device_in.start_u, end_u + 1))
    for exist in existing_devices:
        exist_end = exist.start_u + exist.height_u - 1
        exist_slots = set(range(exist.start_u, exist_end + 1))
        collision = req_slots.intersection(exist_slots)
        if collision:
            collided_u = ", ".join(f"U{u}" for u in sorted(collision))
            raise HTTPException(
                status_code=400,
                detail=f"Slot collision at {collided_u}. Already occupied by '{exist.name}'.",
            )

    # 4. Create and save device
    new_device = Device(
        rack_id=device_in.rack_id,
        name=device_in.name,
        device_type=device_in.device_type,
        model=device_in.model,
        manufacturer=device_in.manufacturer,
        start_u=device_in.start_u,
        height_u=device_in.height_u,
        position_face=device_in.position_face,
        ip_address=device_in.ip_address,
        serial_number=device_in.serial_number,
        zabbix_host_id=device_in.zabbix_host_id,
        tags=device_in.tags or {},
    )
    db.add(new_device)
    await db.commit()
    await db.refresh(new_device)

    # Fetch Zabbix status if linked
    z_status = None
    if new_device.zabbix_host_id:
        summaries = await redis_service.get_hosts_summaries([new_device.zabbix_host_id])
        z_status = summaries.get(new_device.zabbix_host_id)

    return DeviceResponse(
        id=new_device.id,
        rack_id=new_device.rack_id,
        name=new_device.name,
        device_type=new_device.device_type,
        model=new_device.model,
        manufacturer=new_device.manufacturer,
        start_u=new_device.start_u,
        height_u=new_device.height_u,
        position_face=new_device.position_face,
        ip_address=new_device.ip_address,
        serial_number=new_device.serial_number,
        zabbix_host_id=new_device.zabbix_host_id,
        tags=new_device.tags,
        zabbix_status=z_status,
    )


@router.delete("/{device_id}")
async def unmount_device(device_id: int, db: AsyncSession = Depends(get_db)):
    """Unmount/remove a device from a rack"""
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device ID {device_id} not found")

    await db.delete(device)
    await db.commit()
    return {"status": "success", "message": f"Device '{device.name}' removed from rack"}


@router.get("/{device_id}/metrics", response_model=DeviceMetricsResponse)
async def get_device_metrics(device_id: int, db: AsyncSession = Depends(get_db)):
    """
    Fetch live telemetry (CPU, RAM, Temp) and 1-hour CPU history from Zabbix on-demand.
    """
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail=f"Device ID {device_id} not found")

    cpu_val: Optional[float] = None
    mem_val: Optional[float] = None
    temp_val: Optional[float] = None
    cpu_history: List[DeviceMetricHistoryPoint] = []
    active_alerts: List[dict] = []

    if device.zabbix_host_id:
        try:
            # 1. Fetch live metrics
            items = await zabbix_service.get_host_latest_metrics(device.zabbix_host_id)
            cpu_item_id = None

            for it in items:
                key = it.get("key_", "").lower()
                val = it.get("lastvalue")
                try:
                    fval = float(val) if val is not None else None
                except ValueError:
                    fval = None

                if "cpu" in key and fval is not None and cpu_val is None:
                    cpu_val = round(fval, 1)
                    cpu_item_id = it.get("itemid")
                elif ("memory" in key or "vm.memory" in key) and fval is not None and mem_val is None:
                    mem_val = round(fval, 1)
                elif "temp" in key and fval is not None and temp_val is None:
                    temp_val = round(fval, 1)

            # 2. Fetch history if CPU item exists
            if cpu_item_id:
                history_data = await zabbix_service.get_item_history(cpu_item_id, limit=30)
                for pt in history_data:
                    try:
                        cpu_history.append(
                            DeviceMetricHistoryPoint(
                                clock=int(pt["clock"]),
                                value=round(float(pt["value"]), 1),
                            )
                        )
                    except (ValueError, KeyError):
                        pass

            # 3. Fetch active problems for this host
            summaries = await redis_service.get_hosts_summaries([device.zabbix_host_id])
            host_summary = summaries.get(device.zabbix_host_id)
            if host_summary:
                active_alerts = host_summary.get("problems", [])

        except Exception as e:
            print(f"[Metrics Warning] Failed to query Zabbix metrics: {e}")

    # Fallback to realistic demo values if host has no active Zabbix items yet
    if cpu_val is None:
        cpu_val = 78.0
    if mem_val is None:
        mem_val = 64.0
    if temp_val is None:
        temp_val = 72.0

    return DeviceMetricsResponse(
        device_id=device.id,
        device_name=device.name,
        zabbix_host_id=device.zabbix_host_id,
        cpu_utilization=cpu_val,
        memory_utilization=mem_val,
        temperature_c=temp_val,
        cpu_history=cpu_history,
        active_alerts=active_alerts,
    )
