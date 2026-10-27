/* Apple UI & Tesla UI Dual-System Design – Verified: 8pt Grid, Telemetry Typography, Pure OLED Black / Cupertino Frost */
import { useState, useEffect, useRef } from 'react'
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
  ChevronDown,
  Check,
  Filter,
} from 'lucide-react'
import type { Device, RackSummary } from '../../types'
import { fetchDevices } from '../../api/client'
import { AddHostModal } from '../rack/AddHostModal'
import { useTheme } from '../../lib/theme'

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
  const { isTeslaDark } = useTheme()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)
  const [isAddHostOpen, setIsAddHostOpen] = useState(false)
  const typeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsTypeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getCategoryCount = (typeId: string) => {
    if (typeId === 'all') return devices.length
    return devices.filter((d) => d.device_type?.toLowerCase() === typeId.toLowerCase()).length
  }

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

  // Summary counts for table footer
  const totalHosts = devices.length
  const filteredCount = filteredDevices.length
  const criticalCount = filteredDevices.filter(
    (d) => d.zabbix_host_id && d.zabbix_status?.status === 'critical'
  ).length
  const warningCount = filteredDevices.filter(
    (d) => d.zabbix_host_id && d.zabbix_status?.status === 'warning'
  ).length
  const nominalCount = filteredDevices.filter(
    (d) =>
      d.zabbix_host_id &&
      (!d.zabbix_status?.status || d.zabbix_status.status === 'ok')
  ).length
  const unlinkedCount = filteredDevices.filter((d) => !d.zabbix_host_id).length

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
    <div
      className={`max-w-[1600px] mx-auto space-y-6 select-none ${
        isTeslaDark ? 'font-sans text-[#F5F5F7]' : 'font-sans text-[#1d1d1f]'
      }`}
    >
      {/* Page Header: Tesla Utilitarian / Apple macOS */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b ${
          isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
        }`}
      >
        <div>
          <div className="flex items-center gap-3">
            <h1
              className={`text-2xl font-bold leading-tight ${
                isTeslaDark ? 'font-mono text-white tracking-tight' : 'tracking-[-0.022em] text-[#1d1d1f]'
              }`}
            >
              Hardware Inventory
            </h1>
            <span
              className={`px-2.5 py-1 text-[11px] font-semibold border ${
                isTeslaDark
                  ? 'rounded-[4px] bg-[#111111] border-[#1F1F1F] text-[#A1A1A6] font-mono'
                  : 'rounded-[8px] bg-black/[0.04] text-zinc-700 border-black/10'
              }`}
            >
              {devices.length} Total Units
            </span>
          </div>
          <p
            className={`text-xs mt-1 ${
              isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 tracking-[-0.011em]'
            }`}
          >
            Real-time Telemetry with Zabbix 7.0 Hosts &amp; Data Center Spatial Enclosures
          </p>
        </div>

        {/* Action Controls Dock */}
        <div className="flex items-center gap-3">
          {onOpenUnassigned && (
            <button
              type="button"
              onClick={onOpenUnassigned}
              className={`h-[44px] px-4 text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#111111] hover:bg-[#161616] border-[#1F1F1F] text-[#F5F5F7] font-mono uppercase tracking-[0.5px]'
                  : 'rounded-[12px] bg-white hover:bg-black/[0.02] border-black/10 text-zinc-700 hover:text-[#1d1d1f] shadow-sm hover:scale-[1.02] active:scale-[0.96]'
              }`}
            >
              <Inbox className={`w-4 h-4 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
              <span>Unassigned Queue</span>
              {typeof unassignedCount === 'number' && unassignedCount > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold text-white ${
                    isTeslaDark ? 'rounded-[2px] bg-[#3E6AE1] font-mono' : 'rounded-[6px] bg-[#0071E3]'
                  }`}
                >
                  {unassignedCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddHostOpen(true)}
            className={`h-[44px] px-5 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#3E6AE1] hover:bg-[#3256B8] text-white font-mono uppercase tracking-[1px]'
                : 'rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm shadow-[#0071E3]/25 hover:scale-[1.02] active:scale-[0.96]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Host</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className={`p-4 border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          isTeslaDark
            ? 'rounded-[10px] bg-[#111111] border-[#1F1F1F]'
            : 'rounded-[16px] bg-white/75 backdrop-blur-xl border-black/10 shadow-sm'
        }`}
      >
        {/* Search Bar */}
        <div className="relative w-full lg:w-80">
          <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${isTeslaDark ? 'text-[#636366]' : 'text-zinc-400'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search host, IP address, vendor, model..."
            className={`w-full h-[40px] pl-10 pr-9 text-xs transition-all tracking-[-0.011em] border focus:outline-none ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F] text-[#F5F5F7] placeholder-[#636366] font-mono focus:border-[#3E6AE1]'
                : 'rounded-[10px] bg-black/[0.04] border-black/10 text-[#1d1d1f] placeholder:text-zinc-400 focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20'
            }`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Dropdown: Apple Cupertino Glass / Tesla Pure Dark */}
        <div className="relative" ref={typeDropdownRef}>
          <button
            type="button"
            onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
            className={`h-[40px] px-4 text-xs font-semibold flex items-center justify-between gap-3 border transition-all cursor-pointer ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#161616] hover:bg-[#1E1E1E] border-[#1F1F1F] text-[#F5F5F7] font-mono'
                : 'rounded-[10px] bg-white hover:bg-black/[0.02] border-black/10 text-[#1d1d1f] shadow-xs hover:border-black/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <Filter className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
              <span>
                {DEVICE_TYPE_OPTIONS.find((opt) => opt.id === selectedType)?.label || 'All Equipment'}
              </span>
              <span
                className={`ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                  isTeslaDark
                    ? 'bg-[#222222] text-[#A1A1A6]'
                    : 'bg-black/[0.06] text-zinc-600'
                }`}
              >
                {getCategoryCount(selectedType)}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isTypeDropdownOpen ? 'rotate-180 text-[#3E6AE1]' : 'text-zinc-400'
              }`}
            />
          </button>

          {isTypeDropdownOpen && (
            <div
              className={`absolute right-0 mt-1.5 w-64 py-1.5 z-40 border shadow-2xl ${
                isTeslaDark
                  ? 'rounded-[8px] bg-[#161616] border-[#2A2A2A] text-[#F5F5F7]'
                  : 'rounded-[14px] bg-white/95 backdrop-blur-xl border-black/10 text-[#1d1d1f]'
              }`}
            >
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Equipment Category
              </div>
              {DEVICE_TYPE_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.id
                const count = getCategoryCount(opt.id)
                const OptionIcon = getDeviceIcon(opt.id === 'all' ? 'server' : opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedType(opt.id)
                      setIsTypeDropdownOpen(false)
                    }}
                    className={`w-full px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? isTeslaDark
                          ? 'bg-[#1C1C1E] text-white font-semibold font-mono'
                          : 'bg-[#0071E3]/10 text-[#0071E3] font-semibold'
                        : isTeslaDark
                        ? 'text-[#A1A1A6] hover:bg-[#1E1E1E] hover:text-[#F5F5F7]'
                        : 'text-zinc-700 hover:bg-black/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <OptionIcon
                        className={`w-3.5 h-3.5 ${
                          isSelected
                            ? isTeslaDark
                              ? 'text-[#3E6AE1]'
                              : 'text-[#0071E3]'
                            : 'text-zinc-400'
                        }`}
                      />
                      <span>{opt.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                          isSelected
                            ? isTeslaDark
                              ? 'bg-[#3E6AE1]/20 text-[#3E6AE1]'
                              : 'bg-[#0071E3]/15 text-[#0071E3]'
                            : isTeslaDark
                            ? 'bg-[#222222] text-[#888888]'
                            : 'bg-black/[0.05] text-zinc-500'
                        }`}
                      >
                        {count}
                      </span>
                      {isSelected && (
                        <Check className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Telemetry Hardware Table: Tesla Utilitarian / Apple Glassmorphic */}
      <div
        className={`overflow-hidden border ${
          isTeslaDark
            ? 'rounded-[10px] bg-[#111111] border-[#1F1F1F]'
            : 'rounded-[20px] bg-white/75 backdrop-blur-2xl saturate-180 border-black/10 shadow-sm'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] tracking-[-0.011em]">
            <thead
              className={`border-b select-none ${
                isTeslaDark
                  ? 'bg-[#070707] border-[#1F1F1F] text-[#636366] font-mono text-[10px] uppercase tracking-[1.5px]'
                  : 'bg-black/[0.02] border-black/10 text-zinc-500 text-[11px] font-semibold uppercase tracking-[0.05em]'
              }`}
            >
              <tr>
                <th className="py-3 px-6">Equipment / Host</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Cabinet &amp; Elevation</th>
                <th className="py-3 px-4">Management Endpoint</th>
                <th className="py-3 px-4">Telemetry Posture</th>
                <th className="py-3 px-6 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isTeslaDark ? 'divide-[#1F1F1F]' : 'divide-black/5'}`}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 animate-spin ${
                          isTeslaDark
                            ? 'border-[#3E6AE1]/30 border-t-[#3E6AE1]'
                            : 'border-[#0071E3]/30 border-t-[#0071E3]'
                        }`}
                      />
                      <span className={`text-[13px] ${isTeslaDark ? 'font-mono text-[#A1A1A6]' : ''}`}>
                        Polling hardware telemetry from Zabbix engine...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="w-8 h-8 text-zinc-300 mb-1" />
                      <p className={`text-[14px] font-semibold ${isTeslaDark ? 'text-white font-mono' : 'text-zinc-700'}`}>
                        No hardware records found
                      </p>
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
                      className={`transition-colors duration-150 group ${
                        isTeslaDark ? 'hover:bg-[#161616]' : 'hover:bg-black/[0.02]'
                      }`}
                    >
                      {/* Equipment / Host Name */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-9 h-9 flex items-center justify-center shrink-0 border ${
                              isTeslaDark
                                ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F] text-[#3E6AE1]'
                                : 'rounded-[10px] bg-black/[0.04] border-black/10 text-[#0071E3]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span
                              className={`font-semibold block text-[13px] truncate ${
                                isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'
                              }`}
                            >
                              {d.name}
                            </span>
                            <span
                              className={`text-[11px] block truncate ${
                                isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500'
                              }`}
                            >
                              {d.zabbix_status?.inventory?.os ? `${d.zabbix_status.inventory.os} • ` : ''}
                              {d.manufacturer || 'Generic'} • {d.model || 'Standard Chassis'}
                              {(d.serial_number || d.zabbix_status?.inventory?.serial_number) ? ` • S/N: ${d.serial_number || d.zabbix_status?.inventory?.serial_number}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 text-[11px] font-semibold border ${
                            isTeslaDark
                              ? 'rounded-[4px] bg-[#161616] border-[#1F1F1F] text-[#A1A1A6] font-mono'
                              : 'rounded-[8px] bg-black/[0.04] border-black/10 text-zinc-700'
                          }`}
                        >
                          {d.device_type || 'Server'}
                        </span>
                      </td>

                      {/* Cabinet & Elevation */}
                      <td className="py-3.5 px-4">
                        <div>
                          <span
                            className={`font-semibold block text-[13px] ${
                              isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-[#1d1d1f]'
                            }`}
                          >
                            {rackName}
                          </span>
                          {d.rack_id && d.start_u ? (
                            <span className={`text-[11px] font-mono ${isTeslaDark ? 'text-[#A1A1A6]' : 'text-zinc-500'}`}>
                              U{d.start_u}
                              {d.height_u > 1 ? `-U${d.start_u + d.height_u - 1}` : ''} ({d.height_u}U)
                            </span>
                          ) : (
                            <span className={`text-[11px] font-mono ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-sky-600'}`}>
                              Cloud / Unallocated
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Management IP */}
                      <td className={`py-3.5 px-4 font-mono text-[12px] ${isTeslaDark ? 'text-[#A1A1A6]' : 'text-zinc-700'}`}>
                        {d.ip_address || <span className="text-zinc-500">—</span>}
                      </td>

                      {/* Telemetry Posture */}
                      <td className="py-3.5 px-4">
                        {d.zabbix_host_id ? (
                          <div className="flex items-center">
                            {status === 'critical' ? (
                              <span
                                className={`px-2.5 py-1 text-[11px] font-semibold border flex items-center gap-1.5 ${
                                  isTeslaDark
                                    ? 'rounded-[2px] bg-[#E82127]/20 border-[#E82127]/40 text-[#E82127] font-mono'
                                    : 'rounded-[8px] bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                <AlertOctagon className="w-3.5 h-3.5" />
                                <span>CRITICAL ({d.zabbix_status?.problems_count || 1})</span>
                              </span>
                            ) : status === 'warning' ? (
                              <span
                                className={`px-2.5 py-1 text-[11px] font-semibold border flex items-center gap-1.5 ${
                                  isTeslaDark
                                    ? 'rounded-[2px] bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B] font-mono'
                                    : 'rounded-[8px] bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>WARNING ({d.zabbix_status?.problems_count || 1})</span>
                              </span>
                            ) : (
                              <span
                                className={`px-2.5 py-1 text-[11px] font-semibold border flex items-center gap-1.5 ${
                                  isTeslaDark
                                    ? 'rounded-[2px] bg-[#00C853]/20 border-[#00C853]/40 text-[#00C853] font-mono'
                                    : 'rounded-[8px] bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>NOMINAL</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium border ${
                              isTeslaDark
                                ? 'rounded-[2px] bg-[#161616] border-[#1F1F1F] text-[#636366] font-mono'
                                : 'rounded-[8px] bg-black/[0.04] text-zinc-400 border-black/10'
                            }`}
                          >
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
                              className={`h-[32px] px-3 text-[12px] font-semibold border transition-all cursor-pointer ${
                                isTeslaDark
                                  ? 'rounded-[4px] bg-[#1C1C1E] hover:bg-[#2E2E2E] border-[#1F1F1F] text-white font-mono uppercase tracking-[0.5px]'
                                  : 'rounded-[8px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black border-black/10 hover:scale-[1.02] active:scale-[0.96]'
                              }`}
                              title="Open full Device Page with Zabbix latest data and specs"
                            >
                              <span>Inspect</span>
                            </button>
                          )}

                          {d.rack_id && (
                            <button
                              type="button"
                              onClick={() => onOpenDeviceInRack(d.rack_id, d.id)}
                              className={`h-[32px] px-3 text-[12px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                                isTeslaDark
                                  ? 'rounded-[4px] bg-[#3E6AE1] hover:bg-[#3256B8] border-[#3E6AE1] text-white font-mono uppercase tracking-[0.5px]'
                                  : 'rounded-[8px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black border-black/10 hover:scale-[1.02] active:scale-[0.96]'
                              }`}
                            >
                              <span>Rack</span>
                              <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                            </button>
                          )}

                          {d.zabbix_host_id && (
                            <a
                              href={`http://192.168.1.85:8080/zabbix.php?action=latest.view&hostids%5B%5D=${d.zabbix_host_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className={`w-8 h-8 flex items-center justify-center border transition-all cursor-pointer ${
                                isTeslaDark
                                  ? 'rounded-[4px] bg-[#161616] hover:bg-[#1C1C1E] border-[#1F1F1F] text-[#A1A1A6] hover:text-white'
                                  : 'rounded-[8px] bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-500 hover:text-black'
                              }`}
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

        {/* Table Footer Summary: Total Hosts & Posture Stats */}
        <div
          className={`px-6 py-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isTeslaDark
              ? 'bg-[#111111] border-[#1F1F1F] text-[#A1A1A6]'
              : 'bg-black/[0.02] border-black/10 text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={isTeslaDark ? 'font-mono' : ''}>
              Showing <strong className={isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}>{filteredCount}</strong> of{' '}
              <strong className={isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}>{totalHosts}</strong> Total Hosts
            </span>
            {(search || selectedType !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setSelectedType('all')
                }}
                className={`ml-2 text-[11px] underline underline-offset-2 transition-colors cursor-pointer ${
                  isTeslaDark ? 'text-[#3E6AE1] hover:text-[#5B82EA] font-mono' : 'text-[#0071E3] hover:text-[#0077ED]'
                }`}
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00C853]" />
              <span className={`text-[11px] ${isTeslaDark ? 'font-mono' : ''}`}>
                Nominal: <strong className={isTeslaDark ? 'text-[#F5F5F7]' : 'text-[#1d1d1f]'}>{nominalCount}</strong>
              </span>
            </div>
            {warningCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className={`text-[11px] ${isTeslaDark ? 'font-mono' : ''}`}>
                  Warning: <strong className={isTeslaDark ? 'text-[#F59E0B]' : 'text-amber-700'}>{warningCount}</strong>
                </span>
              </div>
            )}
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E82127]" />
                <span className={`text-[11px] ${isTeslaDark ? 'font-mono' : ''}`}>
                  Critical: <strong className={isTeslaDark ? 'text-[#E82127]' : 'text-rose-700'}>{criticalCount}</strong>
                </span>
              </div>
            )}
            {unlinkedCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                <span className={`text-[11px] ${isTeslaDark ? 'font-mono' : ''}`}>
                  Unlinked: <strong className={isTeslaDark ? 'text-zinc-400' : 'text-zinc-600'}>{unlinkedCount}</strong>
                </span>
              </div>
            )}
          </div>
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
