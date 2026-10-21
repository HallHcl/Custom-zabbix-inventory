export type PersonaMode = "NOC" | "Supervisor" | "Manager";
export type HeatmapOverlay = "STATUS" | "THERMAL" | "POWER" | "SPACE";

export interface RackTelemetry {
  rack_id: string;
  rack_name: string;
  inlet_temp_c: number;
  exhaust_temp_c: number;
  delta_t_c: number;
  humidity_pct: number;
  pdu_a_watts: number;
  pdu_b_watts: number;
  total_power_watts: number;
  max_power_watts: number;
  power_usage_pct: number;
  redundancy_failover_risk: boolean;
  thermal_status: "OPTIMAL" | "WARNING" | "CRITICAL";
  timestamp: string;
}

export interface DeviceTelemetry {
  device_id: string;
  zabbix_hostid: string | null;
  device_name: string;
  cpu_util_pct: number;
  memory_util_pct: number;
  network_in_mbps: number;
  network_out_mbps: number;
  power_watts: number;
  status: string;
  ping_latency_ms: number | null;
  active_problems: any[];
  timestamp: string;
}

export interface FacilityTelemetry {
  total_it_load_kw: number;
  cooling_load_kw: number;
  infrastructure_loss_kw: number;
  total_facility_power_kw: number;
  pue: number;
  pue_efficiency_rating: "EXCELLENT" | "GOOD" | "MODERATE" | "POOR";
  timestamp: string;
}

export interface LiveAlarmEvent {
  event_type: string;
  event_id: string;
  event_status: "PROBLEM" | "RESOLVED";
  severity: number;
  trigger_name: string;
  item_name?: string;
  item_value?: string;
  correlation: {
    correlation_status: "ROOT_CAUSE" | "SUPPRESSED_CHILD" | "UNMAPPED_IN_TWIN";
    is_root_cause: boolean;
    suppressed_children_count: number;
    suppressed_children: Array<{
      device_id: string;
      device_name: string;
      rack_name: string;
      correlation_tag: string;
      root_cause_parent: string;
    }>;
    target_device?: {
      id: string;
      name: string;
      rack_name?: string;
      rack_id?: string;
      room_name?: string;
      room_id?: string;
      u_position?: number;
    };
  };
  timestamp: string;
}

export interface SpatialBreadcrumb {
  siteName: string;
  buildingName?: string;
  roomName?: string;
  rowName?: string;
  rackName?: string;
}
