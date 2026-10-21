import asyncio
import logging
import time
from typing import Dict, Any, List
from sqlalchemy import select

from backend.app.config import settings
from backend.app.db.session import AsyncSessionLocal
from backend.app.db.models import Rack, Device
from backend.app.services.zabbix_service import zabbix_service
from backend.app.services.redis_service import redis_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [ZabbixPoller] %(message)s")
logger = logging.getLogger("ZabbixPoller")


async def poll_once() -> Dict[str, Any]:
    """
    Executes a single cycle of Zabbix digital twin telemetry collection:
    1. Queries all Racks and Devices from dcim_db
    2. Gathers thermal and dual-feed power telemetry
    3. Caches snapshots into Redis (twin:rack:{id}:telemetry, twin:device:{id}:telemetry)
    4. Computes live facility load and PUE
    5. Publishes a delta event to Redis channel 'twin:telemetry_stream'
    """
    start_ts = time.time()
    total_it_watts = 0
    rack_telemetries: Dict[str, Any] = {}
    device_telemetries: Dict[str, Any] = {}

    async with AsyncSessionLocal() as session:
        # 1. Fetch Racks
        racks_res = await session.execute(select(Rack))
        racks: List[Rack] = list(racks_res.scalars().all())

        # 2. Fetch Devices
        devices_res = await session.execute(select(Device))
        devices: List[Device] = list(devices_res.scalars().all())

    # Process Rack Environmentals & Dual PDU telemetry
    for r in racks:
        r_id_str = str(r.id)
        rack_data = zabbix_service.get_rack_telemetry(
            rack_id=r_id_str,
            rack_name=r.name,
            max_power_watts=r.max_power_watts,
        )
        # Cache individual rack snapshot in Redis
        await redis_service.cache_rack_telemetry(r_id_str, rack_data, ttl=120)
        rack_telemetries[r_id_str] = rack_data
        total_it_watts += rack_data.get("total_power_watts", 0)

    # Process Device Compute & Performance telemetry
    for d in devices:
        d_id_str = str(d.id)
        dev_data = zabbix_service.get_device_telemetry(
            device_id=d_id_str,
            zabbix_hostid=d.zabbix_hostid,
            device_name=d.name,
            device_type="SERVER",
            status=d.status,
        )
        # Cache individual device snapshot in Redis
        await redis_service.cache_device_telemetry(d_id_str, dev_data, ttl=120)
        device_telemetries[d_id_str] = dev_data

    # Cache combined racks summary for rapid UI viewport consumption
    await redis_service.cache_all_racks_telemetry(rack_telemetries, ttl=120)

    # Calculate Facility Metrics & Live PUE
    it_power_kw = total_it_watts / 1000.0
    facility_data = zabbix_service.get_facility_metrics(it_power_kw=it_power_kw)
    await redis_service.cache_facility_telemetry(facility_data, ttl=120)

    # Prepare stream payload
    duration_ms = round((time.time() - start_ts) * 1000, 2)
    stream_payload = {
        "event_type": "TELEMETRY_REFRESH",
        "timestamp": facility_data.get("timestamp"),
        "racks_count": len(racks),
        "devices_count": len(devices),
        "total_it_power_kw": facility_data.get("total_it_load_kw"),
        "facility_pue": facility_data.get("pue"),
        "duration_ms": duration_ms,
    }

    # Broadcast to Redis Pub/Sub channel for live WebSocket transmission
    await redis_service.publish_live_event("twin:telemetry_stream", stream_payload)

    logger.info(
        f"Poll cycle completed in {duration_ms}ms: {len(racks)} racks, {len(devices)} devices, "
        f"IT Load: {facility_data.get('total_it_load_kw')}kW, PUE: {facility_data.get('pue')}"
    )

    return stream_payload


async def run_poller_daemon():
    """Continuous background loop polling Zabbix every 30 seconds"""
    interval = settings.ZABBIX_SYNC_INTERVAL_SECONDS
    logger.info(f"Starting NexusTwin Zabbix Poller daemon (interval: {interval}s)...")

    while True:
        try:
            await poll_once()
        except asyncio.CancelledError:
            logger.info("Zabbix Poller received cancellation signal. Exiting.")
            break
        except Exception as e:
            logger.error(f"Error during poll cycle: {e}", exc_info=True)

        await asyncio.sleep(interval)


if __name__ == "__main__":
    try:
        asyncio.run(run_poller_daemon())
    except KeyboardInterrupt:
        logger.info("Poller stopped by user.")
