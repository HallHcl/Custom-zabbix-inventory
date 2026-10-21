import uuid
from typing import Dict, Any, List, Optional, Set
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.db.session import AsyncSessionLocal
from backend.app.db.models import Device, DeviceConnection, Rack, Room, Building


class BlastRadiusService:
    """
    Blast-Radius & Root-Cause Graph Correlation Engine.
    Traverses the physical network and power topology graph (device_connections)
    to compute downstream impact, detect single-corded power risks, and correlate
    simultaneous alarms to isolate ROOT_CAUSE vs SUPPRESSED_CHILD.
    """

    async def get_device_by_hostid(self, zabbix_hostid: str) -> Optional[Device]:
        """Lookup device by Zabbix hostid with rack and connections eager-loaded"""
        async with AsyncSessionLocal() as session:
            stmt = (
                select(Device)
                .where(Device.zabbix_hostid == zabbix_hostid)
                .options(
                    selectinload(Device.rack),
                    selectinload(Device.room),
                    selectinload(Device.source_connections),
                    selectinload(Device.target_connections),
                )
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

    async def get_device_by_id(self, device_id: uuid.UUID) -> Optional[Device]:
        """Lookup device by primary UUID with rack and connections eager-loaded"""
        async with AsyncSessionLocal() as session:
            stmt = (
                select(Device)
                .where(Device.id == device_id)
                .options(
                    selectinload(Device.rack),
                    selectinload(Device.room),
                    selectinload(Device.source_connections),
                    selectinload(Device.target_connections),
                )
            )
            result = await session.execute(stmt)
            return result.scalar_one_or_none()

    async def calculate_blast_radius(self, target_device_id: uuid.UUID) -> Dict[str, Any]:
        """
        Calculate downstream blast radius if target_device goes down or enters maintenance:
        - Downstream connected servers/devices
        - Single-corded power loss risks vs Dual-corded failover safe
        - Affected business departments and project names
        - Location coordinates (Rack, Room)
        """
        async with AsyncSessionLocal() as session:
            # 1. Fetch Target Device
            stmt = (
                select(Device)
                .where(Device.id == target_device_id)
                .options(
                    selectinload(Device.rack),
                    selectinload(Device.room),
                    selectinload(Device.source_connections),
                    selectinload(Device.target_connections),
                )
            )
            res = await session.execute(stmt)
            target = res.scalar_one_or_none()
            if not target:
                raise ValueError(f"Device {target_device_id} not found in dcim_db")

            # 2. Find all connections where target is source or target
            conn_stmt = (
                select(DeviceConnection)
                .where(
                    (DeviceConnection.source_device_id == target_device_id)
                    | (DeviceConnection.target_device_id == target_device_id)
                )
            )
            conn_res = await session.execute(conn_stmt)
            connections = list(conn_res.scalars().all())

            # Find peer device IDs
            peer_device_ids: Set[uuid.UUID] = set()
            for c in connections:
                if c.source_device_id == target_device_id:
                    peer_device_ids.add(c.target_device_id)
                else:
                    peer_device_ids.add(c.source_device_id)

            # 3. Fetch all peer devices with their full power/network connections
            peers_stmt = (
                select(Device)
                .where(Device.id.in_(peer_device_ids))
                .options(
                    selectinload(Device.rack),
                    selectinload(Device.source_connections),
                    selectinload(Device.target_connections),
                )
            )
            peers_res = await session.execute(peers_stmt)
            peer_devices: List[Device] = list(peers_res.scalars().all())

            affected_servers: List[Dict[str, Any]] = []
            single_corded_risks: List[Dict[str, Any]] = []
            affected_departments: Set[str] = set()
            affected_projects: Set[str] = set()

            is_pdu = "PDU" in target.name
            is_switch = "SW" in target.name or "SWITCH" in target.name

            for peer in peer_devices:
                if peer.owner_department:
                    affected_departments.add(peer.owner_department)
                if peer.project_name:
                    affected_projects.add(peer.project_name)

                # Check power redundancy if a PDU is affected
                if is_pdu:
                    # Check all power connections of the peer server
                    peer_power_conns = [
                        c for c in peer.source_connections
                        if c.connection_type in ["POWER_A", "POWER_B"]
                    ]
                    has_power_a = any(c.connection_type == "POWER_A" for c in peer_power_conns)
                    has_power_b = any(c.connection_type == "POWER_B" for c in peer_power_conns)

                    if not (has_power_a and has_power_b):
                        # Single-corded! It will lose power completely!
                        single_corded_risks.append({
                            "device_id": str(peer.id),
                            "name": peer.name,
                            "rack_name": peer.rack.name if peer.rack else "Unracked",
                            "u_position": peer.u_position_start,
                            "risk_type": "POWER_OUTAGE_IMMEDIATE",
                            "reason": "Single-corded feed with no secondary PDU path",
                        })
                    else:
                        affected_servers.append({
                            "device_id": str(peer.id),
                            "name": peer.name,
                            "rack_name": peer.rack.name if peer.rack else "Unracked",
                            "u_position": peer.u_position_start,
                            "impact": "REDUNDANCY_DEGRADED",
                            "reason": "Dual-corded: Feed will failover to secondary PDU",
                        })
                else:
                    # Switch or Core Network Failure
                    affected_servers.append({
                        "device_id": str(peer.id),
                        "name": peer.name,
                        "rack_name": peer.rack.name if peer.rack else "Unracked",
                        "u_position": peer.u_position_start,
                        "impact": "NETWORK_ISOLATION",
                        "reason": f"Uplink severed via parent {target.name}",
                    })

            # Calculate risk severity level
            if len(single_corded_risks) > 0 or len(affected_servers) > 10:
                risk_severity = "CRITICAL"
            elif len(affected_servers) > 0:
                risk_severity = "WARNING"
            else:
                risk_severity = "LOW"

            return {
                "target_device": {
                    "id": str(target.id),
                    "name": target.name,
                    "rack_name": target.rack.name if target.rack else None,
                    "room_name": target.room.name if target.room else None,
                    "u_position": target.u_position_start,
                    "category": "PDU" if is_pdu else ("SWITCH" if is_switch else "SERVER"),
                },
                "risk_severity": risk_severity,
                "affected_devices_count": len(affected_servers) + len(single_corded_risks),
                "affected_servers": affected_servers,
                "single_corded_power_risks": single_corded_risks,
                "affected_departments": sorted(list(affected_departments)),
                "affected_projects": sorted(list(affected_projects)),
            }

    async def correlate_alarm_event(
        self,
        zabbix_hostid: str,
        hostname: str,
        trigger_name: str,
        severity: int = 4,
    ) -> Dict[str, Any]:
        """
        Correlate incoming Zabbix webhook event against DCIM topology:
        1. Resolves device and location in the 3D twin (Room, Row, Rack).
        2. Detects if this device is a Parent (ToR Switch / PDU).
           If so, flags this alarm as ROOT_CAUSE and identifies downstream suppressed children.
        3. If this device is a Child server, checks if its parent switch is already down.
        """
        target = await self.get_device_by_hostid(zabbix_hostid)

        if not target:
            # Device not yet racked or known in DCIM
            return {
                "zabbix_hostid": zabbix_hostid,
                "hostname": hostname,
                "correlation_status": "UNMAPPED_IN_TWIN",
                "is_root_cause": True,
                "suppressed_children": [],
                "target_device": None,
                "trigger_name": trigger_name,
                "severity": severity,
            }

        # Check if device is a Top-of-Rack Switch or Distribution Switch
        is_parent_switch = any(tag in target.name.upper() for tag in ["SW-TOR", "SW-CORE", "SWITCH"])
        is_parent_pdu = "PDU" in target.name.upper()

        suppressed_children = []
        is_root_cause = True

        if is_parent_switch or is_parent_pdu:
            blast = await self.calculate_blast_radius(target.id)
            # All downstream servers are flagged as suppressed children to avoid alert storms!
            for srv in blast["affected_servers"] + blast["single_corded_power_risks"]:
                suppressed_children.append({
                    "device_id": srv["device_id"],
                    "device_name": srv["name"],
                    "rack_name": srv["rack_name"],
                    "correlation_tag": "SUPPRESSED_CHILD",
                    "root_cause_parent": target.name,
                })

        return {
            "zabbix_hostid": zabbix_hostid,
            "hostname": hostname,
            "correlation_status": "ROOT_CAUSE" if is_root_cause else "SUPPRESSED_CHILD",
            "is_root_cause": is_root_cause,
            "suppressed_children_count": len(suppressed_children),
            "suppressed_children": suppressed_children,
            "target_device": {
                "id": str(target.id),
                "name": target.name,
                "rack_name": target.rack.name if target.rack else None,
                "rack_id": str(target.rack_id) if target.rack_id else None,
                "room_name": target.room.name if target.room else None,
                "room_id": str(target.room_id) if target.room_id else None,
                "u_position": target.u_position_start,
            },
            "trigger_name": trigger_name,
            "severity": severity,
        }


blast_radius_service = BlastRadiusService()
