import { useState, useEffect, useMemo } from 'react'
import {
  X,
  RefreshCw,
  Search,
  Server,
  Network,
  Shield,
  HardDrive,
  Zap,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ExternalLink,
} from 'lucide-react'
import type { UnassignedHost, RackSummary, DeviceAssignFromZabbix } from '../../types'
import { fetchUnassignedHosts, assignDeviceFromZabbix } from '../../api/client'
import { useTheme } from '../../lib/theme'

interface UnassignedHostsDrawerProps {
  isOpen: boolean
  onClose: () => void
  racks: RackSummary[]
  onDeviceAssigned?: () => void
}

export function UnassignedHostsDrawer({
  isOpen,
  onClose,
  racks,
  onDeviceAssigned,
}: UnassignedHostsDrawerProps) {
  const { isTeslaDark } = useTheme()
  const [hosts, setHosts] = useState<UnassignedHost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  // Slotting state
  const [slottingHost, setSlottingHost] = useState<UnassignedHost | null>(null)
  const [selectedRackId, setSelectedRackId] = useState<number>(racks[0]?.id || 1)
  const [startU, setStartU] = useState<number>(1)
  const [heightU, setHeightU] = useState<number>(1)
  const [face, setFace] = useState<'Front' | 'Rear'>('Front')
  const [deviceStatus, setDeviceStatus] = useState<'Active' | 'Planned' | 'Maintenance'>('Active')
  const [assigning, setAssigning] = useState(false)
  const [slotError, setSlotError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadUnassigned = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchUnassignedHosts()
      setHosts(data.hosts)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch unassigned hosts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadUnassigned()
      setSlottingHost(null)
      setSlotError(null)
      setSuccessMsg(null)
      if (racks.length > 0 && !selectedRackId) {
        setSelectedRackId(racks[0].id)
      }
    }
  }, [isOpen])

  // Set default height when opening slotting form
  const handleOpenSlotForm = (host: UnassignedHost) => {
    setSlottingHost(host)
    setSlotError(null)
    setSuccessMsg(null)
    setStartU(1)
    if (host.inferred_type === 'Storage') {
      setHeightU(2)
    } else if (host.inferred_type === 'UPS') {
      setHeightU(2)
    } else {
      setHeightU(1)
    }
    if (racks.length > 0 && !selectedRackId) {
      setSelectedRackId(racks[0].id)
    }
  }

  const handleConfirmSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slottingHost) return

    setAssigning(true)
    setSlotError(null)

    const payload: DeviceAssignFromZabbix = {
      zabbix_host_id: slottingHost.hostid,
      name: slottingHost.name,
      rack_id: selectedRackId,
      start_u: Number(startU),
      height_u: Number(heightU),
      position_face: face,
      device_type: slottingHost.inferred_type,
      model: slottingHost.device_model || `${slottingHost.inferred_type} 1U`,
      ip_address: slottingHost.ip || undefined,
      status: deviceStatus,
    }

    try {
      await assignDeviceFromZabbix(payload)
      setSuccessMsg(`Mounted "${slottingHost.name}" to Slot U${startU}!`)
      // Remove from local list
      setHosts((prev) => prev.filter((h) => h.hostid !== slottingHost.hostid))
      setSlottingHost(null)
      if (onDeviceAssigned) {
        onDeviceAssigned()
      }
      setTimeout(() => {
        setSuccessMsg(null)
      }, 4000)
    } catch (err: any) {
      setSlotError(err.message || 'Slot collision or assignment error')
    } finally {
      setAssigning(false)
    }
  }

  const filteredHosts = useMemo(() => {
    return hosts.filter((h) => {
      if (selectedType !== 'all' && h.inferred_type !== selectedType) {
        return false
      }
      if (!search) return true
      const q = search.toLowerCase()
      return (
        h.name.toLowerCase().includes(q) ||
        h.technical_name.toLowerCase().includes(q) ||
        h.ip.includes(q)
      )
    })
  }, [hosts, selectedType, search])

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: hosts.length }
    hosts.forEach((h) => {
      counts[h.inferred_type] = (counts[h.inferred_type] || 0) + 1
    })
    return counts
  }, [hosts])

  if (!isOpen) return null

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Switch':
        return <Network className="w-3.5 h-3.5 text-[#5856d6]" />
      case 'Firewall':
        return <Shield className="w-3.5 h-3.5 text-[#ff3b30]" />
      case 'Storage':
        return <HardDrive className="w-3.5 h-3.5 text-[#ff9500]" />
      case 'UPS':
        return <Zap className="w-3.5 h-3.5 text-[#34c759]" />
      case 'Server':
      default:
        return <Server className="w-3.5 h-3.5 text-[#0071E3]" />
    }
  }

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Switch':
        return 'bg-[#5856d6]/15 border-[#5856d6]/30 text-[#5856d6]'
      case 'Firewall':
        return 'bg-[#ff3b30]/15 border-[#ff3b30]/30 text-[#ff3b30]'
      case 'Storage':
        return 'bg-[#ff9500]/15 border-[#ff9500]/30 text-[#ff9500]'
      case 'UPS':
        return 'bg-[#34c759]/15 border-[#34c759]/30 text-[#34c759]'
      case 'Server':
      default:
        return 'bg-[#0071E3]/15 border-[#0071E3]/30 text-[#0071E3]'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs select-none font-sans">
      {/* Click outside backdrop to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className={`w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 transition-all ${
        isTeslaDark
          ? 'bg-[#0A0A0A] border-l border-[#1F1F1F] text-[#F5F5F7]'
          : 'bg-white/95 backdrop-blur-3xl border-l border-black/10 text-[#1d1d1f]'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
          isTeslaDark
            ? 'border-[#1F1F1F] bg-[#111111]'
            : 'border-black/10 bg-black/[0.02]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${
              isTeslaDark
                ? 'bg-[#3E6AE1]/20 border border-[#3E6AE1]/40 text-[#3E6AE1]'
                : 'bg-[#0071E3]/15 border border-[#0071E3]/30 text-[#0071E3]'
            }`}>
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-semibold tracking-[-0.015em] ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  Zabbix Ingestion Queue
                </h3>
                <span className={`px-2 py-0.5 rounded-[6px] border text-[10px] font-semibold ${
                  isTeslaDark
                    ? 'bg-[#3E6AE1]/20 border-[#3E6AE1]/40 text-[#3E6AE1]'
                    : 'bg-[#0071E3]/15 border border-[#0071E3]/30 text-[#0071E3]'
                }`}>
                  {hosts.length} UNASSIGNED
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Discovered in Zabbix 7.0 • Ready for 1-Click Rack Elevation Slotting
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadUnassigned}
              disabled={loading}
              title="Refresh unassigned hosts"
              className={`p-2 rounded-[8px] border transition-colors cursor-pointer disabled:opacity-50 ${
                isTeslaDark
                  ? 'bg-[#1C1C1E] hover:bg-[#252528] border-[#2A2A2A] text-zinc-300 hover:text-white'
                  : 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-600 hover:text-black'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#3E6AE1]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-[8px] border transition-colors cursor-pointer ${
                isTeslaDark
                  ? 'bg-[#1C1C1E] hover:bg-[#252528] border-[#2A2A2A] text-zinc-300 hover:text-white'
                  : 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-600 hover:text-black'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Success / Info Toast */}
        {successMsg && (
          <div className="px-5 py-2.5 bg-[#34c759]/15 border-b border-[#34c759]/30 flex items-center gap-2 text-xs text-[#34c759] font-medium animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className={`p-4 border-b space-y-3 shrink-0 ${
          isTeslaDark
            ? 'border-[#1F1F1F] bg-[#111111]/50'
            : 'border-black/10 bg-black/[0.01]'
        }`}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search unassigned hosts by name or IP..."
              className={`w-full rounded-[10px] pl-9 pr-3 py-2 text-xs transition-all focus:outline-none ${
                isTeslaDark
                  ? 'bg-[#161616] border border-[#2A2A2A] text-[#F5F5F7] placeholder:text-zinc-500 focus:border-[#3E6AE1]'
                  : 'bg-black/[0.04] border border-black/10 text-[#1d1d1f] placeholder:text-zinc-400 focus:border-[#0071E3] focus:bg-white'
              }`}
            />
          </div>

          {/* Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['all', 'Server', 'Switch', 'Firewall', 'Storage', 'UPS'].map((t) => {
              const count = typeCounts[t] || 0
              const active = selectedType === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-3 py-1.5 rounded-[8px] border transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 text-xs ${
                    active
                      ? isTeslaDark
                        ? 'bg-[#3E6AE1] border-[#3E6AE1] text-white shadow-xs font-semibold'
                        : 'bg-[#0071E3] border-[#0071E3] text-white shadow-xs font-semibold'
                      : isTeslaDark
                        ? 'bg-[#161616] border-[#2A2A2A] text-zinc-300 hover:text-white'
                        : 'bg-black/[0.04] border-black/10 text-zinc-600 hover:text-[#1d1d1f]'
                  }`}
                >
                  <span>{t === 'all' ? 'All Types' : t}</span>
                  <span className="text-[10px] opacity-80">({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Slotting Panel (Appears when user clicks "Slot into Rack") */}
        {slottingHost && (
          <div className={`p-4 border-b shadow-inner shrink-0 ${
            isTeslaDark
              ? 'border-[#1F1F1F] bg-[#141414]'
              : 'border-black/10 bg-black/[0.03]'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b mb-3 ${isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold uppercase ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`}>
                  Slotting Host: {slottingHost.name}
                </span>
                <span className={`px-2 py-0.5 rounded-[6px] border text-[10px] font-semibold ${getTypeBadgeClass(slottingHost.inferred_type)}`}>
                  {slottingHost.inferred_type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSlottingHost(null)}
                className={`text-xs font-medium cursor-pointer ${isTeslaDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black'}`}
              >
                Cancel
              </button>
            </div>

            {slotError && (
              <div className="mb-3 p-2.5 rounded-[8px] bg-[#ff3b30]/15 border border-[#ff3b30]/30 flex items-center gap-2 text-xs text-[#ff3b30]">
                <AlertTriangle className="w-4 h-4 text-[#ff3b30] shrink-0" />
                <span>{slotError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmSlot} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`block font-medium mb-1 ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Target Rack *</label>
                  <select
                    value={selectedRackId}
                    onChange={(e) => setSelectedRackId(Number(e.target.value))}
                    className={`w-full rounded-[8px] px-3 py-1.5 focus:outline-none cursor-pointer ${
                      isTeslaDark
                        ? 'bg-[#1E1E1E] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                        : 'bg-white border border-black/10 text-[#1d1d1f] focus:border-[#0071E3]'
                    }`}
                  >
                    {racks.map((r) => (
                      <option key={r.id} value={r.id} className={isTeslaDark ? 'bg-[#1E1E1E] text-[#F5F5F7]' : 'bg-white text-[#1d1d1f]'}>
                        {r.name} ({r.used_u}/{r.total_u}U • {r.usage_percent}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block font-medium mb-1 ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Status</label>
                  <select
                    value={deviceStatus}
                    onChange={(e) => setDeviceStatus(e.target.value as any)}
                    className={`w-full rounded-[8px] px-3 py-1.5 focus:outline-none cursor-pointer ${
                      isTeslaDark
                        ? 'bg-[#1E1E1E] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                        : 'bg-white border border-black/10 text-[#1d1d1f] focus:border-[#0071E3]'
                    }`}
                  >
                    <option value="Active" className={isTeslaDark ? 'bg-[#1E1E1E] text-[#F5F5F7]' : 'bg-white text-[#1d1d1f]'}>Active</option>
                    <option value="Planned" className={isTeslaDark ? 'bg-[#1E1E1E] text-[#F5F5F7]' : 'bg-white text-[#1d1d1f]'}>Planned</option>
                    <option value="Maintenance" className={isTeslaDark ? 'bg-[#1E1E1E] text-[#F5F5F7]' : 'bg-white text-[#1d1d1f]'}>Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className={`block font-medium mb-1 ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Start U (1-42) *</label>
                  <input
                    type="number"
                    min="1"
                    max="42"
                    required
                    value={startU}
                    onChange={(e) => setStartU(Number(e.target.value))}
                    className={`w-full rounded-[8px] px-3 py-1.5 focus:outline-none ${
                      isTeslaDark
                        ? 'bg-[#1E1E1E] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                        : 'bg-white border border-black/10 text-[#1d1d1f] focus:border-[#0071E3]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-medium mb-1 ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Height (U) *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={heightU}
                    onChange={(e) => setHeightU(Number(e.target.value))}
                    className={`w-full rounded-[8px] px-3 py-1.5 focus:outline-none ${
                      isTeslaDark
                        ? 'bg-[#1E1E1E] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                        : 'bg-white border border-black/10 text-[#1d1d1f] focus:border-[#0071E3]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-medium mb-1 ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Mount Face</label>
                  <select
                    value={face}
                    onChange={(e) => setFace(e.target.value as any)}
                    className={`w-full rounded-[8px] px-3 py-1.5 focus:outline-none cursor-pointer ${
                      isTeslaDark
                        ? 'bg-[#1E1E1E] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                        : 'bg-white border border-black/10 text-[#1d1d1f] focus:border-[#0071E3]'
                    }`}
                  >
                    <option value="Front" className={isTeslaDark ? 'bg-[#1E1E1E] text-[#F5F5F7]' : 'bg-white text-[#1d1d1f]'}>Front</option>
                    <option value="Rear" className={isTeslaDark ? 'bg-[#1E1E1E] text-[#F5F5F7]' : 'bg-white text-[#1d1d1f]'}>Rear</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSlottingHost(null)}
                  className={`px-3 py-1.5 rounded-[8px] transition-colors cursor-pointer ${
                    isTeslaDark
                      ? 'bg-[#1C1C1E] hover:bg-[#252528] text-zinc-300 hover:text-white'
                      : 'bg-black/[0.05] hover:bg-black/[0.09] text-zinc-600 hover:text-black'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className={`px-3.5 py-1.5 rounded-[8px] text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs ${
                    isTeslaDark
                      ? 'bg-[#3E6AE1] hover:bg-[#345cc4]'
                      : 'bg-[#0071E3] hover:bg-[#0077ED]'
                  }`}
                >
                  {assigning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Slotting...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Confirm Slotting</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Hosts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading && hosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs space-y-2">
              <RefreshCw className={`w-6 h-6 animate-spin ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
              <span>Querying live Zabbix API &amp; CMDB state...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-[12px] bg-[#ff3b30]/15 border border-[#ff3b30]/30 text-[#ff3b30] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#ff3b30] shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredHosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-xs space-y-2 text-center">
              <CheckCircle2 className={`w-8 h-8 opacity-75 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
              <span className={`font-semibold text-sm ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>All Zabbix hosts are allocated!</span>
              <span className="text-xs text-zinc-500">No unassigned hosts match your current filter.</span>
            </div>
          ) : (
            filteredHosts.map((host) => {
              const isSelected = slottingHost?.hostid === host.hostid
              return (
                <div
                  key={host.hostid}
                  className={`p-3.5 rounded-[12px] border transition-all ${
                    isSelected
                      ? isTeslaDark
                        ? 'bg-[#3E6AE1]/20 border-[#3E6AE1]/50 shadow-sm'
                        : 'bg-[#0071E3]/10 border-[#0071E3]/40 shadow-sm'
                      : isTeslaDark
                        ? 'bg-[#141414] border-[#1F1F1F] hover:border-[#2F2F2F]'
                        : 'bg-white/80 border-black/10 hover:border-black/20 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold text-xs tracking-tight truncate ${isTeslaDark ? 'text-[#F5F5F7]' : 'text-[#1d1d1f]'}`}>
                          {host.name}
                        </span>
                        <span className={`px-2 py-0.5 rounded-[6px] border text-[10px] font-medium flex items-center gap-1 ${getTypeBadgeClass(host.inferred_type)}`}>
                          {getTypeIcon(host.inferred_type)}
                          <span>{host.inferred_type}</span>
                        </span>
                        {host.device_model && (
                          <span className={`px-2 py-0.5 rounded-[6px] border text-[10px] ${
                            isTeslaDark
                              ? 'bg-white/5 border-white/10 text-zinc-400'
                              : 'bg-black/[0.04] border-black/10 text-zinc-600'
                          }`}>
                            {host.device_model}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>IP: <strong className={`font-medium ${isTeslaDark ? 'text-zinc-200' : 'text-[#1d1d1f]'}`}>{host.ip || '0.0.0.0'}</strong></span>
                        {host.port && <span>Port: {host.port}</span>}
                        <span>Zabbix ID: {host.hostid}</span>
                      </div>

                      {host.technical_name && host.technical_name !== host.name && (
                        <div className="text-[11px] text-zinc-500 truncate">
                          SysName: {host.technical_name}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={host.zabbix_web_links?.latest_data_url || `http://192.168.1.85:8080/zabbix.php?action=latest.view&filter_hostids%5B%5D=${host.hostid}&filter_set=1`}
                        target="_blank"
                        rel="noreferrer"
                        className={`p-2 rounded-[8px] border transition-colors cursor-pointer ${
                          isTeslaDark
                            ? 'bg-[#1C1C1E] hover:bg-[#252528] border-[#2A2A2A] text-zinc-400 hover:text-white'
                            : 'bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-600 hover:text-black'
                        }`}
                        title="View Host in Zabbix 7.0 Web Console"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleOpenSlotForm(host)}
                        className={`px-3 py-1.5 rounded-[8px] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                          isTeslaDark
                            ? 'bg-[#3E6AE1] hover:bg-[#345cc4]'
                            : 'bg-[#0071E3] hover:bg-[#0077ED]'
                        }`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Slot</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs text-zinc-500 shrink-0 ${
          isTeslaDark
            ? 'border-[#1F1F1F] bg-[#111111]'
            : 'border-black/10 bg-black/[0.02]'
        }`}>
          <span>
            Showing <strong className={isTeslaDark ? 'text-zinc-200' : 'text-[#1d1d1f]'}>{filteredHosts.length}</strong> of {hosts.length} unassigned hosts
          </span>
          <span className="text-[11px] text-zinc-500">
            FastAPI Ingestion Engine • Redis Cached
          </span>
        </div>
      </div>
    </div>
  )
}
