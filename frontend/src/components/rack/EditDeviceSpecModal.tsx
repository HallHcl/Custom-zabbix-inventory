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
import { useTheme } from '../../lib/theme'

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
  const { isTeslaDark } = useTheme()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xl select-none font-sans">
      <div className={`w-full max-w-lg rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300 ${
        isTeslaDark
          ? 'bg-[#0A0A0A] border border-[#1F1F1F] text-[#F5F5F7]'
          : 'bg-white/95 backdrop-blur-3xl saturate-180 border-[0.5px] border-black/15 text-[#1d1d1f]'
      }`}>
        {/* Header Ribbon with Traffic Lights */}
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          isTeslaDark
            ? 'border-[#1F1F1F] bg-[#111111]'
            : 'border-black/10 bg-black/[0.02]'
        }`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]" />
              <span className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
            </div>
            <div className={`h-4 w-[1px] mx-1 ${isTeslaDark ? 'bg-white/10' : 'bg-black/10'}`} />
            <div className="flex items-center gap-2">
              <Cpu className={`w-4 h-4 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
              <span className={`text-sm font-semibold tracking-[-0.022em] ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                Edit Hardware Spec &amp; Brand
              </span>
              <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${
                isTeslaDark
                  ? 'bg-white/10 text-zinc-300'
                  : 'bg-black/[0.05] text-zinc-600'
              }`}>
                U{device.start_u} ({device.height_u}U)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-[8px] transition-colors cursor-pointer ${
              isTeslaDark
                ? 'text-zinc-400 hover:text-white hover:bg-white/10'
                : 'text-zinc-500 hover:text-black hover:bg-black/[0.05]'
            }`}
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
          <div className={`p-3.5 rounded-[14px] border flex items-center justify-between text-xs ${
            isTeslaDark
              ? 'bg-[#141414] border-[#1F1F1F]'
              : 'bg-black/[0.03] border-[0.5px] border-black/10'
          }`}>
            <div className="space-y-0.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">
                Physical Slot Location
              </span>
              <span className={`font-semibold ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                U{device.start_u} - U{device.start_u + device.height_u - 1} ({device.height_u}U Rack Unit)
              </span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-medium">
                Management IP
              </span>
              <span className={`font-semibold ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`}>
                {device.ip_address || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Height Preservation Notice */}
          <div className={`p-3 rounded-[12px] border-[0.5px] flex items-center gap-2 text-xs ${
            isTeslaDark
              ? 'bg-[#3E6AE1]/15 border-[#3E6AE1]/30 text-[#3E6AE1]'
              : 'bg-[#0071E3]/10 border-[#0071E3]/25 text-[#0071E3]'
          }`}>
            <Info className={`w-4 h-4 shrink-0 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
            <span>
              Height allocation remains locked at <strong>{device.height_u}U</strong> to protect against slot collisions.
            </span>
          </div>

          <form id="edit-spec-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Catalog Picker */}
            <div className={`p-3.5 rounded-[14px] border space-y-2.5 ${
              isTeslaDark
                ? 'bg-[#141414] border-[#1F1F1F]'
                : 'bg-black/[0.03] border-[0.5px] border-black/10'
            }`}>
              <div className="flex items-center justify-between">
                <label className={`flex items-center gap-1.5 font-semibold ${isTeslaDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                  <Sparkles className={`w-4 h-4 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
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
                  className={`text-xs hover:underline cursor-pointer font-medium ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`}
                >
                  {isCustomModel ? '← Pick from Catalog' : '✏️ Custom Brand/Model'}
                </button>
              </div>

              {!isCustomModel ? (
                <div className="space-y-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className={`w-full h-[40px] rounded-[12px] px-3 text-xs focus:outline-none cursor-pointer ${
                      isTeslaDark
                        ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                        : 'bg-white border-[0.5px] border-black/15 text-[#1d1d1f] focus:border-[#0071E3]'
                    }`}
                  >
                    {brandGroups.map((group) => (
                      <optgroup
                        key={group.brand}
                        label={`━━━ ${group.brand} ━━━`}
                        className={isTeslaDark ? 'bg-[#1A1A1A] text-[#3E6AE1] font-semibold' : 'bg-white text-[#0071E3] font-semibold'}
                      >
                        {group.items.map((item) => (
                          <option
                            key={item.id}
                            value={item.id}
                            className={isTeslaDark ? 'bg-[#1A1A1A] text-[#F5F5F7]' : 'bg-white text-[#1d1d1f]'}
                          >
                            {item.model} — {item.height_u}U {item.device_type} ({item.manufacturer})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <optgroup label="━━━ Manual Input ━━━" className={isTeslaDark ? 'bg-[#1A1A1A] text-zinc-400' : 'bg-white text-zinc-500'}>
                      <option value="custom" className={isTeslaDark ? 'bg-[#1A1A1A] text-zinc-300' : 'bg-white text-zinc-700'}>
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
                <div className={`p-3 rounded-[10px] text-xs ${isTeslaDark ? 'bg-white/5 text-zinc-300' : 'bg-black/[0.04] text-zinc-700'}`}>
                  Manual entry mode active. Customize brand and model directly below.
                </div>
              )}
            </div>

            {/* Live Spec Preview Pill */}
            <div className={`p-3 rounded-[12px] border flex items-center justify-between ${
              isTeslaDark
                ? 'bg-[#141414] border-[#1F1F1F]'
                : 'bg-black/[0.03] border-[0.5px] border-black/10'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34c759]" />
                <div>
                  <div className={`font-semibold text-xs ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                    {previewModel}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {previewBrand} • {deviceType}
                  </div>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-[8px] text-xs text-[#34c759] font-semibold ${
                isTeslaDark ? 'bg-[#34c759]/20' : 'bg-black/[0.06]'
              }`}>
                {status}
              </span>
            </div>

            {/* Editable Fields Grid */}
            <div className="space-y-3">
              {/* Equipment Name */}
              <div>
                <label className={`block mb-1 font-medium ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Equipment Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SRV-APP-05"
                  className={`w-full h-[40px] rounded-[12px] px-3 text-xs focus:outline-none ${
                    isTeslaDark
                      ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                      : 'bg-black/[0.03] border-[0.5px] border-black/15 text-[#1d1d1f] focus:border-[#0071E3]'
                  }`}
                />
              </div>

              {/* Manufacturer / Brand & Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 font-medium ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="e.g. Dell EMC, Cisco, HPE"
                    className={`w-full h-[40px] rounded-[12px] px-3 text-xs focus:outline-none ${
                      isTeslaDark
                        ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                        : 'bg-black/[0.03] border-[0.5px] border-black/15 text-[#1d1d1f] focus:border-[#0071E3]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 font-medium ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Chassis Model
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. PowerEdge R750"
                    className={`w-full h-[40px] rounded-[12px] px-3 text-xs focus:outline-none ${
                      isTeslaDark
                        ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                        : 'bg-black/[0.03] border-[0.5px] border-black/15 text-[#1d1d1f] focus:border-[#0071E3]'
                    }`}
                  />
                </div>
              </div>

              {/* Device Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 font-medium ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Device Type
                  </label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value)}
                    className={`w-full h-[40px] rounded-[12px] px-3 text-xs focus:outline-none cursor-pointer ${
                      isTeslaDark
                        ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                        : 'bg-white border-[0.5px] border-black/15 text-[#1d1d1f] focus:border-[#0071E3]'
                    }`}
                  >
                    {DEVICE_TYPES.map((t) => (
                      <option key={t} value={t} className={isTeslaDark ? 'bg-[#1A1A1A] text-[#F5F5F7]' : 'bg-white text-[#1d1d1f]'}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block mb-1 font-medium ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Operational Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className={`w-full h-[40px] rounded-[12px] px-3 text-xs focus:outline-none cursor-pointer ${
                      isTeslaDark
                        ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                        : 'bg-white border-[0.5px] border-black/15 text-[#1d1d1f] focus:border-[#0071E3]'
                    }`}
                  >
                    {STATUS_OPTIONS.map((st) => (
                      <option key={st} value={st} className={isTeslaDark ? 'bg-[#1A1A1A] text-[#F5F5F7]' : 'bg-white text-[#1d1d1f]'}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Serial Number */}
              <div>
                <label className={`block mb-1 font-medium ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Serial Number / Asset Tag
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. 7XG8192-TH"
                  className={`w-full h-[40px] rounded-[12px] px-3 text-xs focus:outline-none ${
                    isTeslaDark
                      ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F7] focus:border-[#3E6AE1]'
                      : 'bg-black/[0.03] border-[0.5px] border-black/15 text-[#1d1d1f] focus:border-[#0071E3]'
                  }`}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Modal Actions Footer */}
        <div className={`p-4 border-t flex items-center justify-end gap-3 shrink-0 ${
          isTeslaDark
            ? 'bg-[#111111] border-[#1F1F1F]'
            : 'bg-black/[0.02] border-black/10'
        }`}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={`min-h-[44px] px-4 rounded-[12px] border text-xs font-medium transition-colors cursor-pointer ${
              isTeslaDark
                ? 'bg-[#1C1C1E] border-[#2A2A2A] text-zinc-300 hover:text-white hover:bg-[#252528]'
                : 'border-[0.5px] border-black/10 bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-spec-form"
            disabled={loading}
            className={`min-h-[44px] px-5 rounded-[12px] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
              isTeslaDark
                ? 'bg-[#3E6AE1] hover:bg-[#345cc4]'
                : 'bg-[#0071E3] hover:bg-[#0077ED]'
            }`}
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
