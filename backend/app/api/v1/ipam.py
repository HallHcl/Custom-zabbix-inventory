import ipaddress
import uuid
from typing import Any, Dict, List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.db.models import Subnet, Device
from backend.app.schemas import (
    SubnetCreate,
    SubnetUpdate,
    SubnetResponse,
    SubnetIPDetail,
)
from backend.app.services.redis_service import redis_service
from backend.app.services.zabbix_service import zabbix_service

router = APIRouter()


def resolve_subnet_id(val: Any) -> Any:
    try:
        return uuid.UUID(str(val))
    except Exception:
        return val


def compute_subnet_stats(cidr: str, used_ips: int) -> Tuple[int, int, int, float]:
    """Calculate total, used, free, and utilization percentage for a CIDR"""
    try:
        net = ipaddress.ip_network(cidr, strict=False)
        if net.prefixlen >= 31:
            total = net.num_addresses
        else:
            total = max(0, net.num_addresses - 2)  # Exclude network & broadcast

        free = max(0, total - used_ips)
        utilization = round((used_ips / total * 100), 2) if total > 0 else 0.0
        return total, used_ips, free, min(100.0, utilization)
    except ValueError:
        return 0, used_ips, 0, 0.0


async def get_all_device_ips(db: AsyncSession) -> List[Tuple[str, Any, str, Optional[str]]]:
    """Fetch all registered device IPs with id, name, zabbix_host_id"""
    stmt = select(Device.management_ip, Device.id, Device.name, Device.zabbix_hostid).where(
        Device.management_ip.isnot(None)
    )
    result = await db.execute(stmt)
    return [(str(row[0]).strip(), row[1], row[2], row[3]) for row in result.all() if row[0]]


@router.get("/subnets", response_model=List[SubnetResponse])
async def list_subnets(
    search: Optional[str] = Query(None, description="Search by subnet name or CIDR"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all IPAM subnets enriched with live utilization statistics and IP counts.
    """
    stmt = select(Subnet).order_by(Subnet.vlan_id.asc().nullslast(), Subnet.name.asc())
    result = await db.execute(stmt)
    subnets = result.scalars().all()

    # Load all device IPs for cross-matching
    device_ips = await get_all_device_ips(db)

    responses = []
    for s in subnets:
        if search:
            query = search.lower()
            if query not in s.name.lower() and query not in s.cidr.lower():
                continue

        # Count matched IPs within subnet CIDR
        used_count = 0
        try:
            net = ipaddress.ip_network(s.cidr, strict=False)
            matched_ips = set()
            for ip_str, _, _, _ in device_ips:
                try:
                    if ipaddress.ip_address(ip_str) in net:
                        matched_ips.add(ip_str)
                except ValueError:
                    continue
            
            # If gateway is within subnet, count it as allocated
            if s.gateway:
                try:
                    if ipaddress.ip_address(s.gateway.strip()) in net:
                        matched_ips.add(s.gateway.strip())
                except ValueError:
                    pass

            used_count = len(matched_ips)
        except ValueError:
            pass

        total, used, free, util = compute_subnet_stats(s.cidr, used_count)

        responses.append(
            SubnetResponse(
                id=str(s.id),
                name=s.name,
                cidr=s.cidr,
                vlan_id=s.vlan_id,
                gateway=s.gateway,
                dns_servers=s.dns_servers,
                description=s.description,
                created_at=s.created_at,
                total_ips=total,
                used_ips=used,
                free_ips=free,
                utilization_percent=util,
            )
        )

    return responses


@router.post("/subnets", response_model=SubnetResponse)
async def create_subnet(
    subnet_in: SubnetCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new IPAM Subnet with CIDR and Gateway validation.
    """
    # 1. Validate CIDR
    try:
        net = ipaddress.ip_network(subnet_in.cidr.strip(), strict=False)
        canonical_cidr = str(net)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid CIDR notation: {e}")

    # 2. Check for duplicate CIDR
    existing = await db.execute(select(Subnet).where(Subnet.cidr == canonical_cidr))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Subnet CIDR '{canonical_cidr}' already exists.")

    # 3. Validate Gateway if provided
    gateway_str = subnet_in.gateway.strip() if subnet_in.gateway else None
    if gateway_str:
        try:
            gw_ip = ipaddress.ip_address(gateway_str)
            if gw_ip not in net:
                raise HTTPException(
                    status_code=400,
                    detail=f"Gateway IP '{gateway_str}' is outside of subnet CIDR '{canonical_cidr}'.",
                )
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid Gateway IP address: '{gateway_str}'.")

    # 4. Create and save Subnet
    new_subnet = Subnet(
        name=subnet_in.name.strip(),
        cidr=canonical_cidr,
        vlan_id=subnet_in.vlan_id,
        gateway=gateway_str,
        dns_servers=subnet_in.dns_servers.strip() if subnet_in.dns_servers else None,
        description=subnet_in.description,
    )
    db.add(new_subnet)
    await db.commit()
    await db.refresh(new_subnet)

    # Initial stats
    initial_used = 1 if gateway_str else 0
    total, used, free, util = compute_subnet_stats(new_subnet.cidr, initial_used)

    return SubnetResponse(
        id=str(new_subnet.id),
        name=new_subnet.name,
        cidr=new_subnet.cidr,
        vlan_id=new_subnet.vlan_id,
        gateway=new_subnet.gateway,
        dns_servers=new_subnet.dns_servers,
        description=new_subnet.description,
        created_at=new_subnet.created_at,
        total_ips=total,
        used_ips=used,
        free_ips=free,
        utilization_percent=util,
    )


@router.get("/subnets/{subnet_id}", response_model=SubnetResponse)
async def get_subnet(
    subnet_id: Any,
    db: AsyncSession = Depends(get_db),
):
    """
    Get single subnet details with live utilization.
    """
    s_id = resolve_subnet_id(subnet_id)
    result = await db.execute(select(Subnet).where((Subnet.id == s_id) | (Subnet.name == str(subnet_id))))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail=f"Subnet ID {subnet_id} not found")

    device_ips = await get_all_device_ips(db)
    matched_ips = set()
    try:
        net = ipaddress.ip_network(s.cidr, strict=False)
        for ip_str, _, _, _ in device_ips:
            try:
                if ipaddress.ip_address(ip_str) in net:
                    matched_ips.add(ip_str)
            except ValueError:
                continue
        if s.gateway:
            try:
                if ipaddress.ip_address(s.gateway.strip()) in net:
                    matched_ips.add(s.gateway.strip())
            except ValueError:
                pass
    except ValueError:
        pass

    total, used, free, util = compute_subnet_stats(s.cidr, len(matched_ips))

    return SubnetResponse(
        id=str(s.id),
        name=s.name,
        cidr=s.cidr,
        vlan_id=s.vlan_id,
        gateway=s.gateway,
        dns_servers=s.dns_servers,
        description=s.description,
        created_at=s.created_at,
        total_ips=total,
        used_ips=used,
        free_ips=free,
        utilization_percent=util,
    )


@router.patch("/subnets/{subnet_id}", response_model=SubnetResponse)
async def update_subnet(
    subnet_id: Any,
    update_in: SubnetUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update subnet configuration (Name, VLAN ID, Gateway, DNS, Description).
    """
    s_id = resolve_subnet_id(subnet_id)
    result = await db.execute(select(Subnet).where((Subnet.id == s_id) | (Subnet.name == str(subnet_id))))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail=f"Subnet ID {subnet_id} not found")

    if update_in.name is not None:
        s.name = update_in.name.strip()
    if update_in.vlan_id is not None:
        s.vlan_id = update_in.vlan_id
    if update_in.dns_servers is not None:
        s.dns_servers = update_in.dns_servers.strip()
    if update_in.description is not None:
        s.description = update_in.description

    if update_in.gateway is not None:
        gw = update_in.gateway.strip() if update_in.gateway else None
        if gw:
            try:
                net = ipaddress.ip_network(s.cidr, strict=False)
                if ipaddress.ip_address(gw) not in net:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Gateway IP '{gw}' is outside of subnet CIDR '{s.cidr}'.",
                    )
                s.gateway = gw
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid Gateway IP address: '{gw}'.")
        else:
            s.gateway = None

    await db.commit()
    await db.refresh(s)

    # Recalculate stats
    device_ips = await get_all_device_ips(db)
    matched_ips = set()
    try:
        net = ipaddress.ip_network(s.cidr, strict=False)
        for ip_str, _, _, _ in device_ips:
            try:
                if ipaddress.ip_address(ip_str) in net:
                    matched_ips.add(ip_str)
            except ValueError:
                continue
        if s.gateway and ipaddress.ip_address(s.gateway) in net:
            matched_ips.add(s.gateway)
    except ValueError:
        pass

    total, used, free, util = compute_subnet_stats(s.cidr, len(matched_ips))

    return SubnetResponse(
        id=str(s.id),
        name=s.name,
        cidr=s.cidr,
        vlan_id=s.vlan_id,
        gateway=s.gateway,
        dns_servers=s.dns_servers,
        description=s.description,
        created_at=s.created_at,
        total_ips=total,
        used_ips=used,
        free_ips=free,
        utilization_percent=util,
    )


@router.delete("/subnets/{subnet_id}")
async def delete_subnet(
    subnet_id: Any,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a subnet from IPAM.
    """
    s_id = resolve_subnet_id(subnet_id)
    result = await db.execute(select(Subnet).where((Subnet.id == s_id) | (Subnet.name == str(subnet_id))))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail=f"Subnet ID {subnet_id} not found")

    await db.delete(s)
    await db.commit()
    return {"status": "success", "message": f"Subnet '{s.name}' ({s.cidr}) deleted."}


@router.get("/subnets/{subnet_id}/ips", response_model=List[SubnetIPDetail])
async def get_subnet_ip_map(
    subnet_id: Any,
    limit: int = Query(256, ge=1, le=1024, description="Max IPs to return"),
    offset: int = Query(0, ge=0, description="IP list offset"),
    db: AsyncSession = Depends(get_db),
):
    """
    Subnet IP Grid Allocation Map:
    Returns individual IP breakdown inside this subnet, classifying each address
    as: 'gateway', 'assigned' (DCIM Device), 'zabbix_monitored', or 'available'.
    """
    s_id = resolve_subnet_id(subnet_id)
    result = await db.execute(select(Subnet).where((Subnet.id == s_id) | (Subnet.name == str(subnet_id))))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail=f"Subnet ID {subnet_id} not found")

    try:
        net = ipaddress.ip_network(s.cidr, strict=False)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Subnet CIDR: {e}")

    # Build DB Device IP map
    device_ips = await get_all_device_ips(db)
    device_map: Dict[str, Dict[str, Any]] = {}
    for ip_str, dev_id, dev_name, zh_id in device_ips:
        try:
            if ipaddress.ip_address(ip_str) in net:
                device_map[ip_str] = {
                    "device_id": str(dev_id) if dev_id else None,
                    "device_name": dev_name,
                    "zabbix_host_id": zh_id,
                }
        except ValueError:
            continue

    # Build Zabbix interface IP map (from cached hosts)
    zabbix_ip_map: Dict[str, str] = {}
    try:
        cached_unassigned = await redis_service.get_unassigned_hosts()
        if cached_unassigned and "hosts" in cached_unassigned:
            for zh in cached_unassigned["hosts"]:
                ip = zh.get("ip")
                if ip:
                    try:
                        if ipaddress.ip_address(ip) in net:
                            zabbix_ip_map[ip] = zh.get("hostid")
                    except ValueError:
                        pass
    except Exception:
        pass

    gw_ip = s.gateway.strip() if s.gateway else None

    # Generate IP list
    if net.prefixlen >= 31:
        hosts_generator = net
    else:
        hosts_generator = net.hosts()

    ip_details = []
    for idx, host_addr in enumerate(hosts_generator):
        if idx < offset:
            continue
        if len(ip_details) >= limit:
            break

        ip_str = str(host_addr)
        is_gw = (ip_str == gw_ip)

        if is_gw:
            status = "gateway"
            dev_id = None
            dev_name = "Default Gateway"
            zh_id = None
        elif ip_str in device_map:
            status = "assigned"
            info = device_map[ip_str]
            dev_id = info["device_id"]
            dev_name = info["device_name"]
            zh_id = info["zabbix_host_id"]
        elif ip_str in zabbix_ip_map:
            status = "zabbix_monitored"
            dev_id = None
            dev_name = None
            zh_id = zabbix_ip_map[ip_str]
        else:
            status = "available"
            dev_id = None
            dev_name = None
            zh_id = None

        ip_details.append(
            SubnetIPDetail(
                ip=ip_str,
                status=status,
                device_id=dev_id,
                device_name=dev_name,
                zabbix_host_id=zh_id,
                is_gateway=is_gw,
            )
        )

    return ip_details
