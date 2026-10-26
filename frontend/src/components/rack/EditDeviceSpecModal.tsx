/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

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

  const previewBrand = manufacturer || device.manufacturer || 'ENTERPRISE'
  const previewModel = model || device.model || 'Standard Chassis'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xl select-none font-sans">
      <div className="w-full max-w-lg rounded-[20px] bg-white/95 backdrop-blur-3xl saturate-180 border-[0.5px] border-black/15 shadow-[0_24px_64px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col max-h-[90vh] text-[#1d1d1f]">
        {/* Header Ribbon with Traffic Lights */}
        <div className="p-4 border-b border-black/10 bg-black/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
            </div>
            <div className="h-4 w-[1px] bg-black/10 mx-1" />
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#0071E3]" />
              <span className="text-sm font-semibold tracking-[-0.022em] text-[#1d1d1f]">
                Edit Hardware Spec &amp; Brand
              </span>
              <span className="px-2 py-0.5 rounded-[6px] bg-black/[0.05] text-[10px] font-semibold text-zinc-600">
                U{device.start_u} ({device.height_u}U)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-black p-1 rounded-[8px] hover:bg-black/[0.05] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-[12px] bg-[#ff453a]/15 border-[0.5px] border-[#ff453a]/30 flex items-center gap-2.5 text-xs text-[#ff453a]">
              <AlertCircle className="w-4 h-4 text-[#ff453a] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Slot Location Banner */}
          <div className="p-3.5 rounded-[14px] bg-black/[0.03] border-[0.5px] border-black/10 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">
                Physical Slot Location
              </span>
              <span className="text-[#1d1d1f] font-semibold">
                U{device.start_u} - U{device.start_u + device.height_u - 1} ({device.height_u}U Rack Unit)
              </span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">
                Management IP
              </span>
              <span className="text-[#0071E3] font-semibold">
                {device.ip_address || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Height Preservation Notice */}
          <div className="p-3 rounded-[12px] bg-[#0071E3]/10 border-[0.5px] border-[#0071E3]/25 flex items-center gap-2 text-xs text-[#0071E3]">
            <Info className="w-4 h-4 shrink-0 text-[#0071E3]" />
            <span>
              Height allocation remains locked at <strong>{device.height_u}U</strong> to protect against slot collisions.
            </span>
          </div>

          <form id="edit-spec-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Catalog Picker */}
            <div className="p-3.5 rounded-[14px] bg-black/[0.03] border-[0.5px] border-black/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-zinc-700 flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-4 h-4 text-[#0071E3]" />
                  <span>Hardware Template Catalog</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const nextCustom = !isCustomModel
                    setIsCustomModel(nextCustom)
                    if (nextCustom) setSelectedTemplateId('custom')
                    else if (templates.length > 0) handleSelectTemplate(templates[0].id)
                  }}
                  className="text-xs text-[#0071E3] hover:underline cursor-pointer font-medium"
                >
                  {isCustomModel ? '← Pick from Catalog' : '✏️ Custom Brand/Model'}
                </button>
              </div>

              {!isCustomModel ? (
                <div className="space-y-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full h-[40px] bg-white border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071E3] cursor-pointer"
                  >
                    {brandGroups.map((group) => (
                      <optgroup
                        key={group.brand}
                        label={`━━━ ${group.brand} ━━━`}
                        className="bg-white text-[#0071E3] font-semibold"
                      >
                        {group.items.map((item) => (
                          <option
                            key={item.id}
                            value={item.id}
                            className="bg-white text-[#1d1d1f]"
                          >
                            {item.model} — {item.height_u}U {item.device_type} ({item.manufacturer})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <optgroup label="━━━ Manual Input ━━━" className="bg-white text-zinc-500">
                      <option value="custom" className="bg-white text-zinc-700">
                        ✏️ Enter Custom Model / Manual Entry...
                      </option>
                    </optgroup>
                  </select>

                  {selectedTemplate?.description && (
                    <p className="text-[11px] text-zinc-500 italic">
                      {selectedTemplate.description}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-[10px] bg-black/[0.04] text-xs text-zinc-700">
                  Manual entry mode active. Customize brand and model directly below.
                </div>
              )}
            </div>

            {/* Live Spec Preview Pill */}
            <div className="p-3 rounded-[12px] bg-black/[0.03] border-[0.5px] border-black/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34c759]" />
                <div>
                  <div className="text-[#1d1d1f] font-semibold text-xs">
                    {previewModel}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {previewBrand} • {deviceType}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-[8px] bg-black/[0.06] text-xs text-[#34c759] font-semibold">
                {status}
              </span>
            </div>

            {/* Editable Fields Grid */}
            <div className="space-y-3">
              {/* Equipment Name */}
              <div>
                <label className="block text-zinc-700 mb-1 font-medium">
                  Equipment Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SRV-APP-05"
                  className="w-full h-[40px] bg-black/[0.03] border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071E3]"
                />
              </div>

              {/* Manufacturer / Brand & Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 mb-1 font-medium">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. Dell EMC, Cisco, HPE"
                    className="w-full h-[40px] bg-black/[0.03] border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 mb-1 font-medium">
                    Chassis Model
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. PowerEdge R750"
                    className="w-full h-[40px] bg-black/[0.03] border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071E3]"
                  />
                </div>
              </div>

              {/* Device Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 mb-1 font-medium">
                    Device Type
                  </label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className="w-full h-[40px] bg-white border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071E3] cursor-pointer"
                  >
                    {DEVICE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-700 mb-1 font-medium">
                    Operational Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-[40px] bg-white border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071E3] cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Serial Number */}
              <div>
                <label className="block text-zinc-700 mb-1 font-medium">
                  Serial Number / Asset Tag
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. 7XG8192-TH"
                  className="w-full h-[40px] bg-black/[0.03] border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071E3]"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-black/[0.02] border-t border-black/10 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="min-h-[44px] px-4 rounded-[12px] border-[0.5px] border-black/10 bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-spec-form"
            disabled={loading}
            className="min-h-[44px] px-5 rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving Spec...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Hardware Spec</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
