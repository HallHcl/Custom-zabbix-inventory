from datetime import datetime
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
    start_u: int = Field(default=1, ge=0, le=52)
    height_u: int = Field(default=1, ge=0, le=52)
    position_face: str = "Front"
    ip_address: Optional[str] = None
    serial_number: Optional[str] = None
    zabbix_host_id: Optional[str] = None
    status: str = "Active"  # Active, Maintenance, Planned, Decommissioned
    tags: Optional[Dict[str, Any]] = None
    custom_fields: Optional[Dict[str, Any]] = None


class DeviceCreate(DeviceBase):
    rack_id: Any


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    serial_number: Optional[str] = None
    status: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    tags: Optional[Dict[str, Any]] = None
    rack_id: Optional[Any] = None
    start_u: Optional[int] = None
    height_u: Optional[int] = None
    position_face: Optional[str] = None


class BrandInfo(BaseModel):
    name: str
    tag: str
    color: str
    bg_color: str
    badge_class: str
    glow_color: str
    model_family: Optional[str] = None


class DeviceResponse(DeviceBase):
    id: Any
    rack_id: Optional[Any] = None
    zabbix_status: Optional[ZabbixStatusSummary] = None
    brand_info: Optional[BrandInfo] = None

    model_config = ConfigDict(from_attributes=True)


class RackSummary(BaseModel):
    id: Any
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
    id: Any
    name: str
    row: str
    col: int
    total_u: int = 42
    used_u: int = 0
    usage_percent: float = 0.0
    power_kw: float = 0.0
    inlet_temp_c: float = 0.0
    devices: List[DeviceResponse] = []


class ZabbixConnectionStatus(BaseModel):
    status: str  # "CONNECTED", "STALE", "DISCONNECTED", "ERROR"
    last_sync_time: Optional[str] = None
    seconds_since_last_sync: Optional[int] = None
    version: Optional[str] = None
    monitored_hosts_count: int = 0
    active_problems_count: int = 0
    zabbix_url: str
    zabbix_web_console_url: str
    message: str


class RoomOverviewResponse(BaseModel):
    room_id: Optional[Any] = None
    site_name: str
    room_name: str
    room_temp_c: float
    total_racks: int
    total_devices: int
    total_alerts: int
    total_power_kw: float = 0.0
    total_used_u: int = 0
    total_capacity_u: int = 0
    status_counts: Dict[str, int]
    severity_counts: Dict[str, int] = {}
    grid_rows: int = 4
    grid_cols: int = 6
    racks: List[RackSummary]
    recent_alerts: List[Dict[str, Any]]
    zabbix_status: Optional[ZabbixConnectionStatus] = None


class DeviceMetricHistoryPoint(BaseModel):
    clock: int
    value: float


class DeviceMetricsResponse(BaseModel):
    device_id: Any
    device_name: str
    zabbix_host_id: Optional[str] = None
    cpu_utilization: Optional[float] = None
    memory_utilization: Optional[float] = None
    temperature_c: Optional[float] = None
    cpu_history: List[DeviceMetricHistoryPoint] = []
    active_alerts: List[Dict[str, Any]] = []


class ZabbixLatestItem(BaseModel):
    itemid: str
    name: str
    key_: str
    lastvalue: Optional[str] = None
    units: Optional[str] = None
    lastclock: Optional[str] = None
    category: str = "System"
    change_delta: Optional[str] = None


class DeviceOverviewResponse(BaseModel):
    device_id: Any
    device_name: str
    device_type: str
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    rack_id: Optional[Any] = None
    rack_name: str
    room_name: str
    start_u: int
    height_u: int
    position_face: str
    ip_address: Optional[str] = None
    serial_number: Optional[str] = None
    zabbix_host_id: Optional[str] = None
    status: str = "Active"
    tags: Optional[Dict[str, Any]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    # Live Telemetry
    cpu_utilization: Optional[float] = None
    memory_utilization: Optional[float] = None
    temperature_c: Optional[float] = None
    cpu_history: List[DeviceMetricHistoryPoint] = []
    active_alerts: List[Dict[str, Any]] = []
    # Hardware Specifications & Visual Chassis Identification
    chassis_specs: Optional[Dict[str, Any]] = None
    brand_info: Optional[BrandInfo] = None
    # Zabbix Latest Data Items (Full Metric List)
    latest_data_items: List[ZabbixLatestItem] = []


# ─── Floor Plan Editor Schemas ───────────────────────────────────

class RoomLayoutUpdate(BaseModel):
    """Update the room grid dimensions (rows x cols)"""
    grid_rows: int = Field(..., ge=1, le=20)
    grid_cols: int = Field(..., ge=1, le=20)


class RackCreate(BaseModel):
    """Create a new rack in a room"""
    room_id: Optional[Any] = None
    name: str = Field(..., min_length=1, max_length=50)
    row: str = Field(..., min_length=1, max_length=10)
    col: int = Field(..., ge=1)
    total_u: int = Field(default=42, ge=1, le=60)


class RackPositionUpdate(BaseModel):
    """Update a single rack's grid position"""
    rack_id: Any
    row: str
    col: int


class BatchRackPositionUpdate(BaseModel):
    """Batch update rack positions in a room"""
    positions: List[RackPositionUpdate]


class RackCreateResponse(BaseModel):
    id: Any
    name: str
    row: str
    col: int
    total_u: int
    room_id: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)


class RoomLayoutResponse(BaseModel):
    room_id: Optional[Any] = None
    room_name: str
    grid_rows: int
    grid_cols: int
    racks: List[RackSummary]


# ─── IPAM Lite Schemas ──────────────────────────────────────────

class SubnetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    cidr: str = Field(..., min_length=7, max_length=50)  # e.g. "10.10.20.0/24"
    vlan_id: Optional[int] = None
    gateway: Optional[str] = None
    dns_servers: Optional[str] = None
    description: Optional[str] = None


class SubnetCreate(SubnetBase):
    pass


class SubnetUpdate(BaseModel):
    name: Optional[str] = None
    vlan_id: Optional[int] = None
    gateway: Optional[str] = None
    dns_servers: Optional[str] = None
    description: Optional[str] = None


class SubnetResponse(SubnetBase):
    id: Any
    created_at: Optional[datetime] = None
    total_ips: int = 0
    used_ips: int = 0
    free_ips: int = 0
    utilization_percent: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class SubnetIPDetail(BaseModel):
    ip: str
    status: str  # "assigned", "zabbix_monitored", "gateway", "available"
    device_id: Optional[Any] = None
    device_name: Optional[str] = None
    zabbix_host_id: Optional[str] = None
    is_gateway: bool = False


# ─── Zabbix Unassigned Host Schemas ──────────────────────────────

class UnassignedHostResponse(BaseModel):
    hostid: str
    name: str
    technical_name: str
    ip: str = ""
    dns: Optional[str] = None
    port: Optional[str] = None
    interface_type: str = "Agent"  # Agent, SNMP, IPMI, JMX
    groups: List[str] = []
    tags: Dict[str, str] = {}
    suggested_device_type: str = "Server"  # Server, Switch, Firewall, Storage, UPS
    brand: Optional[str] = None
    suggested_rack_name: Optional[str] = None
    suggested_start_u: Optional[int] = None
    suggested_height_u: Optional[int] = None
    status: str = "ok"  # ok, warning, critical
    problems_count: int = 0


class UnassignedHostsOverview(BaseModel):
    total_unassigned: int
    hosts: List[UnassignedHostResponse]
    cached: bool = False


# ─── Device Assignment & Maintenance Schemas ─────────────────────

class DeviceAssignFromZabbix(BaseModel):
    zabbix_host_id: str
    rack_id: Any
    start_u: int = Field(..., ge=1, le=42)
    height_u: int = Field(default=1, ge=1, le=42)
    position_face: str = "Front"  # Front or Rear
    name: Optional[str] = None
    device_type: Optional[str] = None
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    status: str = "Active"  # Active, Maintenance, Planned, Decommissioned
    custom_fields: Optional[Dict[str, Any]] = None
    tags: Optional[Dict[str, Any]] = None


class DeviceStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(Active|Maintenance|Planned|Decommissioned)$")
    maintenance_duration_hours: int = 2


class DeviceTemplate(BaseModel):
    id: str
    brand: str
    manufacturer: str
    model: str
    device_type: str
    height_u: int
    description: Optional[str] = None
    brand_info: Optional[BrandInfo] = None


class PlacementRequest(BaseModel):
    u_height: int = Field(default=2, ge=1, le=10)
    power_watts: int = Field(default=450, ge=50, le=10000)
    category: str = Field(default="SERVER")  # SERVER, STORAGE, SWITCH, UPS, PDU
    preferred_row: Optional[str] = None      # e.g. "Row A", "Row B"
    weight_kg: Optional[float] = 18.0
    requires_dual_feed: bool = True


class PlacementRecommendation(BaseModel):
    rack_id: str
    rack_name: str
    row_name: str
    recommended_start_u: int
    u_height: int
    composite_score: float
    power_headroom_watts: int
    power_score: float
    thermal_score: float
    ru_zone_score: float
    inlet_temp_c: float
    reasoning: str
    available_slots: List[int] = []


class CopilotAction(BaseModel):
    type: str  # FLY_TO_RACK, SET_HEATMAP, SET_PERSONA, OPEN_BLAST_RADIUS, OPEN_PROVISIONING_WIZARD
    label: str
    payload: Dict[str, Any]


class CopilotCommandRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None


class CopilotCommandResponse(BaseModel):
    intent: str
    message: str
    actions: List[CopilotAction] = []
    recommendations: List[PlacementRecommendation] = []
    knowledge_snippet: Optional[Dict[str, Any]] = None





