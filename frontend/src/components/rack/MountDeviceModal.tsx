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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg noc-panel shadow-2xl relative overflow-hidden">
        {/* Header Ribbon */}
        <div className="noc-panel-header">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#8bd7d1]" />
            <span className="font-mono uppercase tracking-wider text-xs text-white">
              Mount Hardware Unit (Slot U{startU})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#85a6b1] hover:text-white p-0.5 rounded-[2px] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {/* Error Alert */}
          {error && (
            <div className="mb-3 p-2 rounded-[2px] bg-rose-950/40 border border-rose-800 flex items-center gap-2 text-xs font-mono text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 text-xs font-mono">
            {/* Device Name & Type */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[#caedde] mb-1">Equipment Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SRV-APP-05"
                  className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                />
              </div>
              <div>
                <label className="block text-[#caedde] mb-1">Hardware Category</label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1]"
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
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[#caedde] mb-1">Model / Chassis</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. PowerEdge R750"
                  className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                />
              </div>
              <div>
                <label className="block text-[#caedde] mb-1">Vendor / OEM</label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Dell EMC"
                  className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                />
              </div>
            </div>

            {/* Start U & Height U */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[#caedde] mb-1">Start Position (U)</label>
                <input
                  type="number"
                  min="1"
                  max="42"
                  value={startU}
                  onChange={(e) => setStartU(Number(e.target.value))}
                  className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1]"
                />
              </div>
              <div>
                <label className="block text-[#caedde] mb-1">Form Factor Height (U)</label>
                <select
                  value={heightU}
                  onChange={(e) => setHeightU(Number(e.target.value))}
                  className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1]"
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
              <label className="block text-[#caedde] mb-1">Management IP Address</label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="e.g. 10.10.20.45"
                className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 font-mono text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
              />
            </div>

            {/* Link Zabbix Host Picker */}
            <div>
              <label className="block text-[#caedde] mb-1">
                Link to Zabbix 7.0 Host (Optional)
              </label>
              <input
                type="text"
                value={searchHostQuery}
                onChange={(e) => setSearchHostQuery(e.target.value)}
                placeholder="Search live hosts in Zabbix..."
                className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1] mb-1.5"
              />
              {/* Scrollable Host Options */}
              <div className="max-h-28 overflow-y-auto space-y-1 rounded-[2px] border border-[#394650] bg-[#161c20] p-1">
                {filteredHosts.length === 0 ? (
                  <div className="text-[#85a6b1] py-2 text-center text-[10px]">No matching hosts found in Zabbix</div>
                ) : (
                  filteredHosts.map((h) => {
                    const isSelected = zabbixHostId === h.hostid
                    return (
                      <div
                        key={h.hostid}
                        onClick={() => handleSelectZabbixHost(h)}
                        className={`p-1.5 rounded-[2px] flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#34424b] text-white border border-[#50626f]'
                            : 'text-[#85a6b1] hover:bg-[#273139]'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[11px]">{h.name}</div>
                          <div className="text-[9px] text-[#85a6b1] font-mono">{h.ip || 'No IP'}</div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#8bd7d1]" />}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Submit & Cancel */}
            <div className="flex gap-2 pt-2 border-t border-[#394650]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-1.5 rounded-[2px] border border-[#394650] bg-[#273139] text-[#caedde] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-1.5 rounded-[2px] bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] text-[#8bd7d1] font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Mounting...' : 'Confirm Mounting'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
