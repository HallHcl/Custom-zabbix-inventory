import uuid
from typing import List, Optional, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.models import Rack, Device, DeviceModel, Row
from backend.app.schemas import PlacementRequest, PlacementRecommendation
from backend.app.services.redis_service import redis_service


async def recommend_optimal_rack(
    db: AsyncSession,
    request: PlacementRequest,
    limit: int = 3,
) -> List[PlacementRecommendation]:
    """
    Multi-constraint DCIM spatial placement optimizer.
    Evaluates:
      1. Contiguous U-slot geometry
      2. Power headroom & PDU capacity
      3. ASHRAE thermal gradient & cooling margin
      4. Equipment category RU zone heuristics (Bottom=UPS/Storage, Mid=Server, Top=ToR Switch)
    """
    # 1. Fetch all racks with their Row, Devices and DeviceModels
    stmt = (
        select(Rack)
        .options(
            selectinload(Rack.row),
            selectinload(Rack.devices).selectinload(Device.device_model),
        )
    )
    result = await db.execute(stmt)
    racks = result.scalars().all()

    recommendations: List[PlacementRecommendation] = []
    category_upper = request.category.upper()

    for rack in racks:
        row_name = rack.row.name if rack.row else "Row ?"
        
        # Filter by preferred row if requested
        if request.preferred_row:
            pref = request.preferred_row.lower().strip()
            if pref not in row_name.lower() and pref not in rack.name.lower():
                continue

        # 2. Compute occupied U-slots and power load
        occupied_slots: Set[int] = set()
        current_power_watts = 0

        for dev in rack.devices:
            if dev.status != "DECOMMISSIONED" and dev.u_position_start is not None:
                h = dev.device_model.u_height if dev.device_model else 1
                for u in range(dev.u_position_start, dev.u_position_start + h):
                    occupied_slots.add(u)
                if dev.device_model:
                    current_power_watts += dev.device_model.typical_power_watts

        # Power Headroom
        headroom_watts = max(0, rack.max_power_watts - current_power_watts)
        if headroom_watts < request.power_watts:
            # Rack does not have enough electrical headroom
            continue

        # 3. Find all candidate contiguous starting slots
        max_u = rack.u_height or 42
        candidate_slots: List[int] = []

        for start_u in range(1, max_u - request.u_height + 2):
            needed = set(range(start_u, start_u + request.u_height))
            if needed.isdisjoint(occupied_slots):
                candidate_slots.append(start_u)

        if not candidate_slots:
            continue

        # 4. Fetch telemetry / temperature
        # Use itemid or fallback to simulated/cached temperature
        inlet_temp_c = 21.2
        if rack.zabbix_inlet_temp_itemid:
            try:
                cached_temp = await redis_service.get_item_value(rack.zabbix_inlet_temp_itemid)
                if cached_temp is not None:
                    inlet_temp_c = float(cached_temp)
            except Exception:
                pass

        # 5. Score candidate slots in this rack
        best_slot = candidate_slots[0]
        best_score = -1.0
        best_sub_scores = {"power": 0.0, "thermal": 0.0, "ru": 0.0}

        for start_u in candidate_slots:
            # 5a. Power score (0-100)
            pwr_ratio = (headroom_watts - request.power_watts) / max(1, rack.max_power_watts)
            pwr_score = min(100.0, max(0.0, pwr_ratio * 100.0))

            # 5b. Thermal score (0-100): ASHRAE Class A1 optimal = 18-22C
            therm_score = max(10.0, min(100.0, 100.0 - max(0.0, inlet_temp_c - 20.0) * 7.5))

            # 5c. RU Zone score (0-100) based on equipment category
            if any(k in category_upper for k in ["UPS", "STORAGE", "PDU"]) or (request.weight_kg and request.weight_kg > 30):
                # Heavy storage or UPS prefer lower rack (U1-U10) for low center of gravity
                ru_score = max(20.0, 100.0 - abs(start_u - 4) * 4.0)
            elif any(k in category_upper for k in ["SWITCH", "PATCH", "ROUTER", "FIREWALL"]):
                # Networking gear prefers top of rack (U36-U42) for patch panel cabling
                ru_score = max(20.0, 100.0 - abs(start_u - 39) * 4.0)
            else:
                # High-compute enterprise servers prefer mid rack (U12-U28) for optimal airflow
                ru_score = max(20.0, 100.0 - abs(start_u - 18) * 3.0)

            # 5d. Contiguous buffer (bonus if adjacent slots are free)
            buf_bonus = 0.0
            if (start_u - 1) not in occupied_slots and (start_u - 1) >= 1:
                buf_bonus += 5.0
            if (start_u + request.u_height) not in occupied_slots and (start_u + request.u_height) <= max_u:
                buf_bonus += 5.0

            slot_total = round(
                (0.35 * pwr_score) + (0.25 * therm_score) + (0.25 * ru_score) + (0.15 * buf_bonus),
                1,
            )

            if slot_total > best_score:
                best_score = slot_total
                best_slot = start_u
                best_sub_scores = {
                    "power": round(pwr_score, 1),
                    "thermal": round(therm_score, 1),
                    "ru": round(ru_score, 1),
                }

        # 6. Generate reasoning text
        reasoning_parts = []
        if best_sub_scores["power"] >= 70:
            reasoning_parts.append(f"Strong power headroom ({headroom_watts}W available / {rack.max_power_watts}W capacity)")
        else:
            reasoning_parts.append(f"Adequate power headroom ({headroom_watts}W)")

        if inlet_temp_c <= 22.5:
            reasoning_parts.append(f"optimal ASHRAE cooling ({inlet_temp_c:.1f}°C)")
        else:
            reasoning_parts.append(f"moderate inlet temperature ({inlet_temp_c:.1f}°C)")

        if any(k in category_upper for k in ["UPS", "STORAGE"]):
            reasoning_parts.append(f"low U{best_slot} center of gravity")
        elif any(k in category_upper for k in ["SWITCH", "PATCH"]):
            reasoning_parts.append(f"top-of-rack U{best_slot} cable management")
        else:
            reasoning_parts.append(f"mid-cabinet U{best_slot} cold-aisle airflow")

        reasoning = f"{', '.join(reasoning_parts).capitalize()}."

        recommendations.append(
            PlacementRecommendation(
                rack_id=str(rack.id),
                rack_name=rack.name,
                row_name=row_name,
                recommended_start_u=best_slot,
                u_height=request.u_height,
                composite_score=best_score,
                power_headroom_watts=headroom_watts,
                power_score=best_sub_scores["power"],
                thermal_score=best_sub_scores["thermal"],
                ru_zone_score=best_sub_scores["ru"],
                inlet_temp_c=round(inlet_temp_c, 1),
                reasoning=reasoning,
                available_slots=candidate_slots[:8],
            )
        )

    # Sort by composite score descending
    recommendations.sort(key=lambda r: r.composite_score, reverse=True)
    return recommendations[:limit]
