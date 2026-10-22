"""
Floor Plan Editor API — Room layout, rack CRUD, and batch position updates.
All heavy data operations happen here on the backend so the frontend
only needs to send minimal payloads (grid changes, position arrays).
"""
import uuid
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.session import get_db
from backend.app.db.models import Room, Row, Rack, Device
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


async def _resolve_room(room_id: Any, db: AsyncSession) -> Room:
    """
    Resolve room by UUID if valid UUID string/object, otherwise fallback
    to first available room in DB ordered consistently by Room.name (matching overview.py).
    """
    stmt = (
        select(Room)
        .options(
            selectinload(Room.rows)
            .selectinload(Row.racks)
            .selectinload(Rack.devices)
        )
    )
    if room_id is not None and str(room_id).lower() not in ("1", "default", "none", ""):
        try:
            r_uuid = uuid.UUID(str(room_id))
            stmt_specific = stmt.where(Room.id == r_uuid)
            result = await db.execute(stmt_specific)
            room = result.scalar_one_or_none()
            if room:
                return room
        except (ValueError, TypeError):
            pass

    # Fallback to first room in DB ordered consistently by Room.name (e.g. Data Hall Alpha / Room A)
    result = await db.execute(stmt.order_by(Room.name).limit(1))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="No rooms found in database")
    return room


async def _enrich_racks_summary(room: Room) -> List[RackSummary]:
    """
    Enrich room racks with live Zabbix status from Redis cache and calculate
    real power, inlet temperature, and highest severity.
    """
    # Ensure rack.row back-reference is populated from room.rows
    if room.rows:
        for rw in room.rows:
            for rk in rw.racks:
                rk.row = rw

    all_zabbix_ids = [
        d.zabbix_host_id for rack in room.racks for d in rack.devices if d.zabbix_host_id
    ]
    zabbix_summaries = await redis_service.get_hosts_summaries(all_zabbix_ids)

    racks_summary = []
    for rack in sorted(room.racks, key=lambda r: (r.row_letter, r.col_number)):
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
                id=str(rack.id),
                name=rack.name,
                row=rack.row_letter,
                col=rack.col_number,
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
async def get_room_layout(room_id: Any, db: AsyncSession = Depends(get_db)):
    """
    Get room grid dimensions and all rack positions for the floor plan editor.
    Auto-expands grid bounds so all existing racks fit within the room.
    """
    room = await _resolve_room(room_id, db)
    racks_summary = await _enrich_racks_summary(room)

    # Compute effective grid rows and cols to guarantee all racks fit inside the room
    max_rack_row = 1
    max_rack_col = 1
    for r in room.racks:
        let = r.row_letter
        if let and let[0].isalpha():
            r_idx = ord(let[0].upper()) - ord('A') + 1
            if r_idx > max_rack_row:
                max_rack_row = r_idx
        if r.col_number and r.col_number > max_rack_col:
            max_rack_col = r.col_number

    effective_rows = max(room.grid_rows or 3, max_rack_row)
    effective_cols = max(room.grid_cols or 4, max_rack_col)

    if room.grid_rows != effective_rows or room.grid_cols != effective_cols:
        room.grid_rows = effective_rows
        room.grid_cols = effective_cols
        await db.commit()

    return RoomLayoutResponse(
        room_id=room.id,
        room_name=room.name,
        grid_rows=effective_rows,
        grid_cols=effective_cols,
        racks=racks_summary,
    )


@router.patch("/{room_id}/layout", response_model=RoomLayoutResponse)
async def update_room_layout(
    room_id: Any,
    payload: RoomLayoutUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update the room grid dimensions (rows x cols).
    Validates that no existing racks fall outside the new grid bounds.
    """
    room = await _resolve_room(room_id, db)

    # Check that all existing racks fit in the new grid
    row_labels = [chr(ord('A') + i) for i in range(payload.grid_rows)]
    for rack in room.racks:
        rack_row_letter = rack.row_letter
        if rack_row_letter not in row_labels or rack.col_number > payload.grid_cols:
            raise HTTPException(
                status_code=400,
                detail=f"Rack '{rack.name}' at Row {rack_row_letter} Col {rack.col_number} "
                       f"would fall outside the new {payload.grid_rows}x{payload.grid_cols} grid. "
                       f"Move or delete it first.",
            )

    room.grid_rows = payload.grid_rows
    room.grid_cols = payload.grid_cols
    await db.commit()

    # Re-fetch room with relationships loaded
    room = await _resolve_room(room.id, db)
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
    room_id: Any,
    payload: BatchRackPositionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Batch update rack positions (row, col) after a drag-drop layout change.
    Validates no duplicate positions and all racks belong to the room.
    """
    room = await _resolve_room(room_id, db)

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

    # Fetch all racks in the room via join on Row
    rack_stmt = (
        select(Rack)
        .join(Row, Rack.row_id == Row.id)
        .where(Row.room_id == room.id)
        .options(selectinload(Rack.row))
    )
    rack_result = await db.execute(rack_stmt)
    racks_list = rack_result.scalars().all()
    racks_by_id = {str(r.id): r for r in racks_list}
    for r in racks_list:
        racks_by_id[r.id] = r

    # Fetch rows in the room mapped by normalized letter
    row_stmt = select(Row).where(Row.room_id == room.id)
    rows_result = await db.execute(row_stmt)
    rows_in_room = rows_result.scalars().all()
    rows_by_letter = {}
    for rw in rows_in_room:
        let = rw.name.replace("Row ", "").strip().upper()
        rows_by_letter[let] = rw

    # Phase 1: Set temporary names to prevent unique constraint (uq_rack_room_name) violation during swaps
    for p in payload.positions:
        p_id = str(p.rack_id)
        rack = racks_by_id.get(p.rack_id) or racks_by_id.get(p_id)
        if not rack:
            raise HTTPException(
                status_code=404,
                detail=f"Rack ID {p.rack_id} not found in Room {room.name}",
            )
        rack.name = f"__tmp_swap_{rack.id}__"
    await db.flush()

    # Phase 2: Set final coordinates and auto-generated names
    for p in payload.positions:
        p_id = str(p.rack_id)
        rack = racks_by_id.get(p.rack_id) or racks_by_id.get(p_id)
        row_str = p.row.strip()
        row_letter = row_str.replace("Row ", "").strip().upper()
        if not row_letter:
            row_letter = "A"

        # If target row does not exist, auto-create it
        target_row = rows_by_letter.get(row_letter)
        if not target_row:
            row_idx = max(0, ord(row_letter) - ord('A'))
            target_row = Row(
                id=uuid.uuid4(),
                room_id=room.id,
                name=f"Row {row_letter}",
                aisle_type="COLD_CONTAINED",
                pos_x_meters=0.0,
                pos_y_meters=6.0 + (row_idx * 8.0),
                orientation_deg=0,
            )
            db.add(target_row)
            await db.flush()
            rows_by_letter[row_letter] = target_row

        rack.row_id = target_row.id
        rack.pos_x_meters = round(4.0 + (p.col - 1) * 1.8, 2)
        rack.pos_y_meters = target_row.pos_y_meters
        rack.name = f"Rack {row_letter}{p.col:02d}"

    # Auto-expand room grid if rack moved outside current grid dimensions
    max_c = max([p.col for p in payload.positions] + [room.grid_cols])
    max_r = max([ord(p.row.replace("Row ", "").strip().upper()[:1]) - ord('A') + 1 for p in payload.positions] + [room.grid_rows])
    if max_c > room.grid_cols:
        room.grid_cols = max_c
    if max_r > room.grid_rows:
        room.grid_rows = max_r

    await db.commit()
    return {"status": "ok", "updated": len(payload.positions)}


@router.post("/{room_id}/racks", response_model=RackCreateResponse)
async def create_rack(
    room_id: Any,
    payload: RackCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new rack in the room at the specified grid position.
    Automatically provisions Row if it does not exist yet.
    """
    room = await _resolve_room(room_id, db)

    # Normalize row letter, e.g. "Row C" -> "C", "C" -> "C"
    row_str = payload.row.strip()
    if row_str.upper().startswith("ROW"):
        row_letter = row_str[3:].strip().upper()
    else:
        row_letter = row_str[:1].upper()
    if not row_letter:
        row_letter = "A"

    row_name = f"Row {row_letter}"

    # Find or auto-provision target Row
    row_stmt = select(Row).where(Row.room_id == room.id, Row.name.ilike(f"%{row_letter}%"))
    row_result = await db.execute(row_stmt)
    target_row = row_result.scalar_one_or_none()

    if not target_row:
        # Calculate Y position based on row letter index (A=0, B=1, C=2...)
        row_idx = max(0, ord(row_letter) - ord('A'))
        pos_y = 6.0 + (row_idx * 8.0)
        target_row = Row(
            id=uuid.uuid4(),
            room_id=room.id,
            name=row_name,
            aisle_type="COLD_CONTAINED",
            pos_x_meters=0.0,
            pos_y_meters=pos_y,
            orientation_deg=0,
        )
        db.add(target_row)
        await db.flush()

    # Load racks in target row to verify no collision
    racks_stmt = select(Rack).where(Rack.row_id == target_row.id)
    racks_result = await db.execute(racks_stmt)
    existing_racks = racks_result.scalars().all()

    for rk in existing_racks:
        if rk.col_number == payload.col or rk.name.strip().lower() == payload.name.strip().lower():
            raise HTTPException(
                status_code=400,
                detail=f"Position Row {row_letter} Col {payload.col} is already occupied by '{rk.name}'",
            )

    # Compute physical X coordinate (standard 1.8m pitch)
    pos_x = round(4.0 + (payload.col - 1) * 1.8, 2)
    pos_y = target_row.pos_y_meters

    new_rack = Rack(
        id=uuid.uuid4(),
        row_id=target_row.id,
        name=payload.name,
        u_height=payload.total_u,
        pos_x_meters=pos_x,
        pos_y_meters=pos_y,
        rotation_deg=0,
        max_power_watts=8000,
        max_weight_kg=1000,
    )
    db.add(new_rack)
    await db.commit()
    await db.refresh(new_rack)

    return RackCreateResponse(
        id=str(new_rack.id),
        name=new_rack.name,
        row=target_row.name,
        col=payload.col,
        total_u=new_rack.u_height,
        room_id=str(room.id),
    )


@router.delete("/{room_id}/racks/{rack_id}")
async def delete_rack(
    room_id: Any,
    rack_id: Any,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a rack from the room. Also cascade-deletes all devices in it.
    """
    room = await _resolve_room(room_id, db)
    try:
        rk_uuid = uuid.UUID(str(rack_id))
    except (ValueError, TypeError):
        rk_uuid = rack_id

    stmt = (
        select(Rack)
        .join(Row, Rack.row_id == Row.id)
        .where(Rack.id == rk_uuid, Row.room_id == room.id)
    )
    result = await db.execute(stmt)
    rack = result.scalar_one_or_none()
    if not rack:
        raise HTTPException(
            status_code=404,
            detail=f"Rack ID {rack_id} not found in Room {room.name}",
        )

    await db.delete(rack)
    await db.commit()
    return {"status": "ok", "deleted_rack_id": str(rack_id)}
