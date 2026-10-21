import re
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.db.models import Rack, Device, DeviceModel, KnowledgeDocument, Row
from backend.app.schemas import (
    CopilotCommandResponse,
    CopilotAction,
    PlacementRequest,
    PlacementRecommendation,
)
from backend.app.services.optimizer_service import recommend_optimal_rack
from backend.app.services.blast_radius_service import BlastRadiusService

blast_service = BlastRadiusService()


async def process_copilot_command(
    db: AsyncSession,
    query: str,
    context: Optional[Dict[str, Any]] = None,
) -> CopilotCommandResponse:
    """
    Agentic Copilot Command Processor.
    Interprets natural language datacenter operations, performs tool calling,
    and returns conversational responses with executable UI action payloads.
    """
    q = query.strip()
    q_lower = q.lower()

    # =========================================================================
    # INTENT 1: SPATIAL PLACEMENT RECOMMENDATION
    # e.g., "Find me a 2U slot for a Dell server with at least 500W power"
    #       "Where can I mount a 4U storage in Row A?"
    # =========================================================================
    placement_keywords = [
        "find slot", "where can i mount", "recommend rack", "recommend slot",
        "place server", "mount server", "place switch", "mount switch",
        "optimal rack", "optimize placement", "where to put", "find a spot",
        "recommend placement", "mount dell", "mount cisco", "mount storage"
    ]
    if any(k in q_lower for k in placement_keywords) or (("slot" in q_lower or "mount" in q_lower or "place" in q_lower) and ("u" in q_lower or "rack" in q_lower)):
        # Extract U height
        u_height = 2
        u_match = re.search(r"(\d+)\s*u\b", q_lower)
        if u_match:
            u_height = max(1, min(10, int(u_match.group(1))))

        # Extract Power Watts
        power_watts = 450
        w_match = re.search(r"(\d+)\s*(?:watts?|w)\b", q_lower)
        kw_match = re.search(r"(\d+(?:\.\d+)?)\s*kw\b", q_lower)
        if w_match:
            power_watts = int(w_match.group(1))
        elif kw_match:
            power_watts = int(float(kw_match.group(1)) * 1000)

        # Extract Category
        category = "SERVER"
        if "switch" in q_lower or "router" in q_lower:
            category = "SWITCH"
        elif "storage" in q_lower or "san" in q_lower or "nas" in q_lower:
            category = "STORAGE"
        elif "ups" in q_lower or "battery" in q_lower:
            category = "UPS"
        elif "pdu" in q_lower:
            category = "PDU"

        # Extract preferred row
        preferred_row: Optional[str] = None
        row_match = re.search(r"row\s*([a-zA-Z0-9]+)", q_lower)
        if row_match:
            preferred_row = f"Row {row_match.group(1).upper()}"

        req = PlacementRequest(
            u_height=u_height,
            power_watts=power_watts,
            category=category,
            preferred_row=preferred_row,
        )

        recommendations = await recommend_optimal_rack(db, req, limit=3)

        actions: List[CopilotAction] = []
        if recommendations:
            top = recommendations[0]
            # Primary action: Fly camera to top recommended rack
            actions.append(
                CopilotAction(
                    type="FLY_TO_RACK",
                    label=f"Fly to {top.rack_name} (Score: {top.composite_score})",
                    payload={
                        "rack_id": top.rack_id,
                        "rack_name": top.rack_name,
                        "start_u": top.recommended_start_u,
                        "u_height": top.u_height,
                    },
                )
            )
            # Secondary action: Open Provisioning Wizard pre-filled
            actions.append(
                CopilotAction(
                    type="OPEN_PROVISIONING_WIZARD",
                    label=f"Mount {u_height}U Device at {top.rack_name} Slot U{top.recommended_start_u}",
                    payload={
                        "rack_id": top.rack_id,
                        "rack_name": top.rack_name,
                        "start_u": top.recommended_start_u,
                        "u_height": top.u_height,
                        "category": category,
                    },
                )
            )

            msg = (
                f"I evaluated contiguous slots, power headroom, and ASHRAE cooling for a **{u_height}U {category.capitalize()}** "
                f"({power_watts}W). The top recommendation is **{top.rack_name}** in {top.row_name} at **Slot U{top.recommended_start_u}** "
                f"with an optimization score of **{top.composite_score}/100**. {top.reasoning}"
            )
        else:
            msg = (
                f"No suitable rack could accommodate a {u_height}U {category.capitalize()} with {power_watts}W power headroom. "
                f"Consider checking overall datacenter power or stranded contiguous slots."
            )

        return CopilotCommandResponse(
            intent="RECOMMEND_SLOT",
            message=msg,
            actions=actions,
            recommendations=recommendations,
        )

    # =========================================================================
    # INTENT 2: SPATIAL CAMERA FLY-TO / INSPECTION
    # e.g., "Fly to Rack B03", "Inspect Rack R-A01", "Show me Row A"
    # =========================================================================
    nav_keywords = ["fly to", "show me rack", "go to rack", "inspect rack", "view rack", "take me to", "zoom to"]
    if any(k in q_lower for k in nav_keywords) or (q_lower.startswith("r-") or q_lower.startswith("rack ")):
        # Extract rack name (e.g. "R-A01", "B03", "R-B02")
        rack_target = None
        match = re.search(r"(?:rack\s+|r-)([a-zA-Z0-9\-]+)", q_lower)
        if match:
            rack_target = match.group(1).upper()
            if not rack_target.startswith("R-"):
                rack_target = f"R-{rack_target}"

        stmt = select(Rack).options(selectinload(Rack.row), selectinload(Rack.devices))
        result = await db.execute(stmt)
        all_racks = result.scalars().all()

        target_rack = None
        if rack_target:
            target_rack = next((r for r in all_racks if rack_target in r.name.upper() or r.name.upper().replace("-", "") == rack_target.replace("-", "")), None)

        if not target_rack and all_racks:
            target_rack = all_racks[0]

        if target_rack:
            dev_count = len(target_rack.devices)
            actions = [
                CopilotAction(
                    type="FLY_TO_RACK",
                    label=f"Fly to {target_rack.name}",
                    payload={
                        "rack_id": str(target_rack.id),
                        "rack_name": target_rack.name,
                        "pos_x": float(target_rack.pos_x_meters),
                        "pos_y": float(target_rack.pos_y_meters),
                    },
                )
            ]
            return CopilotCommandResponse(
                intent="NAVIGATE_OR_FLY",
                message=f"Directing 3D camera to **{target_rack.name}** in {target_rack.row.name if target_rack.row else 'Datacenter'}. Cabinet has **{dev_count} active devices** with {target_rack.max_power_watts}W rated power capacity.",
                actions=actions,
            )

    # =========================================================================
    # INTENT 3: BLAST-RADIUS & ROOT-CAUSE SIMULATION
    # e.g., "What happens if SW-CORE-01 fails?", "Simulate outage on PDU-A"
    # =========================================================================
    blast_keywords = ["blast radius", "simulate outage", "what happens if", "goes down", "fails", "power loss on", "cascade failure"]
    if any(k in q_lower for k in blast_keywords):
        # Find candidate device in database
        stmt = select(Device).options(selectinload(Device.rack))
        result = await db.execute(stmt)
        devices = result.scalars().all()

        matched_dev = None
        for d in devices:
            if d.name.lower() in q_lower or (d.hostname and d.hostname.lower() in q_lower):
                matched_dev = d
                break

        # Fallback to Core Switch or First Device if none explicitly named
        if not matched_dev:
            matched_dev = next((d for d in devices if "CORE" in d.name.upper() or "SW" in d.name.upper()), devices[0] if devices else None)

        if matched_dev:
            blast_result = await blast_service.calculate_blast_radius(matched_dev.id)
            affected_count = blast_result.get("affected_devices_count", 0)
            single_cord_count = len(blast_result.get("single_corded_risks", []))
            severity = blast_result.get("cascade_severity", "WARNING")

            actions = [
                CopilotAction(
                    type="OPEN_BLAST_RADIUS",
                    label=f"Inspect Blast Radius for {matched_dev.name}",
                    payload={
                        "device_id": str(matched_dev.id),
                        "device_name": matched_dev.name,
                    },
                )
            ]

            return CopilotCommandResponse(
                intent="SIMULATE_INCIDENT",
                message=(
                    f"Simulated blast radius for **{matched_dev.name}** ({matched_dev.device_type if hasattr(matched_dev, 'device_type') else 'Network'}). "
                    f"Severity is **{severity}**. Failure cascades to **{affected_count} downstream devices**, with **{single_cord_count} single-corded devices** at immediate risk of complete ungraceful power outage."
                ),
                actions=actions,
            )

    # =========================================================================
    # INTENT 4: HEATMAP OVERLAYS & PERSONA SWITCHING
    # e.g., "Show thermal heatmap", "Switch to NOC mode", "Show power density"
    # =========================================================================
    if "thermal" in q_lower or "temperature" in q_lower or "heat" in q_lower:
        return CopilotCommandResponse(
            intent="SWITCH_MODE",
            message="Activating **ASHRAE Thermal Gradient Heatmap** overlay across all cabinets.",
            actions=[CopilotAction(type="SET_HEATMAP", label="Show Thermal Heatmap", payload={"mode": "THERMAL"})],
        )
    elif "power" in q_lower or "watt" in q_lower or "energy" in q_lower or "density" in q_lower:
        return CopilotCommandResponse(
            intent="SWITCH_MODE",
            message="Activating **Power Density & PDU Utilization Heatmap** overlay.",
            actions=[CopilotAction(type="SET_HEATMAP", label="Show Power Heatmap", payload={"mode": "POWER"})],
        )
    elif "space" in q_lower or "contiguous" in q_lower or "density" in q_lower:
        return CopilotCommandResponse(
            intent="SWITCH_MODE",
            message="Activating **Rack Unit Space Availability** overlay.",
            actions=[CopilotAction(type="SET_HEATMAP", label="Show Space Heatmap", payload={"mode": "SPACE"})],
        )
    elif "noc" in q_lower:
        return CopilotCommandResponse(
            intent="SWITCH_MODE",
            message="Switching HUD layout to **NOC Tactical Video Wall** mode.",
            actions=[CopilotAction(type="SET_PERSONA", label="Switch to NOC", payload={"persona": "NOC"})],
        )
    elif "supervisor" in q_lower:
        return CopilotCommandResponse(
            intent="SWITCH_MODE",
            message="Switching HUD layout to **Supervisor Capacity & Provisioning** mode.",
            actions=[CopilotAction(type="SET_PERSONA", label="Switch to Supervisor", payload={"persona": "Supervisor"})],
        )
    elif "manager" in q_lower or "executive" in q_lower:
        return CopilotCommandResponse(
            intent="SWITCH_MODE",
            message="Switching HUD layout to **Manager Executive Twin & PUE** mode.",
            actions=[CopilotAction(type="SET_PERSONA", label="Switch to Manager", payload={"persona": "Manager"})],
        )

    # =========================================================================
    # INTENT 5: KNOWLEDGE RETRIEVAL & SOPs (RAG)
    # e.g., "What is the procedure for replacing a PDU?", "CRAC failure SOP"
    # =========================================================================
    sop_keywords = ["sop", "procedure", "how to", "policy", "manual", "loto", "crac", "protocol", "maintenance"]
    if any(k in q_lower for k in sop_keywords):
        stmt = select(KnowledgeDocument)
        result = await db.execute(stmt)
        docs = result.scalars().all()

        matched_doc = None
        for d in docs:
            tokens = d.title.lower().split() + d.doc_type.lower().split()
            if any(t in q_lower for t in tokens if len(t) > 3):
                matched_doc = d
                break

        if not matched_doc and docs:
            matched_doc = docs[0]

        if matched_doc:
            snippet = {
                "id": str(matched_doc.id),
                "title": matched_doc.title,
                "doc_type": matched_doc.doc_type,
                "content_preview": matched_doc.content[:320] + "...",
            }
            return CopilotCommandResponse(
                intent="KNOWLEDGE_RAG",
                message=f"Retrieved official procedure **{matched_doc.title}** ({matched_doc.doc_type}):\n\n> {matched_doc.content[:240]}...",
                knowledge_snippet=snippet,
                actions=[],
            )

    # =========================================================================
    # DEFAULT / FALLBACK
    # =========================================================================
    return CopilotCommandResponse(
        intent="ASSISTANT_QUERY",
        message=(
            f"NexusTwin Spatial Copilot online. I can optimize equipment placement (e.g. *'Find a 2U slot with 600W headroom'*), "
            f"simulate blast radius (e.g. *'What happens if SW-CORE-01 fails?'*), navigate spatial hierarchy (e.g. *'Fly to Rack B03'*), "
            f"or retrieve datacenter SOPs."
        ),
        actions=[
            CopilotAction(type="SET_HEATMAP", label="Thermal Heatmap", payload={"mode": "THERMAL"}),
            CopilotAction(type="SET_HEATMAP", label="Power Density", payload={"mode": "POWER"}),
        ],
    )
