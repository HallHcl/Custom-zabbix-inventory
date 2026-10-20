export interface ZabbixProblem {
  triggerid: string
  description: string
  priority: number
  lastchange?: string
}

export interface ZabbixStatusSummary {
  hostid: string
  name: string
  ip: string
  status: 'ok' | 'warning' | 'critical'
  highest_severity: number
  problems_count: number
  problems: ZabbixProblem[]
}

export interface Device {
  id: number
  rack_id: number
  name: string
  device_type: 'Server' | 'Switch' | 'Firewall' | 'Storage' | 'UPS' | 'Patch Panel' | 'Blank Panel'
  model?: string
  manufacturer?: string
  start_u: number
  height_u: number
  position_face: 'Front' | 'Rear'
  ip_address?: string
  serial_number?: string
  zabbix_host_id?: string
  tags?: Record<string, any>
  custom_fields?: Record<string, any>
  zabbix_status?: ZabbixStatusSummary | null
  status?: 'Active' | 'Planned' | 'Maintenance' | 'Offline'
}

export interface RackSummary {
  id: number
  name: string
  row: string
  col: number
  total_u: number
  used_u: number
  usage_percent: number
  power_kw: number
  inlet_temp_c: number
  device_count: number
  status: 'healthy' | 'warning' | 'critical' | 'offline'
  highest_severity: number
}

export interface RackElevation {
  id: number
  name: string
  row: string
  col: number
  total_u: number
  used_u: number
  usage_percent: number
  power_kw: number
  inlet_temp_c: number
  devices: Device[]
}

export interface RecentAlert {
  triggerid: string
  description: string
  priority: number
  host_name: string
  lastchange?: string
}

export interface RoomOverview {
  site_name: string
  room_name: string
  room_temp_c: number
  total_racks: number
  total_devices: number
  total_alerts: number
  total_power_kw?: number
  total_used_u?: number
  total_capacity_u?: number
  status_counts: {
    healthy: number
    warning: number
    critical: number
    offline: number
  }
  severity_counts?: {
    disaster: number
    high: number
    average: number
    warning: number
    info: number
    unclassified: number
  }
  racks: RackSummary[]
  recent_alerts: RecentAlert[]
}

export interface MetricHistoryPoint {
  clock: number
  value: number
}

export interface DeviceMetrics {
  device_id: number
  device_name: string
  zabbix_host_id?: string
  cpu_utilization: number
  memory_utilization: number
  temperature_c: number
  cpu_history: MetricHistoryPoint[]
  active_alerts: ZabbixProblem[]
}

export interface ZabbixHostOption {
  hostid: string
  name: string
  technical_name: string
  ip: string
}

export interface ZabbixLatestItem {
  itemid: string
  name: string
  key_: string
  lastvalue?: string | null
  units?: string | null
  lastclock?: string | null
  category?: string
  change_delta?: string | null
}

export interface ChassisSpecs {
  form_factor: string
  chassis_class: string
  brand: string
  model_family: string
  drive_bays: string
  psu_spec: string
  network_ports: string
  management_port: string
  dimensions: string
  weight_kg: number
  max_power_watt: number
  front_view_type: string
  rear_view_type: string
  rack_depth_mm: number
}

export interface DeviceOverview {
  device_id: number
  device_name: string
  device_type: string
  model?: string
  manufacturer?: string
  rack_id: number
  rack_name: string
  room_name: string
  start_u: number
  height_u: number
  position_face: string
  ip_address?: string
  serial_number?: string
  zabbix_host_id?: string
  tags?: Record<string, any>
  custom_fields?: Record<string, any>
  cpu_utilization?: number
  memory_utilization?: number
  temperature_c?: number
  cpu_history: MetricHistoryPoint[]
  active_alerts: ZabbixProblem[]
  chassis_specs?: ChassisSpecs
  latest_data_items: ZabbixLatestItem[]
}

// Floor Plan Editor Types
export interface RoomLayout {
  room_id: number
  room_name: string
  grid_rows: number
  grid_cols: number
  racks: RackSummary[]
}

// ─── Zabbix Unassigned Hosts & Device Provisioning Types ─────

export interface UnassignedHost {
  hostid: string
  name: string
  technical_name: string
  ip: string
  port?: string
  status: number
  available: number
  snmp_available: number
  inferred_type: 'Server' | 'Switch' | 'Firewall' | 'Storage' | 'UPS'
  device_model?: string
  tags: Record<string, string>
}

export interface UnassignedHostsOverview {
  total_unassigned: number
  hosts: UnassignedHost[]
}

export interface DeviceAssignFromZabbix {
  zabbix_host_id: string
  name: string
  rack_id: number
  start_u: number
  height_u?: number
  position_face?: 'Front' | 'Rear'
  device_type?: 'Server' | 'Switch' | 'Firewall' | 'Storage' | 'UPS' | 'Patch Panel' | 'Blank Panel'
  model?: string
  manufacturer?: string
  ip_address?: string
  status?: 'Active' | 'Planned' | 'Maintenance' | 'Offline'
}

export interface DeviceStatusUpdate {
  status: 'Active' | 'Planned' | 'Maintenance' | 'Offline'
}

// ─── IPAM Lite Types ──────────────────────────────────────────

export interface Subnet {
  id: number
  cidr: string
  name: string
  gateway?: string | null
  vlan_id?: number | null
  description?: string | null
  created_at?: string
  total_ips: number
  used_ips: number
  utilization_percent: number
}

export interface SubnetCreate {
  cidr: string
  name: string
  gateway?: string
  vlan_id?: number
  description?: string
}

export interface SubnetIPAllocation {
  ip: string
  status: 'allocated' | 'gateway' | 'free'
  device_id?: number
  device_name?: string
  device_type?: string
  zabbix_host_id?: string
}

export interface SubnetGridMap {
  subnet: Subnet
  ips: SubnetIPAllocation[]
}

