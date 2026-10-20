import type {
  RoomOverview,
  RackElevation,
  DeviceMetrics,
  ZabbixHostOption,
  Device,
  RoomLayout,
  UnassignedHostsOverview,
  DeviceAssignFromZabbix,
  DeviceStatusUpdate,
  Subnet,
  SubnetCreate,
  SubnetGridMap,
} from '../types'

const API_BASE = '/api/v1'

export async function fetchRoomOverview(roomName: string = 'Room A'): Promise<RoomOverview> {
  const res = await fetch(`${API_BASE}/overview?room_name=${encodeURIComponent(roomName)}`)
  if (!res.ok) throw new Error('Failed to fetch room overview')
  return res.json()
}

export async function fetchRackElevation(rackId: number): Promise<RackElevation> {
  const res = await fetch(`${API_BASE}/racks/${rackId}/elevation`)
  if (!res.ok) throw new Error(`Failed to fetch rack elevation for ID ${rackId}`)
  return res.json()
}

export async function fetchRacks(roomId: number = 1) {
  const res = await fetch(`${API_BASE}/racks?room_id=${roomId}`)
  if (!res.ok) throw new Error('Failed to fetch racks')
  return res.json()
}

export async function fetchDevices(params?: { rack_id?: number; device_type?: string }): Promise<Device[]> {
  const query = new URLSearchParams()
  if (params?.rack_id) query.append('rack_id', String(params.rack_id))
  if (params?.device_type) query.append('device_type', params.device_type)
  const qs = query.toString() ? `?${query.toString()}` : ''

  const res = await fetch(`${API_BASE}/devices${qs}`)
  if (!res.ok) throw new Error('Failed to fetch devices')
  return res.json()
}

export async function fetchDeviceMetrics(deviceId: number): Promise<DeviceMetrics> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/metrics`)
  if (!res.ok) throw new Error(`Failed to fetch device metrics for ID ${deviceId}`)
  return res.json()
}

export async function fetchZabbixHosts(): Promise<ZabbixHostOption[]> {
  const res = await fetch(`${API_BASE}/zabbix/hosts`)
  if (!res.ok) return []
  return res.json()
}

export async function mountDevice(payload: {
  rack_id: number
  name: string
  device_type: string
  model?: string
  manufacturer?: string
  start_u: number
  height_u: number
  position_face: 'Front' | 'Rear'
  ip_address?: string
  serial_number?: string
  zabbix_host_id?: string
}): Promise<Device> {
  const res = await fetch(`${API_BASE}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to mount device')
  }
  return res.json()
}

export async function unmountDevice(deviceId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(`Failed to unmount device ${deviceId}`)
}

export async function fetchDeviceOverview(deviceId: number): Promise<import('../types').DeviceOverview> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/overview`)
  if (!res.ok) throw new Error(`Failed to fetch device overview for ID ${deviceId}`)
  return res.json()
}

export async function updateDeviceInventory(
  deviceId: number,
  payload: {
    custom_fields?: Record<string, any>
    tags?: Record<string, any>
    brand?: string
    vendor?: string
    version?: string
    user?: string
    role?: string
    notes?: string
  }
): Promise<Device> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/inventory`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update device inventory')
  return res.json()
}

// ─── Floor Plan Editor API ───────────────────────────────────

export async function fetchRoomLayout(roomId: number = 1): Promise<RoomLayout> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/layout`)
  if (!res.ok) throw new Error('Failed to fetch room layout')
  return res.json()
}

export async function updateRoomLayout(
  roomId: number,
  gridRows: number,
  gridCols: number
): Promise<RoomLayout> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/layout`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grid_rows: gridRows, grid_cols: gridCols }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to update room layout')
  }
  return res.json()
}

export async function batchUpdateRackPositions(
  roomId: number,
  positions: { rack_id: number; row: string; col: number }[]
): Promise<void> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/rack-positions`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to update rack positions')
  }
}

export async function createRack(
  roomId: number,
  payload: { name: string; row: string; col: number; total_u?: number; room_id: number }
): Promise<{ id: number; name: string; row: string; col: number; total_u: number; room_id: number }> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/racks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to create rack')
  }
  return res.json()
}

export async function deleteRack(roomId: number, rackId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/rooms/${roomId}/racks/${rackId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to delete rack')
  }
}

// ─── Zabbix Ingestion & Reconciliation API ──────────────────

export async function fetchUnassignedHosts(): Promise<UnassignedHostsOverview> {
  const res = await fetch(`${API_BASE}/zabbix/unassigned-hosts`)
  if (!res.ok) throw new Error('Failed to fetch unassigned Zabbix hosts')
  return res.json()
}

export async function assignDeviceFromZabbix(payload: DeviceAssignFromZabbix): Promise<Device> {
  const res = await fetch(`${API_BASE}/devices/assign-from-zabbix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to slot device into rack')
  }
  return res.json()
}

export async function updateDeviceStatus(
  deviceId: number,
  status: DeviceStatusUpdate['status']
): Promise<Device> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to update device operational status')
  }
  return res.json()
}

// ─── IPAM Lite API ──────────────────────────────────────────

export async function fetchSubnets(): Promise<Subnet[]> {
  const res = await fetch(`${API_BASE}/ipam/subnets`)
  if (!res.ok) throw new Error('Failed to fetch subnets')
  return res.json()
}

export async function createSubnet(payload: SubnetCreate): Promise<Subnet> {
  const res = await fetch(`${API_BASE}/ipam/subnets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to create subnet')
  }
  return res.json()
}

export async function deleteSubnet(subnetId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/ipam/subnets/${subnetId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to delete subnet')
  }
}

export async function fetchSubnetGridMap(subnetId: number): Promise<SubnetGridMap> {
  const res = await fetch(`${API_BASE}/ipam/subnets/${subnetId}/ips`)
  if (!res.ok) throw new Error(`Failed to fetch IP grid for subnet ${subnetId}`)
  return res.json()
}

