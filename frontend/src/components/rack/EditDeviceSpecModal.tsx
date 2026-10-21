import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Cpu,
  Sparkles,
  AlertCircle,
  Save,
  Info,
} from 'lucide-react'
import type { Device, DeviceTemplate, DeviceSpecUpdate } from '../../types'
import { fetchDeviceTemplates, updateDeviceSpec } from '../../api/client'

interface EditDeviceSpecModalProps {
  device: Device | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedDevice: Device) => void
}

const DEVICE_TYPES = [
  'Server',
  'Switch',
  'Firewall',
  'Storage',
  'UPS',
  'Patch Panel',
  'Blank Panel',
] as const

const STATUS_OPTIONS = ['Active', 'Planned', 'Maintenance', 'Offline'] as const

export function EditDeviceSpecModal({
  device,
  isOpen,
  onClose,
  onSuccess,
}: EditDeviceSpecModalProps) {
  const [name, setName] = useState('')
  const [deviceType, setDeviceType] = useState('Server')
  const [model, setModel] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [status, setStatus] = useState<'Active' | 'Planned' | 'Maintenance' | 'Offline'>('Active')

  const [templates, setTemplates] = useState<DeviceTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom')
  const [isCustomModel, setIsCustomModel] = useState<boolean>(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form whenever modal opens with current device
  useEffect(() => {
    if (isOpen && device) {
      setError(null)
      setName(device.name || '')
      setDeviceType(device.device_type || 'Server')
      setModel(device.model || '')
      setManufacturer(device.manufacturer || '')
      setSerialNumber(device.serial_number || '')
      setStatus(device.status || 'Active')

      fetchDeviceTemplates()
        .then((tmpls) => {
          setTemplates(tmpls)
          // Attempt to match current device to an existing template
          const matched = tmpls.find(
            (t) =>
              t.model?.toLowerCase() === device.model?.toLowerCase() ||
              (t.manufacturer?.toLowerCase() === device.manufacturer?.toLowerCase() &&
                device.model?.toLowerCase().includes(t.model?.toLowerCase()))
          )

          if (matched) {
            setSelectedTemplateId(matched.id)
            setIsCustomModel(false)
          } else {
            setSelectedTemplateId('custom')
            setIsCustomModel(true)
          }
        })
        .catch(() => {})
    }
  }, [isOpen, device])

  // Group templates by brand
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

  const selectedTemplate = useMemo(() => {
    if (isCustomModel) return null
    return templates.find((t) => t.id === selectedTemplateId)
  }, [templates, selectedTemplateId, isCustomModel])

  if (!isOpen || !device) return null

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
      // Note: We deliberately do NOT change device.height_u to preserve rack slot allocation!
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload: DeviceSpecUpdate = {
        name: name.trim(),
        device_type: deviceType,
        model: model.trim() || undefined,
        manufacturer: manufacturer.trim() || undefined,
        serial_number: serialNumber.trim() || undefined,
        status,
        custom_fields: {
          ...(device.custom_fields || {}),
          brand: manufacturer.trim() || undefined,
          vendor: manufacturer.trim() || undefined,
        },
      }

      const updated = await updateDeviceSpec(device.id, payload)
      onSuccess(updated)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update device spec')
    } finally {
      setLoading(false)
    }
  }

  // Visual brand accents for preview
  const previewBrand = manufacturer || device.manufacturer || 'ENTERPRISE'
  const previewModel = model || device.model || 'Standard Chassis'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg noc-panel shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Ribbon */}
        <div className="noc-panel-header shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#8bd7d1]" />
            <span className="font-mono uppercase tracking-wider text-xs text-white">
              Edit Hardware Spec & Brand
            </span>
            <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] font-mono text-[#8bd7d1]">
              Slot U{device.start_u} ({device.height_u}U)
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

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-3.5">
          {/* Error Banner */}
          {error && (
            <div className="p-2.5 rounded-[2px] bg-rose-950/40 border border-rose-800 flex items-center gap-2 text-xs font-mono text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Read-Only Slot & Telemetry Info Banner */}
          <div className="p-2.5 rounded-[2px] bg-[#1a2329] border border-[#394650] flex items-center justify-between text-xs font-mono">
            <div className="space-y-0.5">
              <span className="text-[10px] text-[#85a6b1] uppercase tracking-wider block">
                Physical Slot Location
              </span>
              <span className="text-white font-bold">
                U{device.start_u} - U{device.start_u + device.height_u - 1} ({device.height_u}U Rack Unit)
              </span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[10px] text-[#85a6b1] uppercase tracking-wider block">
                Management IP
              </span>
              <span className="text-[#8bd7d1] font-bold">
                {device.ip_address || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Height Preservation Guarantee Notice */}
          <div className="p-2 rounded-[2px] bg-[#142e2b]/60 border border-[#2b5d58]/80 flex items-center gap-2 text-[11px] font-mono text-[#8bd7d1]">
            <Info className="w-3.5 h-3.5 shrink-0 text-[#8bd7d1]" />
            <span>
              Height allocation remains locked at <strong>{device.height_u}U</strong> to protect against slot collisions.
            </span>
          </div>

          <form id="edit-spec-form" onSubmit={handleSubmit} className="space-y-3 text-xs font-mono">
            {/* 1-Click Hardware Model Preset Catalog Picker */}
            <div className="p-2.5 rounded-[2px] bg-[#1e272f] border border-[#394650] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[#caedde] flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-[#8bd7d1]" />
                  <span>Hardware Template Catalog</span>
                  <span className="text-[10px] text-[#8bd7d1] font-normal">
                    (Auto-fill Specs)
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
                  className="text-[10px] text-[#8bd7d1] hover:underline cursor-pointer font-medium"
                >
                  {isCustomModel ? '← Pick from Catalog' : '✏️ Custom Brand/Model'}
                </button>
              </div>

              {!isCustomModel ? (
                <div className="space-y-1.5">
                  <div className="relative">
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1] cursor-pointer appearance-none font-mono text-xs"
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
                      <optgroup label="━━━ Manual Input ━━━" className="bg-[#161c20] text-[#85a6b1]">
                        <option value="custom" className="bg-[#273139] text-[#caedde]">
                          ✏️ Enter Custom Model / Manual Entry...
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  {selectedTemplate?.description && (
                    <p className="text-[10px] text-[#85a6b1] italic">
                      {selectedTemplate.description}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-2 rounded-[2px] bg-[#273139] border border-[#394650] text-[11px] text-[#caedde]">
                  Manual entry mode active. Customize brand and model directly below.
                </div>
              )}
            </div>

            {/* Live Spec Preview Pill */}
            <div className="p-2.5 rounded-[2px] bg-[#161c20] border border-[#394650] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#8bd7d1]" />
                <div>
                  <div className="text-white font-bold text-xs">
                    {previewModel}
                  </div>
                  <div className="text-[10px] text-[#85a6b1]">
                    {previewBrand} • {deviceType}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-[2px] bg-[#273139] border border-[#50626f] text-[10px] text-[#8bd7d1] font-bold">
                {status}
              </span>
            </div>

            {/* Editable Fields Grid */}
            <div className="space-y-2.5">
              {/* Equipment Name */}
              <div>
                <label className="block text-[#caedde] mb-1 font-medium">
                  Equipment Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SRV-APP-05"
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                  />
                </div>
              </div>

              {/* Manufacturer / Brand & Model */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#caedde] mb-1 font-medium">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. Dell EMC, Cisco, HPE"
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                  />
                </div>
                <div>
                  <label className="block text-[#caedde] mb-1 font-medium">
                    Chassis Model
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. PowerEdge R750"
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                  />
                </div>
              </div>

              {/* Device Type & Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#caedde] mb-1 font-medium">
                    Device Type
                  </label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1] cursor-pointer"
                  >
                    {DEVICE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#caedde] mb-1 font-medium">
                    Operational Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-[#8bd7d1] cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Serial Number / Asset Tag */}
              <div>
                <label className="block text-[#caedde] mb-1 font-medium">
                  Serial Number / Asset Tag
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. 7XG8192-TH"
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-3 bg-[#1e262c] border-t border-[#394650] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 rounded-[2px] border border-[#50626f] text-[#caedde] hover:bg-[#34424b] text-xs font-mono transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-spec-form"
            disabled={loading}
            className="px-4 py-1.5 rounded-[2px] bg-[#8bd7d1] hover:bg-[#caedde] text-[#161c20] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#161c20] border-t-transparent rounded-full animate-spin" />
                <span>Saving Spec...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Hardware Spec</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
