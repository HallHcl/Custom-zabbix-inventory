/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */
import { useState, useEffect } from 'react'
import {
  Search,
  Server,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Inbox,
  Plus,
  X,
  Layers,
  Radio,
  Shield,
  HardDrive,
  Cpu,
} from 'lucide-react'
import type { Device, RackSummary } from '../../types'
import { fetchDevices } from '../../api/client'
import { AddHostModal } from '../rack/AddHostModal'

interface DevicesViewProps {
  racks: RackSummary[]
  onOpenDeviceInRack: (rackId: number, deviceId: number) => void
  onOpenDevicePage?: (deviceId: number) => void
  onOpenUnassigned?: () => void
  unassignedCount?: number
}

const DEVICE_TYPE_OPTIONS = [
  { id: 'all', label: 'All Equipment' },
  { id: 'Server', label: 'Servers' },
  { id: 'Switch', label: 'Switches' },
  { id: 'Firewall', label: 'Firewalls' },
  { id: 'Storage', label: 'Storage' },
  { id: 'UPS', label: 'Power & UPS' },
  { id: 'Patch Panel', label: 'Patch Panels' },
]

export function DevicesView({
  racks,
  onOpenDeviceInRack,
  onOpenDevicePage,
  onOpenUnassigned,
  unassignedCount,
}: DevicesViewProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [isAddHostOpen, setIsAddHostOpen] = useState(false)

  const loadDevices = () => {
    setLoading(true)
    fetchDevices()
      .then((data) => setDevices(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDevices()
  }, [])

  const rackMap: Record<number, string> = {}
  racks.forEach((r) => {
    rackMap[r.id] = r.name
  })

  const filteredDevices = devices.filter((d) => {
    if (selectedType !== 'all' && d.device_type !== selectedType) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.name.toLowerCase().includes(q) ||
      (d.ip_address && d.ip_address.includes(q)) ||
      (d.model && d.model.toLowerCase().includes(q)) ||
      (d.manufacturer && d.manufacturer.toLowerCase().includes(q))
    )
  })

  // Helper icon for device type
  const getDeviceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'switch':
        return Radio
      case 'firewall':
        return Shield
      case 'storage':
        return HardDrive
      case 'ups':
        return Cpu
      default:
        return Server
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif] text-[#1d1d1f] select-none">
      
      {/* Apple macOS Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b-[0.5px] border-black/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-semibold tracking-[-0.022em] text-[#1d1d1f] leading-tight">
              Hardware Inventory
            </h1>
            <span className="rounded-[8px] px-2.5 py-1 text-[11px] font-medium bg-black/[0.04] text-zinc-700 border-[0.5px] border-black/10 tracking-[-0.011em]">
              {devices.length} Total Units
            </span>
          </div>
          <p className="text-[13px] text-zinc-500 tracking-[-0.011em] mt-1">
            Real-time Telemetry with Zabbix 7.0 Hosts &amp; Data Center Spatial Enclosures
          </p>
        </div>

        {/* Action Controls Dock */}
        <div className="flex items-center gap-3">
          {onOpenUnassigned && (
            <button
              type="button"
              onClick={onOpenUnassigned}
              className="h-[44px] px-4 rounded-[12px] bg-white hover:bg-black/[0.02] border-[0.5px] border-black/10 text-zinc-700 hover:text-[#1d1d1f] text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.96] cursor-pointer"
            >
              <Inbox className="w-4 h-4 text-[#0071E3]" />
              <span>Unassigned Queue</span>
              {typeof unassignedCount === 'number' && unassignedCount > 0 && (
                <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold bg-[#0071E3] text-white">
                  {unassignedCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddHostOpen(true)}
            className="h-[44px] px-5 rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-semibold flex items-center gap-2 shadow-sm shadow-[#0071E3]/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.96] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Host</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Inset Bar */}
      <div className="p-4 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Spotlight Search Bar */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search host, IP address, vendor, model..."
            className="w-full h-[40px] pl-10 pr-9 rounded-[10px] bg-black/[0.04] border-[0.5px] border-black/10 text-[13px] text-[#1d1d1f] placeholder:text-zinc-400 focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all tracking-[-0.011em]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Segmented Pills */}
        <div className="flex p-1 bg-black/[0.04] rounded-[12px] border-[0.5px] border-black/10 overflow-x-auto no-scrollbar">
          {DEVICE_TYPE_OPTIONS.map((opt) => {
            const isSelected = selectedType === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedType(opt.id)}
                className={`h-[32px] px-3.5 rounded-[8px] text-[12px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-[#1d1d1f] shadow-sm'
                    : 'text-zinc-600 hover:text-black hover:bg-black/[0.04]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Apple Glassmorphism Data Table */}
      <div className="rounded-[20px] bg-white/75 backdrop-blur-2xl saturate-180 border-[0.5px] border-black/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] tracking-[-0.011em]">
            <thead className="bg-black/[0.02] border-b-[0.5px] border-black/10 text-zinc-500 text-[11px] font-semibold uppercase tracking-[0.05em] select-none">
              <tr>
                <th className="py-3 px-6">Equipment / Host</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Cabinet &amp; Elevation</th>
                <th className="py-3 px-4">Management Endpoint</th>
                <th className="py-3 px-4">Telemetry Posture</th>
                <th className="py-3 px-6 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y-[0.5px] divide-black/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 rounded-full border-2 border-[#0071E3]/30 border-t-[#0071E3] animate-spin" />
                      <span className="text-[13px]">Polling hardware telemetry from Zabbix engine...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-zinc-300 mb-1" />
                      <p className="text-[14px] font-semibold text-zinc-700">No hardware records found</p>
                      <p className="text-[12px] text-zinc-500">
                        Try adjusting your search terms or equipment category filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => {
                  const rackName = d.rack_id ? (rackMap[d.rack_id] || 'Rack') : 'Virtual / Unassigned'
                  const status = d.zabbix_status?.status || 'ok'
                  const Icon = getDeviceIcon(d.device_type)

                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-black/[0.02] transition-colors duration-200 group"
                    >
                      {/* Equipment / Host Name */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-[10px] bg-black/[0.04] border-[0.5px] border-black/10 flex items-center justify-center text-[#0071E3] shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-[#1d1d1f] block text-[13px] tracking-[-0.011em] truncate">
                              {d.name}
                            </span>
                            <span className="text-[11px] text-zinc-500 tracking-[-0.011em] block truncate">
                              {d.manufacturer || 'Generic'} • {d.model || 'Standard Chassis'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4">
                        <span className="rounded-[8px] px-2.5 py-1 text-[11px] font-medium bg-black/[0.04] border-[0.5px] border-black/10 text-zinc-700">
                          {d.device_type || 'Server'}
                        </span>
                      </td>

                      {/* Cabinet & Elevation */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-semibold text-[#1d1d1f] block text-[13px] tracking-[-0.011em]">
                            {rackName}
                          </span>
                          {d.rack_id && d.start_u ? (
                            <span className="text-[11px] text-zinc-500 font-mono">
                              U{d.start_u}
                              {d.height_u > 1 ? `-U${d.start_u + d.height_u - 1}` : ''} ({d.height_u}U)
                            </span>
                          ) : (
                            <span className="text-[11px] text-sky-600 font-mono">
                              Cloud / Unallocated
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Management IP */}
                      <td className="py-3.5 px-4 font-mono text-[12px] text-zinc-700">
                        {d.ip_address || <span className="text-zinc-300">—</span>}
                      </td>

                      {/* Telemetry Posture */}
                      <td className="py-3.5 px-4">
                        {d.zabbix_host_id ? (
                          <div className="flex items-center">
                            {status === 'critical' ? (
                              <span className="rounded-[8px] px-2.5 py-1 text-[11px] font-semibold bg-rose-50 text-rose-700 border-[0.5px] border-rose-200 flex items-center gap-1.5">
                                <AlertOctagon className="w-3.5 h-3.5" />
                                <span>CRITICAL ({d.zabbix_status?.problems_count || 1})</span>
                              </span>
                            ) : status === 'warning' ? (
                              <span className="rounded-[8px] px-2.5 py-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border-[0.5px] border-amber-200 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>WARNING ({d.zabbix_status?.problems_count || 1})</span>
                              </span>
                            ) : (
                              <span className="rounded-[8px] px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-[0.5px] border-emerald-200 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>NOMINAL</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-medium bg-black/[0.04] text-zinc-400 border-[0.5px] border-black/10">
                            UNLINKED
                          </span>
                        )}
                      </td>

                      {/* Operations Buttons */}
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {onOpenDevicePage && (
                            <button
                              type="button"
                              onClick={() => onOpenDevicePage(d.id)}
                              className="h-[32px] px-3 rounded-[8px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black text-[12px] font-semibold border-[0.5px] border-black/10 transition-all duration-200 hover:scale-[1.02] active:scale-[0.96] cursor-pointer"
                              title="Open full Device Page with Zabbix latest data and specs"
                            >
                              <span>Inspect</span>
                            </button>
                          )}

                          {d.rack_id && (
                            <button
                              type="button"
                              onClick={() => onOpenDeviceInRack(d.rack_id, d.id)}
                              className="h-[32px] px-3 rounded-[8px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black text-[12px] font-semibold border-[0.5px] border-black/10 flex items-center gap-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.96] cursor-pointer"
                            >
                              <span>Rack</span>
                              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                            </button>
                          )}

                          {d.zabbix_host_id && (
                            <a
                              href={`http://192.168.1.85:8080/zabbix.php?action=latest.view&hostids%5B%5D=${d.zabbix_host_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-8 h-8 rounded-[8px] bg-black/[0.04] hover:bg-black/[0.08] border-[0.5px] border-black/10 text-zinc-500 hover:text-black flex items-center justify-center transition-all duration-200 cursor-pointer"
                              title="Open in Zabbix Latest Data"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Host Modal Wizard */}
      <AddHostModal
        isOpen={isAddHostOpen}
        onClose={() => setIsAddHostOpen(false)}
        racks={racks}
        onSuccess={() => loadDevices()}
      />
    </div>
  )
}
