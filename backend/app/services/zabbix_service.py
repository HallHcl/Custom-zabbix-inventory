import json
import logging
import time
from typing import Any, Dict, List, Optional
import httpx
from backend.app.config import settings
from backend.app.services.telemetry_simulator import telemetry_simulator

logger = logging.getLogger(__name__)


class ZabbixService:
    """
    Async client for Zabbix 7.0 JSON-RPC API with dual-mode fallback to TelemetrySimulator.
    Allows seamless operation with real Zabbix (External/Embedded) and out-of-the-box demo simulation.
    """

    def __init__(self, url: Optional[str] = None, token: Optional[str] = None):
        self.url = url or settings.zabbix_effective_url
        self.token = token or settings.ZABBIX_API_TOKEN
        self._req_id = 1
        self._auth_token: Optional[str] = None

    async def _call(self, method: str, params: Optional[Dict[str, Any]] = None) -> Any:
        headers = {
            "Content-Type": "application/json-rpc",
        }

        # Token authentication precedence
        auth_token = self.token or self._auth_token
        if auth_token and method not in ["apiinfo.version", "user.login"]:
            headers["Authorization"] = f"Bearer {auth_token}"

        payload: Dict[str, Any] = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
            "id": self._req_id,
        }
        self._req_id += 1

        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(self.url, json=payload, headers=headers)
            response.raise_for_status()

            raw_text = response.text.strip()
            # If PHP notices are prepended, strip until first '{'
            if not raw_text.startswith("{") and "{" in raw_text:
                raw_text = raw_text[raw_text.find("{") :]

            data = json.loads(raw_text)
            if "error" in data:
                raise RuntimeError(f"Zabbix API Error: {data['error']}")
            return data.get("result")

    async def login_if_needed(self) -> bool:
        """Authenticate via user/password if API token is not provided"""
        if self.token:
            return True
        try:
            params = {
                "username": settings.ZABBIX_USER,
                "password": settings.ZABBIX_PASSWORD,
            }
            token = await self._call("user.login", params)
            if token:
                self._auth_token = str(token)
                return True
            return False
        except Exception:
            return False

    async def get_version(self) -> str:
        """Get Zabbix Server API version"""
        try:
            return await self._call("apiinfo.version", {})
        except Exception as e:
            if settings.SIMULATE_ZABBIX_TELEMETRY:
                logger.warning(f"[Zabbix] Connection failed. Serving simulated version (SIMULATE_ZABBIX_TELEMETRY=True): {e}")
                return "7.0.0-mock"
            logger.error(f"[Zabbix] Error retrieving version from {self.url}: {e}")
            raise e

    async def get_all_hosts(self) -> List[Dict[str, Any]]:
        """Fetch all monitored hosts with interfaces, tags, and host groups"""
        params = {
            "output": ["hostid", "host", "name", "status", "description"],
            "selectInterfaces": ["interfaceid", "ip", "dns", "port", "type", "main"],
            "selectTags": ["tag", "value"],
            "selectHostGroups": ["groupid", "name"],
            "monitored_hosts": True,
        }
        try:
            return await self._call("host.get", params)
        except Exception as e:
            if settings.SIMULATE_ZABBIX_TELEMETRY:
                logger.warning(f"[Zabbix] Connection failed. Serving simulated host list (SIMULATE_ZABBIX_TELEMETRY=True): {e}")
                return [
                    {
                        "hostid": "10084",
                        "host": "Zabbix server",
                        "name": "Zabbix server",
                        "status": "0",
                        "interfaces": [{"ip": "127.0.0.1", "port": "10050", "type": "1"}],
                    }
                ]
            logger.error(f"[Zabbix] Error retrieving hosts from {self.url}: {e}")
            raise e

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

        try:
            return await self._call("trigger.get", params)
        except Exception as e:
            if settings.SIMULATE_ZABBIX_TELEMETRY:
                logger.warning(f"[Zabbix] Connection failed. Serving empty problems (SIMULATE_ZABBIX_TELEMETRY=True): {e}")
                return []
            logger.error(f"[Zabbix] Error retrieving active problems from {self.url}: {e}")
            raise e

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
        try:
            return await self._call("item.get", params)
        except Exception:
            return []

    async def get_host_all_items(self, host_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch all latest items for a host for the Unified Device Overview / Latest Data view"""
        params = {
            "output": ["itemid", "name", "key_", "lastvalue", "units", "lastclock", "value_type"],
            "hostids": [host_id],
            "monitored": True,
            "sortfield": "name",
            "limit": limit,
        }
        try:
            return await self._call("item.get", params) or []
        except Exception:
            return []

    async def get_item_history(self, item_id: str, value_type: int = 0, limit: int = 60) -> List[Dict[str, Any]]:
        """Fetch historical values (e.g. last 60 points) for sparkline charts"""
        params = {
            "output": ["clock", "value"],
            "itemids": [item_id],
            "history": value_type,
            "sortfield": "clock",
            "sortorder": "DESC",
            "limit": limit,
        }
        try:
            history = await self._call("history.get", params)
            if isinstance(history, list):
                history.reverse()
            return history
        except Exception:
            return []

    async def create_maintenance(self, host_ids: List[str], name: str, duration_seconds: int = 7200) -> Optional[Dict[str, Any]]:
        """Create a temporary maintenance period in Zabbix to suppress alerts"""
        now = int(time.time())
        params = {
            "name": name,
            "active_since": now,
            "active_till": now + duration_seconds,
            "hostids": host_ids,
            "timeperiods": [
                {
                    "timeperiod_type": 0,
                    "start_date": now,
                    "period": duration_seconds,
                }
            ],
        }
        try:
            return await self._call("maintenance.create", params)
        except Exception as e:
            print(f"[Zabbix Maintenance] Warning: Could not create maintenance in Zabbix: {e}")
            if settings.SIMULATE_ZABBIX_TELEMETRY:
                return {"maintenanceids": ["simulated_maint_1"]}
            return None

    async def delete_maintenance_by_name(self, name: str) -> bool:
        """Find and remove a maintenance period by name"""
        try:
            records = await self._call("maintenance.get", {"filter": {"name": name}})
            if records and isinstance(records, list):
                maint_ids = [m.get("maintenanceid") for m in records if m.get("maintenanceid")]
                if maint_ids:
                    await self._call("maintenance.delete", maint_ids)
                    return True
            return False
        except Exception as e:
            print(f"[Zabbix Maintenance] Warning: Could not delete maintenance: {e}")
            return False

    # ========================================================================
    # Digital Twin Real-Time Telemetry Methods (Rack & Device)
    # ========================================================================
    def get_rack_telemetry(self, rack_id: str, rack_name: str, max_power_watts: int = 8000) -> Dict[str, Any]:
        """Fetch or simulate rack environmental & dual PDU telemetry"""
        return telemetry_simulator.generate_rack_telemetry(
            rack_id=rack_id,
            rack_name=rack_name,
            max_power_watts=max_power_watts,
        )

    def get_device_telemetry(
        self,
        device_id: str,
        zabbix_hostid: Optional[str],
        device_name: str,
        device_type: str = "SERVER",
        status: str = "ACTIVE",
    ) -> Dict[str, Any]:
        """Fetch or simulate device compute, power, and ping telemetry"""
        return telemetry_simulator.generate_device_telemetry(
            device_id=device_id,
            zabbix_hostid=zabbix_hostid,
            device_name=device_name,
            device_type=device_type,
            status=status,
        )

    def get_facility_metrics(self, it_power_kw: float) -> Dict[str, Any]:
        """Calculate live facility power load, cooling, and PUE"""
        return telemetry_simulator.generate_facility_metrics(it_power_kw=it_power_kw)

    def get_unassigned_hosts(self) -> List[Dict[str, Any]]:
        """Fetch or simulate auto-discovered Zabbix hosts for the Onboarding Inbox"""
        return telemetry_simulator.generate_unassigned_hosts()


zabbix_service = ZabbixService()
