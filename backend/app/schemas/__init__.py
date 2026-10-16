from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ZabbixProblemSummary(BaseModel):
    triggerid: str
    description: str
    priority: int
    lastchange: Optional[str] = None


class ZabbixStatusSummary(BaseModel):
    hostid: str
    name: str
    ip: str = ""
    status: str = "ok"  # ok, warning, critical
    highest_severity: int = 0
    problems_count: int = 0
    problems: List[ZabbixProblemSummary] = []


class DeviceBase(BaseModel):
    name: str
    device_type: str = "Server"
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    start_u: int = Field(..., ge=1, le=42)
    height_u: int = Field(default=1, ge=1, le=42)
    position_face: str = "Front"
    ip_address: Optional[str] = None
    serial_number: Optional[str] = None
    zabbix_host_id: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None


class DeviceCreate(DeviceBase):
    rack_id: int


class DeviceResponse(DeviceBase):
    id: int
    rack_id: int
    zabbix_status: Optional[ZabbixStatusSummary] = None

    model_config = ConfigDict(from_attributes=True)


class RackSummary(BaseModel):
    id: int
    name: str
    row: str
    col: int
    total_u: int = 42
    used_u: int = 0
    usage_percent: float = 0.0
    power_kw: float = 0.0
    inlet_temp_c: float = 0.0
    device_count: int = 0
    status: str = "ok"  # ok, warning, critical, offline
    highest_severity: int = 0


class RackElevationResponse(BaseModel):
    id: int
    name: str
    row: str
    col: int
    total_u: int = 42
    used_u: int = 0
    usage_percent: float = 0.0
    power_kw: float = 0.0
    inlet_temp_c: float = 0.0
    devices: List[DeviceResponse] = []


class RoomOverviewResponse(BaseModel):
    site_name: str
    room_name: str
    room_temp_c: float
    total_racks: int
    total_devices: int
    total_alerts: int
    status_counts: Dict[str, int]
    racks: List[RackSummary]
    recent_alerts: List[Dict[str, Any]]


class DeviceMetricHistoryPoint(BaseModel):
    clock: int
    value: float


class DeviceMetricsResponse(BaseModel):
    device_id: int
    device_name: str
    zabbix_host_id: Optional[str] = None
    cpu_utilization: Optional[float] = None
    memory_utilization: Optional[float] = None
    temperature_c: Optional[float] = None
    cpu_history: List[DeviceMetricHistoryPoint] = []
    active_alerts: List[Dict[str, Any]] = []
