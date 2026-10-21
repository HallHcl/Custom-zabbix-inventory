import math
import random
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class TelemetrySimulator:
    """
    Simulates realistic data center telemetry with sine-wave fluctuating environmental,
    power, and performance metrics according to ASHRAE thermal standards and PDU redundancy rules.
    """

    def __init__(self):
        self._start_time = time.time()

    def _wave(self, period_sec: float = 60.0, phase: float = 0.0) -> float:
        """Returns a normalized cyclic value between -1.0 and 1.0"""
        elapsed = time.time() - self._start_time
        return math.sin((2 * math.pi * elapsed / period_sec) + phase)

    def generate_rack_telemetry(
        self,
        rack_id: str,
        rack_name: str,
        max_power_watts: int = 8000,
        baseline_temp: float = 22.5,
    ) -> Dict[str, Any]:
        """
        Generate realistic rack thermal & dual-feed power telemetry.
        - inlet_temp_c: 20°C - 27°C (ASHRAE A1 class)
        - exhaust_temp_c: inlet + 9°C to 14°C delta T
        - humidity_pct: 42% - 56%
        - pdu_a_watts & pdu_b_watts: Total power
        - redundancy_failover_risk: True if (P_A + P_B) > (max_power_watts * 0.50)
        """
        # Create unique seed offset based on rack_name
        hash_seed = sum(ord(c) for c in rack_name)
        phase_offset = (hash_seed % 360) * (math.pi / 180)

        # Some racks run warmer (e.g. AI / HPC racks R-A04, R-B03)
        temp_bias = 3.5 if any(hot in rack_name for hot in ["A04", "B03", "C02"]) else 0.0
        wave_val = self._wave(period_sec=45.0, phase=phase_offset)
        noise = random.uniform(-0.3, 0.3)

        inlet_temp = round(baseline_temp + temp_bias + (wave_val * 1.8) + noise, 1)
        delta_t = round(9.5 + (wave_val * 1.5) + random.uniform(0.0, 0.8), 1)
        exhaust_temp = round(inlet_temp + delta_t, 1)
        humidity = round(48.0 + (wave_val * 4.0) + random.uniform(-1.0, 1.0), 1)

        # Power load calculation
        power_ratio = 0.42 + (0.15 if temp_bias > 0 else 0.0) + (wave_val * 0.06)
        total_watts = int(max_power_watts * power_ratio)

        # Dual Feed PDU A and PDU B load sharing (approx 50/50 with slight imbalance)
        pdu_a_watts = int(total_watts * random.uniform(0.48, 0.53))
        pdu_b_watts = total_watts - pdu_a_watts

        # Dual-Feed Redundancy Failover Risk: True if load on either feed exceeds 50% capacity
        redundancy_risk = (total_watts > (max_power_watts * 0.50))

        # Status determination
        if inlet_temp > 28.0 or total_watts > (max_power_watts * 0.85):
            thermal_status = "CRITICAL"
        elif inlet_temp > 26.0 or redundancy_risk:
            thermal_status = "WARNING"
        else:
            thermal_status = "OPTIMAL"

        return {
            "rack_id": rack_id,
            "rack_name": rack_name,
            "inlet_temp_c": inlet_temp,
            "exhaust_temp_c": exhaust_temp,
            "delta_t_c": delta_t,
            "humidity_pct": humidity,
            "pdu_a_watts": pdu_a_watts,
            "pdu_b_watts": pdu_b_watts,
            "total_power_watts": total_watts,
            "max_power_watts": max_power_watts,
            "power_usage_pct": round((total_watts / max_power_watts) * 100, 1),
            "redundancy_failover_risk": redundancy_risk,
            "thermal_status": thermal_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def generate_device_telemetry(
        self,
        device_id: str,
        zabbix_hostid: Optional[str],
        device_name: str,
        device_type: str = "SERVER",
        status: str = "ACTIVE",
    ) -> Dict[str, Any]:
        """Generate realistic compute/switch performance sparklines & metrics"""
        hash_seed = sum(ord(c) for c in device_name)
        phase = (hash_seed % 360) * (math.pi / 180)
        wave_val = self._wave(period_sec=30.0, phase=phase)

        if status == "MAINTENANCE":
            return {
                "device_id": device_id,
                "zabbix_hostid": zabbix_hostid,
                "device_name": device_name,
                "cpu_util_pct": 0.0,
                "memory_util_pct": 0.0,
                "power_watts": 15,
                "status": "MAINTENANCE",
                "ping_latency_ms": None,
                "active_problems": [],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

        # Active compute node
        cpu_base = 55.0 if "TIT" in device_name or "DB" in device_name else 32.0
        cpu_util = round(min(98.0, max(5.0, cpu_base + (wave_val * 22.0) + random.uniform(-4.0, 4.0))), 1)
        mem_util = round(min(95.0, max(20.0, 62.0 + (wave_val * 10.0) + random.uniform(-1.0, 1.0))), 1)
        power_w = int(220 + (cpu_util * 2.2))
        latency_ms = round(0.45 + (wave_val * 0.15) + random.uniform(0.01, 0.08), 2)

        problems = []
        if cpu_util > 85.0:
            problems.append({
                "problem_id": f"prob-{zabbix_hostid}-cpu",
                "severity": 4,  # High
                "description": f"High CPU utilization on {device_name} ({cpu_util}%)",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        return {
            "device_id": device_id,
            "zabbix_hostid": zabbix_hostid,
            "device_name": device_name,
            "cpu_util_pct": cpu_util,
            "memory_util_pct": mem_util,
            "network_in_mbps": round(140.0 + (wave_val * 45.0), 1),
            "network_out_mbps": round(110.0 + (wave_val * 35.0), 1),
            "power_watts": power_w,
            "status": "ACTIVE",
            "ping_latency_ms": latency_ms,
            "active_problems": problems,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def generate_facility_metrics(self, it_power_kw: float) -> Dict[str, Any]:
        """
        Calculate facility power, cooling, and Live PUE (Power Usage Effectiveness)
        PUE = Total Facility Power / Total IT Equipment Power
        """
        cooling_power_kw = round(it_power_kw * 0.29 + (self._wave(period_sec=120.0) * 4.0), 2)
        infra_loss_kw = round(it_power_kw * 0.07, 2)
        total_facility_kw = round(it_power_kw + cooling_power_kw + infra_loss_kw, 2)
        pue = round(total_facility_kw / it_power_kw, 3) if it_power_kw > 0 else 1.0

        return {
            "total_it_load_kw": round(it_power_kw, 2),
            "cooling_load_kw": cooling_power_kw,
            "infrastructure_loss_kw": infra_loss_kw,
            "total_facility_power_kw": total_facility_kw,
            "pue": pue,
            "pue_efficiency_rating": "EXCELLENT" if pue < 1.35 else ("GOOD" if pue < 1.50 else "MODERATE"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def generate_unassigned_hosts(self) -> List[Dict[str, Any]]:
        """Mock discovered Zabbix hosts for the Auto-Discovery Inbox"""
        return [
            {
                "zabbix_hostid": "99001",
                "hostname": "srv-discov-node-01.corp.internal",
                "ip_address": "10.10.20.91",
                "vendor": "Dell Technologies",
                "model": "PowerEdge R760",
                "category": "SERVER",
                "u_height": 2,
                "typical_power_watts": 450,
                "discovery_time": datetime.now(timezone.utc).isoformat(),
                "agent_status": "ONLINE",
            },
            {
                "zabbix_hostid": "99002",
                "hostname": "sw-access-leaf-99.corp.internal",
                "ip_address": "10.10.10.99",
                "vendor": "Cisco Systems",
                "model": "Catalyst 9300-48UXM",
                "category": "SWITCH",
                "u_height": 1,
                "typical_power_watts": 220,
                "discovery_time": datetime.now(timezone.utc).isoformat(),
                "agent_status": "ONLINE",
            },
            {
                "zabbix_hostid": "99003",
                "hostname": "srv-ai-worker-08.corp.internal",
                "ip_address": "10.10.20.93",
                "vendor": "Dell Technologies",
                "model": "PowerEdge R760",
                "category": "SERVER",
                "u_height": 2,
                "typical_power_watts": 650,
                "discovery_time": datetime.now(timezone.utc).isoformat(),
                "agent_status": "ONLINE",
            },
        ]


telemetry_simulator = TelemetrySimulator()
