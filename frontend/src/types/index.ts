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
  zabbix_status?: ZabbixStatusSummary | null
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
  status_counts: {
    healthy: number
    warning: number
    critical: number
    offline: number
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
