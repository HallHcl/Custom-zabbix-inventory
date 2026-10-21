import { useState, useEffect, useMemo } from 'react'
import { X, Server, AlertCircle, CheckCircle2, Cpu, ChevronDown, Sparkles } from 'lucide-react'
import type { ZabbixHostOption, DeviceTemplate } from '../../types'
import { fetchZabbixHosts, fetchDeviceTemplates, mountDevice } from '../../api/client'

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
  const [model, setModel] = useState('PowerEdge R750')
  const [manufacturer, setManufacturer] = useState('Dell EMC')
  const [startU, setStartU] = useState(initialStartU)
  const [heightU, setHeightU] = useState(2)
  const [ipAddress, setIpAddress] = useState('')
  const [zabbixHostId, setZabbixHostId] = useState('')

  const [templates, setTemplates] = useState<DeviceTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('dell-poweredge-r750')
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false)

  const [zabbixHosts, setZabbixHosts] = useState<ZabbixHostOption[]>([])
  const [searchHostQuery, setSearchHostQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStartU(initialStartU)
  }, [initialStartU])

  // Fetch templates and Zabbix hosts when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      fetchZabbixHosts().then((data) => setZabbixHosts(data)).catch(() => {})
      fetchDeviceTemplates()
        .then((tmpls) => {
          setTemplates(tmpls)
          // Default to Dell R750 on initial open if not already set
          if (tmpls.length > 0) {
            const defaultTmpl = tmpls.find((t) => t.id === 'dell-poweredge-r750') || tmpls[0]
            setSelectedTemplateId(defaultTmpl.id)
            setModel(defaultTmpl.model)
            setManufacturer(defaultTmpl.manufacturer)
            setDeviceType(defaultTmpl.device_type)
            setHeightU(defaultTmpl.height_u)
            setIsCustomModel(false)
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  // Group templates by brand in logical datacenter order
  const brandGroups = useMemo(() => {
    const map = new Map<string, DeviceTemplate[]>()
    templates.forEach((t) => {
      const list = map.get(t.brand) || []
      list.push(t)
      map.set(t.brand, list)
    })

    const preferredOrder = [
      'Dell',
      'HPE',
      'Cisco',
      'Huawei',
      'Fortinet',
      'Palo Alto',
      'Supermicro',
      'APC',
      'Generic',
    ]

    const groups: { brand: string; items: DeviceTemplate[] }[] = []
    preferredOrder.forEach((b) => {
      if (map.has(b)) {
        groups.push({ brand: b, items: map.get(b)! })
        map.delete(b)
      }
    })

    map.forEach((items, brand) => {
      groups.push({ brand, items })
    })

    return groups
  }, [templates])

  const currentTemplate = useMemo(() => {
    if (isCustomModel) return null
    return templates.find((t) => t.id === selectedTemplateId)
  }, [templates, selectedTemplateId, isCustomModel])

  if (!isOpen) return null

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (templateId === 'custom') {
      setIsCustomModel(true)
      return
    }
    setIsCustomModel(false)
    const tmpl = templates.find((t) => t.id === templateId)
    if (tmpl) {
      setModel(tmpl.model)
      setManufacturer(tmpl.manufacturer)
      setDeviceType(tmpl.device_type)
      setHeightU(tmpl.height_u)
    }
  }

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
            {/* Equipment Name */}
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

            {/* Hardware Model Preset Catalog Picker */}
            <div className="p-2.5 rounded-[2px] bg-[#1a2329] border border-[#394650] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[#caedde] flex items-center gap-1.5 font-bold">
                  <Cpu className="w-3.5 h-3.5 text-[#8bd7d1]" />
                  <span>Hardware Model Catalog / Preset</span>
                  <span className="text-[10px] text-[#8bd7d1] font-normal flex items-center gap-0.5">
                    <Sparkles className="w-3 h-3" /> 1-Click Auto-fill
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextCustom = !isCustomModel
                    setIsCustomModel(nextCustom)
                    if (nextCustom) setSelectedTemplateId('custom')
                    else if (templates.length > 0) handleSelectTemplate(templates[0].id)
                  }}
                  className="text-[10px] text-[#8bd7d1] hover:underline cursor-pointer"
                >
                  {isCustomModel ? '← Select Preset' : '✏️ Custom Model'}
                </button>
              </div>

              {!isCustomModel ? (
                <div className="space-y-2">
                  <div className="relative">
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1] cursor-pointer appearance-none pr-8 font-mono text-xs"
                    >
                      {brandGroups.map((group) => (
                        <optgroup
                          key={group.brand}
                          label={`━━━ ${group.brand} ━━━`}
                          className="bg-[#161c20] text-[#8bd7d1] font-bold"
                        >
                          {group.items.map((item) => (
                            <option
                              key={item.id}
                              value={item.id}
                              className="bg-[#273139] text-white"
                            >
                              {item.model} — {item.height_u}U {item.device_type} ({item.manufacturer})
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <optgroup label="━━━ Custom ━━━" className="bg-[#161c20] text-[#85a6b1]">
                        <option value="custom" className="bg-[#273139] text-[#caedde]">
                          ✏️ Enter Custom Model / Manual Entry...
                        </option>
                      </optgroup>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#85a6b1]">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Template Signature Badge & Spec Preview */}
                  {currentTemplate && (
                    <div
                      className="px-2.5 py-1.5 rounded-[2px] border flex items-center justify-between text-[11px] transition-all"
                      style={{
                        backgroundColor: currentTemplate.brand_info?.bg_color || '#161c20',
                        borderColor: currentTemplate.brand_info?.color || '#394650',
                      }}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase shrink-0"
                          style={{
                            backgroundColor: currentTemplate.brand_info?.color || '#8bd7d1',
                            color: '#000',
                          }}
                        >
                          {currentTemplate.brand_info?.tag || currentTemplate.brand}
                        </span>
                        <span className="text-white font-bold truncate">{currentTemplate.model}</span>
                        <span className="text-[#85a6b1] text-[10px] hidden sm:inline truncate">
                          {currentTemplate.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[9px] text-[#caedde] font-mono">
                          {currentTemplate.height_u}U
                        </span>
                        <span className="px-1.5 py-0.5 bg-black/40 border border-white/10 rounded text-[9px] text-[#8bd7d1] font-mono">
                          {currentTemplate.device_type}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2 rounded-[2px] bg-[#161c20] border border-dashed border-[#50626f] text-[11px] text-[#caedde] flex items-center justify-between">
                  <span>✏️ Manual entry mode: customize Model and Vendor in the fields below.</span>
                  <button
                    type="button"
                    onClick={() => handleSelectTemplate(templates[0]?.id || 'dell-poweredge-r750')}
                    className="text-[10px] text-[#8bd7d1] hover:underline cursor-pointer shrink-0 ml-2"
                  >
                    Select from Catalog
                  </button>
                </div>
              )}
            </div>

            {/* Model & Manufacturer Details */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[#caedde] mb-1">
                  Model / Chassis {!isCustomModel && <span className="text-[#8bd7d1] text-[10px]">(Auto-filled)</span>}
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value)
                    const match = templates.find((t) => t.model.toLowerCase() === e.target.value.toLowerCase())
                    if (match) {
                      setSelectedTemplateId(match.id)
                      setManufacturer(match.manufacturer)
                      setDeviceType(match.device_type)
                      setHeightU(match.height_u)
                      setIsCustomModel(false)
                    } else {
                      setSelectedTemplateId('custom')
                      setIsCustomModel(true)
                    }
                  }}
                  placeholder="e.g. PowerEdge R750"
                  className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                />
              </div>
              <div>
                <label className="block text-[#caedde] mb-1">
                  Vendor / OEM {!isCustomModel && <span className="text-[#8bd7d1] text-[10px]">(Auto-filled)</span>}
                </label>
                <input
                  type="text"
                  required
                  value={manufacturer}
                  onChange={(e) => {
                    setManufacturer(e.target.value)
                    setIsCustomModel(true)
                  }}
                  placeholder="e.g. Dell EMC"
                  className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                />
              </div>
            </div>

            {/* Hardware Category & Form Factor Height (U) */}
            <div className="grid grid-cols-2 gap-2.5">
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

            {/* Start Position & Management IP */}
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
                <label className="block text-[#caedde] mb-1">Management IP Address</label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="e.g. 10.10.20.45"
                  className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 font-mono text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                />
              </div>
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
              <div className="max-h-24 overflow-y-auto space-y-1 rounded-[2px] border border-[#394650] bg-[#161c20] p-1">
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
