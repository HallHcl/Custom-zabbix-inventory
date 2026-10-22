import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.app.config import settings
from backend.app.services.zabbix_service import zabbix_service
from backend.app.services.redis_service import redis_service


class SyncService:
    @staticmethod
    def map_severity_to_status(severity: int) -> str:
        # Zabbix trigger priority: 0=Not classified, 1=Info, 2=Warning, 3=Average, 4=High, 5=Disaster
        if severity >= 3:
            return "critical"
        elif severity >= 1:
            return "warning"
        return "ok"

    async def record_sync_failure(self, error_msg: str) -> Dict[str, Any]:
        """Record sync failure and determine whether data is STALE or DISCONNECTED"""
        prev_meta = await redis_service.get_zabbix_sync_status()
        now = time.time()
        last_ts = prev_meta.get("last_sync_timestamp", 0) if prev_meta else 0
        delta = int(now - last_ts) if last_ts else 999999

        if delta <= settings.ZABBIX_STALE_THRESHOLD_SECONDS:
            status = "CONNECTED"
            msg = f"Temporary sync hiccup, serving cached data ({delta}s old)"
        elif delta <= settings.ZABBIX_DISCONNECTED_THRESHOLD_SECONDS:
            status = "STALE"
            msg = f"STALE DATA (Sync ล่าสุดเมื่อ {delta} วินาทีที่แล้ว)"
        else:
            status = "DISCONNECTED"
            msg = f"Zabbix Disconnected: {error_msg}"

        failure_meta = {
            "status": status,
            "last_sync_timestamp": last_ts,
            "last_sync_time": prev_meta.get("last_sync_time") if prev_meta else None,
            "version": prev_meta.get("version") if prev_meta else None,
            "monitored_hosts_count": prev_meta.get("monitored_hosts_count", 0) if prev_meta else 0,
            "active_problems_count": prev_meta.get("active_problems_count", 0) if prev_meta else 0,
            "error": error_msg,
            "message": msg,
        }
        await redis_service.cache_zabbix_sync_status(failure_meta, ttl=86400)
        return failure_meta

    async def get_sync_status(self) -> Dict[str, Any]:
        """
        Evaluate real-time Zabbix connectivity status according to DC VISION spec:
        - CONNECTED: Last sync <= 120s
        - STALE: 120s < Last sync <= 600s
        - DISCONNECTED: > 600s or unreachable
        """
        meta = await redis_service.get_zabbix_sync_status()
        now = time.time()
        if not meta or not meta.get("last_sync_timestamp"):
            # If no cached sync record, probe live version directly
            try:
                version = await zabbix_service.get_version()
                return {
                    "status": "CONNECTED",
                    "last_sync_time": datetime.now(timezone.utc).isoformat(),
                    "seconds_since_last_sync": 0,
                    "version": version,
                    "monitored_hosts_count": 0,
                    "active_problems_count": 0,
                    "zabbix_url": settings.zabbix_effective_url,
                    "zabbix_web_console_url": settings.zabbix_web_console_url,
                    "message": f"Zabbix {version} connected",
                }
            except Exception as e:
                return {
                    "status": "DISCONNECTED",
                    "last_sync_time": None,
                    "seconds_since_last_sync": None,
                    "version": None,
                    "monitored_hosts_count": 0,
                    "active_problems_count": 0,
                    "zabbix_url": settings.zabbix_effective_url,
                    "zabbix_web_console_url": settings.zabbix_web_console_url,
                    "message": f"Zabbix Disconnected: {str(e)}",
                }

        last_ts = meta.get("last_sync_timestamp", 0)
        delta = int(now - last_ts)

        if delta <= settings.ZABBIX_STALE_THRESHOLD_SECONDS:
            computed_status = "CONNECTED"
            msg = meta.get("message") or f"Zabbix {meta.get('version')} connected"
        elif delta <= settings.ZABBIX_DISCONNECTED_THRESHOLD_SECONDS:
            computed_status = "STALE"
            msg = f"STALE DATA (Sync ล่าสุดเมื่อ {delta} วินาทีที่แล้ว)"
        else:
            computed_status = "DISCONNECTED"
            msg = "Zabbix Disconnected (ติดต่อไม่ได้เกิน 10 นาที)"

        return {
            "status": computed_status,
            "last_sync_time": meta.get("last_sync_time"),
            "seconds_since_last_sync": delta,
            "version": meta.get("version"),
            "monitored_hosts_count": meta.get("monitored_hosts_count", 0),
            "active_problems_count": meta.get("active_problems_count", 0),
            "zabbix_url": settings.zabbix_effective_url,
            "zabbix_web_console_url": settings.zabbix_web_console_url,
            "message": msg,
        }

    async def sync_zabbix_cache(self) -> Dict[str, Any]:
        """Fetch latest Zabbix state and refresh Redis cache"""
        now = time.time()
        try:
            version = await zabbix_service.get_version()
            hosts = await zabbix_service.get_all_hosts()
            problems = await zabbix_service.get_active_problems()
        except Exception as e:
            await self.record_sync_failure(str(e))
            raise e

        # Cache global active problems list
        await redis_service.cache_active_problems(problems, ttl=60)

        # Map problems by hostid
        problems_by_host: Dict[str, List[Dict[str, Any]]] = {}
        for p in problems:
            for h in p.get("hosts", []):
                hid = h.get("hostid")
                if hid:
                    if hid not in problems_by_host:
                        problems_by_host[hid] = []
                    problems_by_host[hid].append(p)

        # Cache each host summary into Redis
        synced_count = 0
        for h in hosts:
            hid = h.get("hostid")
            if not hid:
                continue

            host_probs = problems_by_host.get(hid, [])
            highest_sev = 0
            if host_probs:
                highest_sev = max([int(p.get("priority", 0)) for p in host_probs])

            # Extract main interface IP
            ip = ""
            for iface in h.get("interfaces", []):
                if iface.get("main") == "1" or not ip:
                    ip = iface.get("ip", "")

            summary = {
                "hostid": hid,
                "name": h.get("name", h.get("host", "")),
                "ip": ip,
                "status": self.map_severity_to_status(highest_sev) if host_probs else "ok",
                "highest_severity": highest_sev,
                "problems_count": len(host_probs),
                "problems": [
                    {
                        "triggerid": p.get("triggerid"),
                        "description": p.get("description"),
                        "priority": int(p.get("priority", 0)),
                        "lastchange": p.get("lastchange"),
                    }
                    for p in host_probs
                ],
            }

            await redis_service.cache_host_summary(hid, summary, ttl=180)
            synced_count += 1

        # Cache successful sync metadata into Redis
        sync_meta = {
            "status": "CONNECTED",
            "last_sync_timestamp": now,
            "last_sync_time": datetime.now(timezone.utc).isoformat(),
            "version": version,
            "monitored_hosts_count": len(hosts),
            "active_problems_count": len(problems),
            "error": None,
            "message": f"Zabbix {version} synchronized successfully",
        }
        await redis_service.cache_zabbix_sync_status(sync_meta, ttl=86400)

        return {
            "synced_hosts": synced_count,
            "total_problems": len(problems),
            "version": version,
            "status": "CONNECTED",
        }


sync_service = SyncService()
