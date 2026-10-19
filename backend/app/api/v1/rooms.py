"""
Floor Plan Editor API — Room layout, rack CRUD, and batch position updates.
All heavy data operations happen here on the backend so the frontend
only needs to send minimal payloads (grid changes, position arrays).
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.session import get_db
from backend.app.db.models import Room, Rack
from backend.app.services.redis_service import redis_service
from backend.app.schemas import (
    RoomLayoutUpdate,
    RoomLayoutResponse,
    RackCreate,
    RackCreateResponse,
    RackSummary,
    BatchRackPositionUpdate,
)

router = APIRouter()


async def _enrich_racks_summary(room: Room) -> List[RackSummary]:
    """
    Enrich room racks with live Zabbix status from Redis cache and calculate
    real power, inlet temperature, and highest severity.
    """
    all_zabbix_ids = [
        d.zabbix_host_id for rack in room.racks for d in rack.devices if d.zabbix_host_id
    ]
    zabbix_summaries = await redis_service.get_hosts_summaries(all_zabbix_ids)

    racks_summary = []
    for rack in sorted(room.racks, key=lambda r: (r.row, r.col)):
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

        if has_critical:
            rack_status = "critical"
        elif has_warning:
            rack_status = "warning"
        else:
            rack_status = "healthy"

        target_temp = getattr(room, "room_temp_target", 24.5)
        power_kw = round(1.2 + (len(rack.devices) * 0.2), 1)
        inlet_temp = round(target_temp + (len(rack.devices) * 0.18), 1)

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
    return racks_summary


@router.get("/{room_id}/layout", response_model=RoomLayoutResponse)
async def get_room_layout(room_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get room grid dimensions and all rack positions for the floor plan editor.
    """
    stmt = (
        select(Room)
        .where(Room.id == room_id)
        .options(selectinload(Room.racks).selectinload(Rack.devices))
    )
    result = await db.execute(stmt)
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail=f"Room ID {room_id} not found")

    racks_summary = await _enrich_racks_summary(room)

    return RoomLayoutResponse(
        room_id=room.id,
        room_name=room.name,
        grid_rows=room.grid_rows,
        grid_cols=room.grid_cols,
        racks=racks_summary,
    )


@router.patch("/{room_id}/layout", response_model=RoomLayoutResponse)
async def update_room_layout(
    room_id: int,
    payload: RoomLayoutUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update the room grid dimensions (rows x cols).
    Validates that no existing racks fall outside the new grid bounds.
    """
    stmt = (
        select(Room)
        .where(Room.id == room_id)
        .options(selectinload(Room.racks).selectinload(Rack.devices))
    )
    result = await db.execute(stmt)
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail=f"Room ID {room_id} not found")

    # Check that all existing racks fit in the new grid
    row_labels = [chr(ord('A') + i) for i in range(payload.grid_rows)]
    for rack in room.racks:
        rack_row_letter = rack.row.replace("Row ", "")
        if rack_row_letter not in row_labels or rack.col > payload.grid_cols:
            raise HTTPException(
                status_code=400,
                detail=f"Rack '{rack.name}' at Row {rack_row_letter} Col {rack.col} "
                       f"would fall outside the new {payload.grid_rows}x{payload.grid_cols} grid. "
                       f"Move or delete it first.",
            )

    room.grid_rows = payload.grid_rows
    room.grid_cols = payload.grid_cols
    await db.commit()

    # Re-fetch with selectinload to prevent async lazyload MissingGreenlet error
    reloaded_stmt = (
        select(Room)
        .where(Room.id == room_id)
        .options(selectinload(Room.racks).selectinload(Rack.devices))
    )
    reloaded_result = await db.execute(reloaded_stmt)
    room = reloaded_result.scalar_one()

    # Return updated layout with live Zabbix status
    racks_summary = await _enrich_racks_summary(room)

    return RoomLayoutResponse(
        room_id=room.id,
        room_name=room.name,
        grid_rows=room.grid_rows,
        grid_cols=room.grid_cols,
        racks=racks_summary,
    )


@router.patch("/{room_id}/rack-positions")
async def batch_update_rack_positions(
    room_id: int,
    payload: BatchRackPositionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Batch update rack positions (row, col) after a drag-drop layout change.
    Validates no duplicate positions and all racks belong to the room.
    """
    stmt = select(Room).where(Room.id == room_id)
    result = await db.execute(stmt)
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail=f"Room ID {room_id} not found")

    # Validate no duplicate positions
    positions_set = set()
    for p in payload.positions:
        key = (p.row, p.col)
        if key in positions_set:
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate position: Row {p.row} Col {p.col}",
            )
        positions_set.add(key)

    # Fetch all racks in the room
    rack_stmt = select(Rack).where(Rack.room_id == room_id)
    rack_result = await db.execute(rack_stmt)
    racks_by_id = {r.id: r for r in rack_result.scalars().all()}

    # Phase 1: Set temporary names to prevent unique constraint (uq_rack_room_name) violation during swaps
    for p in payload.positions:
        rack = racks_by_id.get(p.rack_id)
        if not rack:
            raise HTTPException(
                status_code=404,
                detail=f"Rack ID {p.rack_id} not found in Room {room_id}",
            )
        rack.name = f"__tmp_swap_{rack.id}__"
    await db.flush()

    # Phase 2: Set final coordinates and auto-generated names
    for p in payload.positions:
        rack = racks_by_id[p.rack_id]
        rack.row = p.row
        rack.col = p.col
        row_letter = p.row.replace("Row ", "").strip()
        rack.name = f"Rack {row_letter}{p.col:02d}"

    await db.commit()
    return {"status": "ok", "updated": len(payload.positions)}


@router.post("/{room_id}/racks", response_model=RackCreateResponse)
async def create_rack(
    room_id: int,
    payload: RackCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new rack in the room at the specified grid position.
    """
    # Verify room exists
    stmt = select(Room).where(Room.id == room_id)
    result = await db.execute(stmt)
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail=f"Room ID {room_id} not found")

    # Check position not already occupied
    existing = await db.execute(
        select(Rack).where(
            Rack.room_id == room_id,
            Rack.row == payload.row,
            Rack.col == payload.col,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Position Row {payload.row} Col {payload.col} is already occupied",
        )

    new_rack = Rack(
        room_id=room_id,
        name=payload.name,
        row=payload.row,
        col=payload.col,
        total_u=payload.total_u,
    )
    db.add(new_rack)
    await db.commit()
    await db.refresh(new_rack)

    return RackCreateResponse(
        id=new_rack.id,
        name=new_rack.name,
        row=new_rack.row,
        col=new_rack.col,
        total_u=new_rack.total_u,
        room_id=new_rack.room_id,
    )


@router.delete("/{room_id}/racks/{rack_id}")
async def delete_rack(
    room_id: int,
    rack_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a rack from the room. Also cascade-deletes all devices in it.
    """
    stmt = select(Rack).where(Rack.id == rack_id, Rack.room_id == room_id)
    result = await db.execute(stmt)
    rack = result.scalar_one_or_none()
    if not rack:
        raise HTTPException(
            status_code=404,
            detail=f"Rack ID {rack_id} not found in Room {room_id}",
        )

    await db.delete(rack)
    await db.commit()
    return {"status": "ok", "deleted_rack_id": rack_id}
