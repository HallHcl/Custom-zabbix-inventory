import json
from typing import Any, Dict, List, Optional
import httpx
from backend.app.config import settings


class ZabbixService:
    def __init__(self, url: Optional[str] = None, token: Optional[str] = None):
        self.url = url or settings.ZABBIX_URL
        self.token = token or settings.ZABBIX_API_TOKEN
        self._req_id = 1

    async def _call(self, method: str, params: Optional[Dict[str, Any]] = None) -> Any:
        headers = {
            "Content-Type": "application/json-rpc",
        }
        # In Zabbix 7.0, apiinfo.version must be unauthenticated
        # Other methods must use Authorization: Bearer <token>
        if self.token and method != "apiinfo.version":
            headers["Authorization"] = f"Bearer {self.token}"

        payload: Dict[str, Any] = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": self._req_id,
        }
        self._req_id += 1

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(self.url, json=payload, headers=headers)
            response.raise_for_status()

            raw_text = response.text.strip()
            # If PHP warnings/notices are prepended (e.g. <br /><b>Deprecated</b>...), strip until first '{'
            if not raw_text.startswith("{") and "{" in raw_text:
                raw_text = raw_text[raw_text.find("{") :]

            data = json.loads(raw_text)

            if "error" in data:
                raise RuntimeError(f"Zabbix API Error: {data['error']}")
            return data.get("result")

    async def get_version(self) -> str:
        """Get Zabbix Server API version"""
        return await self._call("apiinfo.version", {})

    async def get_all_hosts(self) -> List[Dict[str, Any]]:
        """Fetch all monitored hosts with interfaces, tags, and host groups"""
        params = {
            "output": ["hostid", "host", "name", "status", "description"],
            "selectInterfaces": ["interfaceid", "ip", "dns", "port", "type", "main"],
            "selectTags": ["tag", "value"],
            "selectHostGroups": ["groupid", "name"],
            "monitored_hosts": True,
        }
        return await self._call("host.get", params)

    async def get_active_problems(self, host_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Fetch active triggers / problems with severity and host info"""
        params: Dict[str, Any] = {
            "output": ["triggerid", "description", "priority", "value", "lastchange"],
            "filter": {"value": 1},  # 1 = Problem state
            "monitored": True,
            "only_true": True,
            "expandDescription": True,
            "selectHosts": ["hostid", "name"],
        }
        if host_ids:
            params["hostids"] = host_ids

        return await self._call("trigger.get", params)

    async def get_host_latest_metrics(self, host_id: str) -> List[Dict[str, Any]]:
        """Fetch latest values for CPU, Memory, and Temperature items"""
        params = {
            "output": ["itemid", "name", "key_", "lastvalue", "units", "lastclock", "value_type"],
            "hostids": [host_id],
            "monitored": True,
            "search": {
                "key_": ["cpu", "memory", "temp"],
            },
            "searchByAny": True,
        }
        return await self._call("item.get", params)

    async def get_item_history(self, item_id: str, value_type: int = 0, limit: int = 60) -> List[Dict[str, Any]]:
        """Fetch historical values (e.g. last 60 points) for sparkline charts"""
        params = {
            "output": ["clock", "value"],
            "itemids": [item_id],
            "history": value_type,  # 0=float, 3=unsigned int
            "sortfield": "clock",
            "sortorder": "DESC",
            "limit": limit,
        }
        history = await self._call("history.get", params)
        if isinstance(history, list):
            history.reverse()  # Return in chronological order
        return history


    async def get_host_all_items(self, host_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch all latest items for a host (Latest Data page)"""
        params = {
            "output": ["itemid", "name", "key_", "lastvalue", "units", "lastclock", "value_type"],
            "hostids": [host_id],
            "monitored": True,
            "sortfield": "name",
            "limit": limit,
        }
        return await self._call("item.get", params)


zabbix_service = ZabbixService()
