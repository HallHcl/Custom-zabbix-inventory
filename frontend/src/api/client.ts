import type {
  RoomOverview,
  RackElevation,
  DeviceMetrics,
  ZabbixHostOption,
  Device,
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
  const url = new URL(`${window.location.origin}${API_BASE}/devices`)
  if (params?.rack_id) url.searchParams.append('rack_id', String(params.rack_id))
  if (params?.device_type) url.searchParams.append('device_type', params.device_type)

  const res = await fetch(url.toString())
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
