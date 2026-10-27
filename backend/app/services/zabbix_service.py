import json
import logging
import time
from typing import Any, Dict, List, Optional
import httpx
from backend.app.config import settings
from backend.app.services.telemetry_simulator import telemetry_simulator

logger = logging.getLogger(__name__)


class ResolvedDeviceMetrics:
    def __init__(
        self,
        cpu_utilization: Optional[float] = None,
        memory_utilization: Optional[float] = None,
        temperature_c: Optional[float] = None,
        cpu_item_id: Optional[str] = None,
        cpu_is_idle: bool = False,
    ):
        self.cpu_utilization = cpu_utilization
        self.memory_utilization = memory_utilization
        self.temperature_c = temperature_c
        self.cpu_item_id = cpu_item_id
        self.cpu_is_idle = cpu_is_idle


class ZabbixService:
    """
    Async client for Zabbix 7.0 JSON-RPC API with dual-mode fallback to TelemetrySimulator.
    Allows seamless operation with real Zabbix (External/Embedded) and out-of-the-box demo simulation.
    """

    @staticmethod
    def resolve_telemetry_metrics(items: List[Dict[str, Any]]) -> ResolvedDeviceMetrics:
        """
        Resolves CPU, Memory, and Temperature metrics from Zabbix items
        following official Zabbix 7.0 standard templates (Linux, Windows, SNMP, Docker).
        """
        cpu_val: Optional[float] = None
        cpu_item_id: Optional[str] = None
        cpu_is_idle: bool = False
        mem_val: Optional[float] = None
        temp_val: Optional[float] = None

        # -------------------------------------------------------------
        # 1. CPU Resolution
        # -------------------------------------------------------------
        # P1: Direct utilization item (system.cpu.util, docker.cpu_pct, cpu utilization %)
        for it in items:
            k = it.get("key_", "").lower()
            n = it.get("name_", it.get("name", "")).lower()
            u = it.get("units", "")
            v = it.get("lastvalue")
            try:
                fval = float(v) if v is not None and v != "" else None
            except ValueError:
                fval = None
            if fval is None or fval < 0.0:
                continue

            # Must not be an idle, guest, interrupt, context switch, load avg, or core count key
            excluded_cpu = (
                "idle", "guest", "interrupt", "iowait", "softirq",
                "steal", "system", "user", "switches", "intr", "num"
            )
            is_direct_zabbix = (
                k == "system.cpu.util"
                or (k.startswith("system.cpu.util[") and not any(x in k for x in excluded_cpu))
            )
            is_docker = k.startswith("docker.cpu_pct")
            is_named_util = ("cpu utilization" in n or "cpu usage" in n) and u == "%"

            if is_direct_zabbix or is_docker or is_named_util:
                if 0.0 <= fval <= 100.0:
                    cpu_val = round(fval, 1)
                    cpu_item_id = str(it.get("itemid"))
                    cpu_is_idle = False
                    break

        # P2: Inverted idle item (100.0 - idle%)
        if cpu_val is None:
            for it in items:
                k = it.get("key_", "").lower()
                n = it.get("name_", it.get("name", "")).lower()
                u = it.get("units", "")
                v = it.get("lastvalue")
                try:
                    fval = float(v) if v is not None and v != "" else None
                except ValueError:
                    fval = None
                if fval is None or fval < 0.0:
                    continue

                if ("idle" in k and "cpu" in k) or ("cpu idle time" in n and u == "%"):
                    if 0.0 <= fval <= 100.0:
                        cpu_val = round(max(0.0, min(100.0, 100.0 - fval)), 1)
                        cpu_item_id = str(it.get("itemid"))
                        cpu_is_idle = True
                        break

        # P3: Combined user + system CPU
        if cpu_val is None:
            user_val = None
            sys_val = None
            for it in items:
                k = it.get("key_", "").lower()
                v = it.get("lastvalue")
                try:
                    fval = float(v) if v is not None and v != "" else None
                except ValueError:
                    fval = None
                if fval is not None:
                    if "system.cpu.util[,user]" in k or "system.cpu.util[all,user]" in k:
                        user_val = fval
                    elif "system.cpu.util[,system]" in k or "system.cpu.util[all,system]" in k:
                        sys_val = fval
            if user_val is not None and sys_val is not None:
                cpu_val = round(max(0.0, min(100.0, user_val + sys_val)), 1)

        # -------------------------------------------------------------
        # 2. Memory Resolution
        # -------------------------------------------------------------
        # P1: Direct % item (vm.memory.util, vm.memory.size[pused], memory utilization %)
        for it in items:
            k = it.get("key_", "").lower()
            n = it.get("name_", it.get("name", "")).lower()
            u = it.get("units", "")
            v = it.get("lastvalue")
            try:
                fval = float(v) if v is not None and v != "" else None
            except ValueError:
                fval = None
            if fval is None or fval < 0.0:
                continue

            if k in ("vm.memory.util", "vm.memory.size[pused]") or (
                ("memory utilization" in n or "memory usage" in n) and u == "%"
            ):
                if 0.0 <= fval <= 100.0:
                    mem_val = round(fval, 1)
                    break

        # P2: Inverted available % (100.0 - pavailable)
        if mem_val is None:
            for it in items:
                k = it.get("key_", "").lower()
                n = it.get("name_", it.get("name", "")).lower()
                u = it.get("units", "")
                v = it.get("lastvalue")
                try:
                    fval = float(v) if v is not None and v != "" else None
                except ValueError:
                    fval = None
                if fval is None or fval < 0.0:
                    continue

                if "pavailable" in k or ("available memory in %" in n and u == "%"):
                    if 0.0 <= fval <= 100.0:
                        mem_val = round(max(0.0, min(100.0, 100.0 - fval)), 1)
                        break

        # P3: Computed from available and total bytes
        if mem_val is None:
            avail_bytes = None
            total_bytes = None
            for it in items:
                k = it.get("key_", "").lower()
                v = it.get("lastvalue")
                try:
                    fval = float(v) if v is not None and v != "" else None
                except ValueError:
                    fval = None
                if fval is not None and fval > 0:
                    if k == "vm.memory.size[available]":
                        avail_bytes = fval
                    elif k == "vm.memory.size[total]":
                        total_bytes = fval
            if avail_bytes is not None and total_bytes and total_bytes > 0:
                mem_val = round(max(0.0, min(100.0, (1.0 - (avail_bytes / total_bytes)) * 100.0)), 1)

        # -------------------------------------------------------------
        # 3. Temperature Resolution
        # -------------------------------------------------------------
        for it in items:
            k = it.get("key_", "").lower()
            n = it.get("name_", it.get("name", "")).lower()
            u = it.get("units", "")
            v = it.get("lastvalue")
            try:
                fval = float(v) if v is not None and v != "" else None
            except ValueError:
                fval = None
            if fval is None:
                continue

            if ("temp" in k or "temp" in n) and ("walk" not in k):
                # Filter out non-thermal sensors like fan, voltage, psu
                if not any(x in k for x in ["fan", "voltage", "psu", "power"]):
                    if -20.0 <= fval <= 150.0:
                        temp_val = round(fval, 1)
                        break

        return ResolvedDeviceMetrics(
            cpu_utilization=cpu_val,
            memory_utilization=mem_val,
            temperature_c=temp_val,
            cpu_item_id=cpu_item_id,
            cpu_is_idle=cpu_is_idle,
        )

    @staticmethod
    def resolve_host_inventory(
        inventory: Optional[Dict[str, Any]] = None,
        items: Optional[List[Dict[str, Any]]] = None,
        interfaces: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Extracts and resolves normalized Hardware and OS Inventory from:
        1. Zabbix host inventory object (if populated)
        2. Live Zabbix system items (system.sw.os, system.sw.arch, system.uname, etc.)
        3. Host network interfaces
        """
        inv = inventory if isinstance(inventory, dict) else {}
        items_list = items or []
        ifaces_list = interfaces or []

        items_by_key: Dict[str, str] = {}
        for it in items_list:
            k = it.get("key_", "").lower()
            v = it.get("lastvalue")
            if v is not None and v != "":
                items_by_key[k] = str(v).strip()

        # 1. OS & Kernel Resolution
        raw_os = inv.get("os_full") or inv.get("os") or ""
        if not raw_os:
            for k, v in items_by_key.items():
                if k.startswith("system.sw.os"):
                    raw_os = v
                    break
        if not raw_os:
            raw_os = items_by_key.get("system.uname", "")

        # Clean/format OS Name for display
        os_display = raw_os
        if "almalinux" in raw_os.lower():
            if "el9" in raw_os.lower() or " 9" in raw_os or "9." in raw_os:
                os_display = "AlmaLinux 9"
            elif "el8" in raw_os.lower() or " 8" in raw_os or "8." in raw_os:
                os_display = "AlmaLinux 8"
            else:
                os_display = "AlmaLinux OS"
        elif "ubuntu" in raw_os.lower():
            os_display = "Ubuntu Linux"
        elif "windows" in raw_os.lower():
            os_display = "Microsoft Windows"
        elif "debian" in raw_os.lower():
            os_display = "Debian GNU/Linux"
        elif "red hat" in raw_os.lower() or "rhel" in raw_os.lower():
            os_display = "Red Hat Enterprise Linux"
        elif raw_os.startswith("Linux ") and "(" in raw_os:
            os_display = raw_os.split("(")[0].strip()

        # 2. Architecture
        arch = inv.get("hw_arch") or items_by_key.get("system.sw.arch", "")
        if not arch:
            if "x86_64" in raw_os.lower():
                arch = "x86_64"
            elif "aarch64" in raw_os.lower() or "arm64" in raw_os.lower():
                arch = "aarch64"

        # 3. Kernel
        kernel = items_by_key.get("system.uname") or inv.get("software") or ""

        # 4. Serial Number
        serial = (
            inv.get("serialno_a")
            or inv.get("serialno_b")
            or items_by_key.get("system.hw.serialnumber")
            or items_by_key.get("system.hw.chassis[serial]")
            or ""
        )

        # 5. MAC Address
        mac = inv.get("macaddress_a") or items_by_key.get("net.if.mac", "")
        if not mac:
            for k, v in items_by_key.items():
                if "mac" in k and ":" in v and len(v) == 17:
                    mac = v
                    break
        if not mac and ifaces_list:
            for iface in ifaces_list:
                cand = iface.get("mac")
                if cand:
                    mac = cand
                    break

        # 6. Hardware Model & Vendor
        model = inv.get("model") or inv.get("hardware") or items_by_key.get("system.hw.model", "")
        vendor = inv.get("vendor") or items_by_key.get("system.hw.vendor", "")

        # 7. CPU Cores & Hostname
        cpu_count = items_by_key.get("system.cpu.num", "")
        hostname = items_by_key.get("system.hostname", "")

        return {
            "os": os_display or None,
            "os_full": raw_os or None,
            "os_arch": arch or None,
            "kernel": kernel or None,
            "serial_number": serial or None,
            "mac_address": mac or None,
            "hardware_model": model or None,
            "vendor": vendor or None,
            "cpu_cores": int(cpu_count) if cpu_count.isdigit() else None,
            "hostname": hostname or None,
            "location": inv.get("location") or None,
            "asset_tag": inv.get("asset_tag") or inv.get("tag") or None,
            "inventory_mode": inv.get("inventory_mode", None),
        }

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
        """Fetch all monitored hosts with interfaces, tags, host groups, and inventory"""
        params = {
            "output": ["hostid", "host", "name", "status", "description", "inventory_mode"],
            "selectInterfaces": ["interfaceid", "ip", "dns", "port", "type", "main"],
            "selectTags": ["tag", "value"],
            "selectHostGroups": ["groupid", "name"],
            "selectInventory": "extend",
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

    async def get_host_inventory_items(self, host_id: str) -> List[Dict[str, Any]]:
        """Fetch system, OS, and hardware inventory items for a host"""
        params = {
            "output": ["itemid", "name", "key_", "lastvalue", "units", "lastclock"],
            "hostids": [host_id],
            "monitored": True,
            "search": {
                "key_": ["system.sw.os", "system.sw.arch", "system.uname", "system.hostname", "system.cpu.num", "system.hw", "net.if.mac"],
            },
            "searchByAny": True,
        }
        try:
            return await self._call("item.get", params) or []
        except Exception:
            return []

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
                "key_": ["cpu", "memory", "mem", "temp", "processor", "load", "util"],
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

    async def get_host_groups(self) -> List[Dict[str, Any]]:
        """Fetch all host groups for host provisioning"""
        params = {
            "output": ["groupid", "name"],
            "sortfield": "name",
        }
        try:
            res = await self._call("hostgroup.get", params)
            return res if isinstance(res, list) else []
        except Exception as e:
            if settings.SIMULATE_ZABBIX_TELEMETRY:
                logger.warning(f"[Zabbix] Using simulated host groups: {e}")
                return [
                    {"groupid": "2", "name": "Linux servers"},
                    {"groupid": "4", "name": "Zabbix servers"},
                    {"groupid": "20", "name": "Databases"},
                    {"groupid": "23", "name": "#Network Switch"},
                    {"groupid": "30", "name": "Docker Containers"},
                ]
            raise e

    async def get_templates(self, search: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch available templates for host provisioning"""
        params: Dict[str, Any] = {
            "output": ["templateid", "name", "host"],
            "sortfield": "name",
            "limit": 1000,
        }
        if search:
            params["search"] = {"name": search, "host": search}
            params["searchByAny"] = True
        try:
            res = await self._call("template.get", params)
            return res if isinstance(res, list) else []
        except Exception as e:
            if settings.SIMULATE_ZABBIX_TELEMETRY:
                logger.warning(f"[Zabbix] Using simulated templates: {e}")
                return [
                    {"templateid": "10001", "name": "Linux by Zabbix agent", "host": "Linux by Zabbix agent"},
                    {"templateid": "10081", "name": "Windows by Zabbix agent", "host": "Windows by Zabbix agent"},
                    {"templateid": "10186", "name": "Cisco IOS by SNMP", "host": "Cisco IOS by SNMP"},
                    {"templateid": "10200", "name": "Generic SNMP", "host": "Generic SNMP"},
                    {"templateid": "10047", "name": "Zabbix server health", "host": "Zabbix server health"},
                ]
            raise e

    async def create_host(self, host_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new host in Zabbix via host.create API.
        Returns: {"hostids": ["10500"]}
        """
        try:
            res = await self._call("host.create", host_params)
            return res
        except Exception as e:
            if settings.SIMULATE_ZABBIX_TELEMETRY:
                logger.warning(f"[Zabbix] Simulated host.create: {e}")
                import random
                sim_id = str(random.randint(20000, 99999))
                return {"hostids": [sim_id]}
            raise e


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
