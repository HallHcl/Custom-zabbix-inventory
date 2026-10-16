import { useState, useEffect } from 'react'
import { X, Server, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ZabbixHostOption } from '../../types'
import { fetchZabbixHosts, mountDevice } from '../../api/client'

interface MountDeviceModalProps {
  rackId: number
  initialStartU: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function MountDeviceModal({
  rackId,
  initialStartU,
  isOpen,
  onClose,
  onSuccess,
}: MountDeviceModalProps) {
  const [name, setName] = useState('')
  const [deviceType, setDeviceType] = useState('Server')
  const [model, setModel] = useState('Dell PowerEdge R750')
  const [manufacturer, setManufacturer] = useState('Dell EMC')
  const [startU, setStartU] = useState(initialStartU)
  const [heightU, setHeightU] = useState(1)
  const [ipAddress, setIpAddress] = useState('')
  const [zabbixHostId, setZabbixHostId] = useState('')

  const [zabbixHosts, setZabbixHosts] = useState<ZabbixHostOption[]>([])
  const [searchHostQuery, setSearchHostQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStartU(initialStartU)
  }, [initialStartU])

  useEffect(() => {
    if (isOpen) {
      setError(null)
      fetchZabbixHosts().then((data) => setZabbixHosts(data))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSelectZabbixHost = (host: ZabbixHostOption) => {
    setZabbixHostId(host.hostid)
    if (!name) setName(host.name)
    if (host.ip && !ipAddress) setIpAddress(host.ip)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await mountDevice({
        rack_id: rackId,
        name: name || `DEV-U${startU}`,
        device_type: deviceType,
        model,
        manufacturer,
        start_u: Number(startU),
        height_u: Number(heightU),
        position_face: 'Front',
        ip_address: ipAddress || undefined,
        zabbix_host_id: zabbixHostId || undefined,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to mount device')
    } finally {
      setLoading(false)
    }
  }

  const filteredHosts = zabbixHosts.filter(
    (h) =>
      h.name.toLowerCase().includes(searchHostQuery.toLowerCase()) ||
      h.ip.includes(searchHostQuery)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0f0f0f] border border-[#222222] shadow-2xl relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Mount Device to Rack</h3>
            <p className="text-xs text-zinc-400">Positioning at Unit U{startU}</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Device Name & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">Device Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SRV-APP-05"
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">Device Type</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-400 transition-colors"
              >
                <option value="Server">Server</option>
                <option value="Switch">Switch</option>
                <option value="Firewall">Firewall</option>
                <option value="Storage">Storage</option>
                <option value="UPS">UPS</option>
                <option value="Patch Panel">Patch Panel</option>
                <option value="Blank Panel">Blank Panel</option>
              </select>
            </div>
          </div>

          {/* Model & Manufacturer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">Model</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. PowerEdge R750"
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">Manufacturer</label>
              <input
                type="text"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Dell EMC"
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
          </div>

          {/* Start U & Height U */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">Starting Position (U)</label>
              <input
                type="number"
                min="1"
                max="42"
                value={startU}
                onChange={(e) => setStartU(Number(e.target.value))}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">Unit Height (U)</label>
              <select
                value={heightU}
                onChange={(e) => setHeightU(Number(e.target.value))}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-zinc-400 transition-colors"
              >
                <option value={1}>1U</option>
                <option value={2}>2U</option>
                <option value={3}>3U</option>
                <option value={4}>4U</option>
              </select>
            </div>
          </div>

          {/* IP Address */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1.5">IP Address</label>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="e.g. 10.10.20.45"
              className="w-full bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors"
            />
          </div>

          {/* Link Zabbix Host Picker */}
          <div>
            <label className="block text-zinc-300 font-medium mb-1.5">
              Link to Zabbix Host (Optional)
            </label>
            <input
              type="text"
              value={searchHostQuery}
              onChange={(e) => setSearchHostQuery(e.target.value)}
              placeholder="Search live Zabbix hosts..."
              className="w-full bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-400 transition-colors mb-2"
            />
            {/* Scrollable Host Options */}
            <div className="max-h-32 overflow-y-auto space-y-1 rounded-xl border border-[#262626] bg-[#0c0c0c] p-1.5">
              {filteredHosts.length === 0 ? (
                <div className="text-zinc-500 py-2 text-center">No matching hosts found</div>
              ) : (
                filteredHosts.map((h) => {
                  const isSelected = zabbixHostId === h.hostid
                  return (
                    <div
                      key={h.hostid}
                      onClick={() => handleSelectZabbixHost(h)}
                      className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-zinc-800 text-white border border-zinc-600'
                          : 'text-zinc-300 hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs">{h.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{h.ip || 'No IP'}</div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Submit & Cancel */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#2e2e2e] text-zinc-300 hover:bg-[#1c1c1c] hover:text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold shadow-lg shadow-white/5 transition-all disabled:opacity-50"
            >
              {loading ? 'Mounting...' : 'Mount Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
