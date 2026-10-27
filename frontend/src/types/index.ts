export interface ZabbixProblem {
  triggerid: string
  description: string
  priority: number
  lastchange?: string
}

export interface ZabbixWebLinks {
  base_url: string
  host_url?: string | null
  latest_data_url?: string | null
  problems_url?: string | null
  graphs_url?: string | null
}

export interface ZabbixHostInventory {
  os?: string | null
  os_full?: string | null
  os_arch?: string | null
  kernel?: string | null
  serial_number?: string | null
  mac_address?: string | null
  hardware_model?: string | null
  vendor?: string | null
  cpu_cores?: number | null
  hostname?: string | null
  location?: string | null
  asset_tag?: string | null
  inventory_mode?: string | null
}

export interface ZabbixStatusSummary {
  hostid: string
  name: string
  ip: string
  status: 'ok' | 'warning' | 'critical'
  highest_severity: number
  problems_count: number
  problems: ZabbixProblem[]
  inventory?: ZabbixHostInventory | null
  zabbix_web_links?: ZabbixWebLinks | null
}

export interface BrandInfo {
  name: string
  tag: string
  color: string
  bg_color: string
  badge_class: string
  glow_color: string
  model_family?: string | null
}

export interface DeviceTemplate {
  id: string
  brand: string
  manufacturer: string
  model: string
  device_type: 'Server' | 'Switch' | 'Firewall' | 'Storage' | 'UPS' | 'Patch Panel' | 'Blank Panel' | string
  height_u: number
  description?: string
  brand_info?: BrandInfo | null
}


export interface Device {
  id: any
  rack_id: any
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
  brand_info?: BrandInfo | null
  zabbix_web_links?: ZabbixWebLinks | null
}

export interface RackSummary {
  id: any
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
  id: any
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

export interface ZabbixConnectionStatus {
  status: 'CONNECTED' | 'STALE' | 'DISCONNECTED' | 'ERROR'
  last_sync_time?: string | null
  seconds_since_last_sync?: number | null
  version?: string | null
  monitored_hosts_count: number
  active_problems_count: number
  zabbix_url: string
  zabbix_web_console_url: string
  message: string
}

export interface RoomOverview {
  room_id?: string | number
  site_name: string
  room_name: string
  room_temp_c: number
  grid_rows?: number
  grid_cols?: number
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
  device_type_counts?: Record<string, number>
  racks: RackSummary[]
  recent_alerts: RecentAlert[]
  zabbix_status?: ZabbixConnectionStatus | null
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
  tags?: Array<{ tag: string; value: string }>
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
  brand_info?: BrandInfo | null
  latest_data_items: ZabbixLatestItem[]
  zabbix_inventory?: ZabbixHostInventory | null
  zabbix_web_links?: ZabbixWebLinks | null
}

// Floor Plan Editor Types
export interface RoomLayout {
  room_id: number | string
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
  zabbix_web_links?: ZabbixWebLinks | null
}

export interface UnassignedHostsOverview {
  total_unassigned: number
  hosts: UnassignedHost[]
}

export interface DeviceAssignFromZabbix {
  zabbix_host_id: string
  name: string
  rack_id: number | string
  start_u: number
  height_u?: number
  position_face?: 'Front' | 'Rear'
  device_type?: 'Server' | 'Switch' | 'Firewall' | 'Storage' | 'UPS' | 'Patch Panel' | 'Blank Panel'
  model?: string
  manufacturer?: string
  ip_address?: string
  status?: 'Active' | 'Planned' | 'Maintenance' | 'Offline'
  tags?: Record<string, any>
  custom_fields?: Record<string, any>
}

export interface DeviceStatusUpdate {
  status: 'Active' | 'Planned' | 'Maintenance' | 'Offline'
}

export interface DeviceSpecUpdate {
  name?: string
  device_type?: 'Server' | 'Switch' | 'Firewall' | 'Storage' | 'UPS' | 'Patch Panel' | 'Blank Panel' | string
  model?: string
  manufacturer?: string
  serial_number?: string
  status?: 'Active' | 'Planned' | 'Maintenance' | 'Offline'
  custom_fields?: Record<string, any>
  tags?: Record<string, any>
}

// ─── IPAM Lite Types ──────────────────────────────────────────

export interface Subnet {
  id: any
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

export interface SubnetIPDetail {
  ip: string
  status: 'assigned' | 'zabbix_monitored' | 'gateway' | 'available'
  device_id?: any
  device_name?: string | null
  zabbix_host_id?: string | null
  is_gateway: boolean
}

// ─── AI Copilot & Placement Optimizer Types ───────────────────

export interface PlacementRecommendation {
  rack_id: string
  rack_name: string
  row_name: string
  recommended_start_u: number
  u_height: number
  composite_score: number
  power_headroom_watts: number
  power_score: number
  thermal_score: number
  ru_zone_score: number
  inlet_temp_c: number
  reasoning: string
  available_slots: number[]
}

export interface CopilotAction {
  type: 'FLY_TO_RACK' | 'SET_HEATMAP' | 'SET_PERSONA' | 'OPEN_BLAST_RADIUS' | 'OPEN_PROVISIONING_WIZARD' | string
  label: string
  payload: Record<string, any>
}

export interface KnowledgeSnippet {
  id: string
  title: string
  doc_type: string
  content_preview?: string
  content?: string
}

export interface CopilotCommandResponse {
  intent: string
  message: string
  actions: CopilotAction[]
  recommendations: PlacementRecommendation[]
  knowledge_snippet?: KnowledgeSnippet | null
}

export interface PlacementRequestPayload {
  u_height?: number
  power_watts?: number
  category?: string
  preferred_row?: string
  weight_kg?: number
  requires_dual_feed?: boolean
}

// ─── Zabbix Host Creation & Provisioning Types ────────────────
export interface ZabbixHostGroupOption {
  groupid: string
  name: string
}

export interface ZabbixTemplateOption {
  templateid: string
  name: string
  host: string
}

export interface ZabbixHostInterfaceInput {
  type: number // 1=Agent, 2=SNMP, 3=IPMI, 4=JMX
  main: number // 1=Primary, 0=Secondary
  useip: number // 1=IP, 0=DNS
  ip: string
  dns: string
  port: string
  details?: {
    version?: number // 1=SNMPv1, 2=SNMPv2c, 3=SNMPv3
    community?: string
    securityname?: string
    securitylevel?: number
    authpassphrase?: string
    privpassphrase?: string
    authprotocol?: number
    privprotocol?: number
    contextname?: string
  }
}

export interface ZabbixHostCreatePayload {
  host: string
  name?: string
  group_ids: string[]
  interfaces: ZabbixHostInterfaceInput[]
  template_ids?: string[]
  tags?: Record<string, string>
  description?: string
  status?: number

  // Optional DCIM Rack Binding (Step 4 of Stepper)
  mount_rack_id?: string | number | null
  mount_start_u?: number | null
  mount_height_u?: number
  mount_position_face?: 'Front' | 'Rear' | 'Both'
  device_type?: string
  manufacturer?: string
  model?: string
}

export interface ZabbixHostCreateResponse {
  hostid: string
  host: string
  name: string
  message: string
  device_id?: string | null
  rack_name?: string | null
  status: string
}




