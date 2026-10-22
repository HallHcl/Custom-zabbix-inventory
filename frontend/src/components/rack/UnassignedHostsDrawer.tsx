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
        return <Network className="w-3.5 h-3.5 text-cyan-400" />
      case 'Firewall':
        return <Shield className="w-3.5 h-3.5 text-amber-400" />
      case 'Storage':
        return <HardDrive className="w-3.5 h-3.5 text-purple-400" />
      case 'UPS':
        return <Zap className="w-3.5 h-3.5 text-orange-400" />
      case 'Server':
      default:
        return <Server className="w-3.5 h-3.5 text-emerald-400" />
    }
  }

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Switch':
        return 'bg-cyan-950/70 border-cyan-700/80 text-cyan-300'
      case 'Firewall':
        return 'bg-amber-950/70 border-amber-700/80 text-amber-300'
      case 'Storage':
        return 'bg-purple-950/70 border-purple-700/80 text-purple-300'
      case 'UPS':
        return 'bg-orange-950/70 border-orange-700/80 text-orange-300'
      case 'Server':
      default:
        return 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs select-none">
      {/* Click outside backdrop to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-2xl bg-[#1a2127] border-l border-[#394650] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#394650] bg-[#20282f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[3px] bg-[#34424b] border border-[#50626f] flex items-center justify-center text-[#7aa5d2]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wider text-[#eeeeee] font-sans uppercase">
                  Zabbix Ingestion Queue
                </h3>
                <span className="px-1.5 py-0.2 rounded-[2px] bg-[#303841] border border-[#7aa5d2] text-[10px] font-mono text-[#7aa5d2] font-bold">
                  {hosts.length} UNASSIGNED
                </span>
              </div>
              <p className="text-[11px] text-[#85a6b1] font-mono">
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
              className="p-1.5 rounded-[3px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-[#85a6b1] hover:text-[#caedde] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#7aa5d2]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[3px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-[#85a6b1] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Success / Info Toast */}
        {successMsg && (
          <div className="px-5 py-2.5 bg-emerald-950/60 border-b border-emerald-700/80 flex items-center gap-2 text-xs font-mono text-emerald-300 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-[#394650] bg-[#1d252c] space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#85a6b1] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search unassigned hosts by name or IP..."
              className="w-full bg-[#273139] border border-[#394650] rounded-[3px] pl-9 pr-3 py-1.5 text-xs text-[#caedde] placeholder:text-[#85a6b1] focus:outline-none focus:border-[#7aa5d2] font-mono"
            />
          </div>

          {/* Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
            {['all', 'Server', 'Switch', 'Firewall', 'Storage', 'UPS'].map((t) => {
              const count = typeCounts[t] || 0
              const active = selectedType === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-2.5 py-1 rounded-[3px] border transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 text-[11px] ${
                    active
                      ? 'bg-[#34424b] border-[#7aa5d2] text-[#7aa5d2] font-semibold'
                      : 'bg-[#273139] border-[#394650] text-[#85a6b1] hover:text-[#caedde]'
                  }`}
                >
                  <span>{t === 'all' ? 'All Types' : t}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Slotting Panel (Appears when user clicks "Slot into Rack") */}
        {slottingHost && (
          <div className="p-4 border-b border-[#50626f] bg-[#222d36] shadow-inner shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-[#394650] mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#7aa5d2] font-mono uppercase">
                  Slotting Host: {slottingHost.name}
                </span>
                <span className={`px-1.5 py-0.2 rounded-[2px] border text-[9px] font-mono ${getTypeBadgeClass(slottingHost.inferred_type)}`}>
                  {slottingHost.inferred_type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSlottingHost(null)}
                className="text-[#85a6b1] hover:text-white text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {slotError && (
              <div className="mb-3 p-2 rounded-[2px] bg-rose-950/60 border border-rose-800 flex items-center gap-2 text-xs font-mono text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{slotError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmSlot} className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[#caedde] mb-1">Target Rack *</label>
                  <select
                    value={selectedRackId}
                    onChange={(e) => setSelectedRackId(Number(e.target.value))}
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1] cursor-pointer"
                  >
                    {racks.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.used_u}/{r.total_u}U • {r.usage_percent}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#caedde] mb-1">Status</label>
                  <select
                    value={deviceStatus}
                    onChange={(e) => setDeviceStatus(e.target.value as any)}
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1] cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Planned">Planned</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[#caedde] mb-1">Start U (1-42) *</label>
                  <input
                    type="number"
                    min="1"
                    max="42"
                    required
                    value={startU}
                    onChange={(e) => setStartU(Number(e.target.value))}
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1]"
                  />
                </div>
                <div>
                  <label className="block text-[#caedde] mb-1">Height (U) *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={heightU}
                    onChange={(e) => setHeightU(Number(e.target.value))}
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1]"
                  />
                </div>
                <div>
                  <label className="block text-[#caedde] mb-1">Mount Face</label>
                  <select
                    value={face}
                    onChange={(e) => setFace(e.target.value as any)}
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1] cursor-pointer"
                  >
                    <option value="Front">Front</option>
                    <option value="Rear">Rear</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSlottingHost(null)}
                  className="px-3 py-1.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] text-[#85a6b1] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-3 py-1.5 rounded-[2px] bg-[#34424b] hover:bg-[#435561] border border-[#7aa5d2] text-[#7aa5d2] hover:text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
            <div className="flex flex-col items-center justify-center py-16 text-[#85a6b1] font-mono text-xs space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#7aa5d2]" />
              <span>Querying live Zabbix API &amp; CMDB state...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-[3px] bg-rose-950/40 border border-rose-800 text-rose-300 font-mono text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : filteredHosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#85a6b1] font-mono text-xs space-y-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-[#7aa5d2] opacity-75" />
              <span className="text-[#eeeeee] font-medium">All Zabbix hosts are allocated!</span>
              <span className="text-[11px] text-[#85a6b1]">No unassigned hosts match your current filter.</span>
            </div>
          ) : (
            filteredHosts.map((host) => {
              const isSelected = slottingHost?.hostid === host.hostid
              return (
                <div
                  key={host.hostid}
                  className={`p-3 rounded-[3px] border transition-all ${
                    isSelected
                      ? 'bg-[#27333d] border-[#7aa5d2] shadow-md'
                      : 'bg-[#20282f] border-[#394650] hover:border-[#50626f]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#eeeeee] text-xs tracking-tight truncate">
                          {host.name}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded-[2px] border text-[9px] font-mono flex items-center gap-1 ${getTypeBadgeClass(host.inferred_type)}`}>
                          {getTypeIcon(host.inferred_type)}
                          <span>{host.inferred_type}</span>
                        </span>
                        {host.device_model && (
                          <span className="px-1.5 py-0.2 rounded-[2px] bg-[#273139] border border-[#394650] text-[9px] font-mono text-[#85a6b1]">
                            {host.device_model}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-mono text-[#85a6b1]">
                        <span>IP: <strong className="text-[#caedde] font-medium">{host.ip || '0.0.0.0'}</strong></span>
                        {host.port && <span>Port: {host.port}</span>}
                        <span>Zabbix ID: {host.hostid}</span>
                      </div>

                      {host.technical_name && host.technical_name !== host.name && (
                        <div className="text-[10px] font-mono text-[#85a6b1] truncate">
                          SysName: {host.technical_name}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={host.zabbix_web_links?.latest_data_url || `http://192.168.1.85:8080/zabbix.php?action=latest.view&filter_hostids%5B%5D=${host.hostid}&filter_set=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] hover:border-[#7aa5d2] text-[#85a6b1] hover:text-[#caedde] transition-colors cursor-pointer"
                        title="View Host in Zabbix 7.0 Web Console"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleOpenSlotForm(host)}
                        className="px-2.5 py-1.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] hover:border-[#7aa5d2] text-xs font-mono text-[#caedde] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-[#7aa5d2]" />
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
        <div className="px-5 py-3 border-t border-[#394650] bg-[#20282f] flex items-center justify-between text-[11px] font-mono text-[#85a6b1] shrink-0">
          <span>
            Showing <strong className="text-white">{filteredHosts.length}</strong> of {hosts.length} unassigned hosts
          </span>
          <span className="text-[10px] text-[#85a6b1]">
            FastAPI Ingestion Engine • Redis Cached
          </span>
        </div>
      </div>
    </div>
  )
}
