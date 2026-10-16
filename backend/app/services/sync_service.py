from typing import Any, Dict, List
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

    async def sync_zabbix_cache(self) -> Dict[str, Any]:
        """Fetch latest Zabbix state and refresh Redis cache"""
        hosts = await zabbix_service.get_all_hosts()
        problems = await zabbix_service.get_active_problems()

        # Cache global active problems list
        await redis_service.cache_active_problems(problems, ttl=45)

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

            await redis_service.cache_host_summary(hid, summary, ttl=120)
            synced_count += 1

        return {
            "synced_hosts": synced_count,
            "total_problems": len(problems),
        }


sync_service = SyncService()
