/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Server,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowRight,
  ArrowLeft,
  Activity,
  AlertTriangle,
  Check,
} from 'lucide-react'
import type { ZabbixHostOption, DeviceTemplate, Device } from '../../types'
import { fetchZabbixHosts, fetchDeviceTemplates, mountDevice } from '../../api/client'
import { DeviceBezel } from './DeviceBezel'
import { useTheme } from '../../lib/theme'

interface MountDeviceModalProps {
  rackId: number | string
  initialStartU: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type WizardStep = 1 | 2 | 3 | 4

export function MountDeviceModal({
  rackId,
  initialStartU,
  isOpen,
  onClose,
  onSuccess,
}: MountDeviceModalProps) {
  const { isTeslaDark } = useTheme()
  const [step, setStep] = useState<WizardStep>(1)

  // Step 1: Hardware Spec & Template
  const [name, setName] = useState('')
  const [deviceType, setDeviceType] = useState('Server')
  const [model, setModel] = useState('PowerEdge R750')
  const [manufacturer, setManufacturer] = useState('Dell EMC')
  const [heightU, setHeightU] = useState(2)
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('All')
  const [templates, setTemplates] = useState<DeviceTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('dell-poweredge-r750')
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false)

  // Step 2: Spatial Placement & Optimization
  const [startU, setStartU] = useState(initialStartU)

  // Step 3: Power Redundancy & PDU Feeds
  const [powerRedundancy, setPowerRedundancy] = useState<'DUAL_2N' | 'SINGLE_CORD'>('DUAL_2N')
  const [pduAOutlet, setPduAOutlet] = useState<number>(initialStartU)
  const [pduBOutlet, setPduBOutlet] = useState<number>(initialStartU)
  const [estimatedWatts, setEstimatedWatts] = useState<number>(450)

  // Step 4: Zabbix Linking & Review
  const [ipAddress, setIpAddress] = useState('')
  const [zabbixHostId, setZabbixHostId] = useState('')
  const [zabbixHosts, setZabbixHosts] = useState<ZabbixHostOption[]>([])
  const [searchHostQuery, setSearchHostQuery] = useState('')
  const [previewFace, setPreviewFace] = useState<'Front' | 'Rear'>('Front')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStartU(initialStartU)
    setPduAOutlet(initialStartU)
    setPduBOutlet(initialStartU)
  }, [initialStartU])

  // Fetch templates and Zabbix hosts when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setError(null)
      fetchZabbixHosts().then((data) => setZabbixHosts(data)).catch(() => {})
      fetchDeviceTemplates()
        .then((tmpls) => {
          setTemplates(tmpls)
          if (tmpls.length > 0) {
            const defaultTmpl = tmpls.find((t) => t.id === 'dell-poweredge-r750') || tmpls[0]
            setSelectedTemplateId(defaultTmpl.id)
            setModel(defaultTmpl.model)
            setManufacturer(defaultTmpl.manufacturer)
            setDeviceType(defaultTmpl.device_type)
            setHeightU(defaultTmpl.height_u)
            setIsCustomModel(false)
            setEstimatedWatts(
              defaultTmpl.device_type === 'Server'
                ? 450
                : defaultTmpl.device_type === 'Switch'
                ? 250
                : 600
            )
          }
        })
        .catch(() => {})
    }
  }, [isOpen])

  // Brand list for Step 1 filter
  const brandList = useMemo(() => {
    const set = new Set<string>()
    templates.forEach((t) => set.add(t.brand))
    return ['All', ...Array.from(set)]
  }, [templates])

  const filteredTemplates = useMemo(() => {
    if (selectedBrandFilter === 'All') return templates
    return templates.filter((t) => t.brand.toLowerCase() === selectedBrandFilter.toLowerCase())
  }, [templates, selectedBrandFilter])

  const currentTemplate = useMemo(() => {
    if (isCustomModel) return null
    return templates.find((t) => t.id === selectedTemplateId)
  }, [templates, selectedTemplateId, isCustomModel])

  // Optimal RU Suggestion Heuristic
  const optimalRuSuggestion = useMemo(() => {
    if (deviceType === 'UPS' || deviceType === 'Storage') {
      return {
        recommendedU: 2,
        reason: 'Heavy chassis (≥ 28kg) center-of-gravity stabilization at lower U1-U8 slots',
        badge: 'Weight Optimized',
      }
    }
    if (deviceType === 'Switch' || deviceType === 'Patch Panel') {
      return {
        recommendedU: 40,
        reason: 'Top-of-Rack (ToR) position for overhead structured cable runs at U38-U42',
        badge: 'Cable Optimized',
      }
    }
    return {
      recommendedU: startU || 18,
      reason: 'Mid-rack cold-aisle static air pressure sweet spot (U12-U28)',
      badge: 'Thermal Optimized',
    }
  }, [deviceType, startU])

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
      if (!name) setName(`SRV-${tmpl.model.replace(/\s+/g, '-').toUpperCase()}`)
      const defaultPower =
        tmpl.device_type === 'Server' ? 450 : tmpl.device_type === 'Switch' ? 250 : 600
      setEstimatedWatts(defaultPower)
    }
  }

  const handleSelectZabbixHost = (host: ZabbixHostOption) => {
    setZabbixHostId(host.hostid)
    if (!name || name.startsWith('SRV-')) setName(host.name)
    if (host.ip && !ipAddress) setIpAddress(host.ip)
  }

  const handleCommitMounting = async () => {
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
        tags: {
          power_redundancy: powerRedundancy,
          single_corded: powerRedundancy === 'SINGLE_CORD',
          pdu_a_outlet: Number(pduAOutlet),
          pdu_b_outlet: powerRedundancy === 'DUAL_2N' ? Number(pduBOutlet) : null,
          estimated_watts: Number(estimatedWatts),
        },
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      const msg =
        typeof err === 'string'
          ? err
          : err?.message
          ? err.message
          : 'Failed to mount device'
      setError(typeof msg === 'object' ? JSON.stringify(msg) : String(msg))
    } finally {
      setLoading(false)
    }
  }

  // Preview Device Object for Step 4
  const previewDevice: Device = useMemo(() => {
    return {
      id: 9999,
      rack_id: rackId,
      name: name || `DEV-U${startU}`,
      device_type: deviceType as any,
      model,
      manufacturer,
      start_u: Number(startU),
      height_u: Number(heightU),
      position_face: previewFace,
      ip_address: ipAddress,
      zabbix_host_id: zabbixHostId,
      brand_info: currentTemplate?.brand_info || {
        name: manufacturer,
        tag: manufacturer.slice(0, 4).toUpperCase(),
        color: '#007AFF',
        bg_color: '#1a2329',
        badge_class: 'bg-white/10 border-white/20 text-white',
        glow_color: '#007AFF44',
        model_family: model,
      },
      tags: {
        power_redundancy: powerRedundancy,
        single_corded: powerRedundancy === 'SINGLE_CORD',
        pdu_a_outlet: Number(pduAOutlet),
        pdu_b_outlet: powerRedundancy === 'DUAL_2N' ? Number(pduBOutlet) : null,
        estimated_watts: Number(estimatedWatts),
      },
    }
  }, [
    rackId,
    name,
    startU,
    deviceType,
    model,
    manufacturer,
    heightU,
    previewFace,
    ipAddress,
    zabbixHostId,
    currentTemplate,
    powerRedundancy,
    pduAOutlet,
    pduBOutlet,
    estimatedWatts,
  ])

  if (!isOpen) return null

  const filteredHosts = zabbixHosts.filter(
    (h) =>
      h.name.toLowerCase().includes(searchHostQuery.toLowerCase()) ||
      h.ip.includes(searchHostQuery)
  )

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 select-none ${
        isTeslaDark ? 'bg-black/80 backdrop-blur-md font-mono' : 'bg-black/40 backdrop-blur-2xl font-sans'
      }`}
    >
      <div
        className={`w-full max-w-2xl relative overflow-hidden flex flex-col max-h-[90vh] ${
          isTeslaDark
            ? 'rounded-[12px] bg-[#111111] border border-[#1F1F1F] text-[#F5F5F7] shadow-none'
            : 'rounded-[20px] bg-white/95 backdrop-blur-3xl saturate-180 border-[0.5px] border-black/15 shadow-[0_24px_64px_rgba(0,0,0,0.2)] text-[#1d1d1f]'
        }`}
      >
        {/* Header Ribbon with macOS Traffic Lights & 4-Step Stepper */}
        <div
          className={`p-4 border-b space-y-3 ${
            isTeslaDark ? 'bg-[#0A0A0A] border-[#1F1F1F]' : 'border-black/10 bg-black/[0.02]'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
              </div>
              <div className={`h-4 w-[1px] mx-1 ${isTeslaDark ? 'bg-[#1F1F1F]' : 'bg-black/10'}`} />
              <div className="flex items-center gap-2">
                <Server className={`w-4 h-4 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
                <span className={`text-sm font-semibold ${isTeslaDark ? 'text-white font-mono' : 'tracking-[-0.022em] text-[#1d1d1f]'}`}>
                  Device Provisioning Wizard (Slot U{startU})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`p-1 rounded-[8px] transition-colors cursor-pointer ${
                isTeslaDark ? 'text-zinc-500 hover:text-white hover:bg-[#1F1F1F]' : 'text-zinc-500 hover:text-black hover:bg-black/[0.05]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Progress Ribbon */}
          <div
            className={`grid grid-cols-4 gap-1.5 p-1 text-xs ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#161616] border border-[#1F1F1F]'
                : 'rounded-[10px] bg-black/[0.05]'
            }`}
          >
            {[
              { id: 1, label: '1. Hardware Spec' },
              { id: 2, label: '2. RU Placement' },
              { id: 3, label: '3. Power & PDU' },
              { id: 4, label: '4. Review & Link' },
            ].map((s) => {
              const isCurrent = step === s.id
              const isPast = step > s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id as WizardStep)}
                  className={`min-h-[32px] px-2.5 rounded-[8px] flex items-center justify-between text-xs font-semibold tracking-[-0.011em] transition-all cursor-pointer ${
                    isCurrent
                      ? isTeslaDark
                        ? 'bg-[#3E6AE1] text-white shadow-none'
                        : 'bg-[#0071E3] text-white shadow-sm'
                      : isPast
                      ? isTeslaDark
                        ? 'bg-[#00C853]/15 text-[#00C853]'
                        : 'bg-[#34c759]/15 text-[#34c759]'
                      : isTeslaDark
                      ? 'text-zinc-500 hover:text-white'
                      : 'text-zinc-500 hover:text-black'
                  }`}
                >
                  <span className="truncate">{s.label}</span>
                  {isPast && (
                    <Check
                      className={`w-3.5 h-3.5 shrink-0 ${isTeslaDark ? 'text-[#00C853]' : 'text-[#34c759]'}`}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable Wizard Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Global Error Banner */}
          {error && (
            <div className="p-3.5 rounded-[12px] bg-[#ff3b30]/15 border-[0.5px] border-[#ff3b30]/30 flex items-center gap-2.5 text-xs text-[#ff3b30]">
              <AlertCircle className="w-4 h-4 text-[#ff3b30] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Hardware Spec & Template Catalog */}
          {step === 1 && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[#1d1d1f] font-semibold text-sm tracking-[-0.022em]">
                    Select Hardware Model &amp; Brand
                  </h4>
                  <p className="text-zinc-600 text-xs mt-0.5">
                    Pick an enterprise template with verified RU dimensions, weight, and power profiles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCustomModel
                    setIsCustomModel(next)
                    if (next) setSelectedTemplateId('custom')
                    else if (templates.length > 0) handleSelectTemplate(templates[0].id)
                  }}
                  className="px-3 py-1.5 rounded-[10px] bg-black/[0.05] hover:bg-black/[0.08] text-[#0071E3] text-xs font-semibold cursor-pointer transition-colors"
                >
                  {isCustomModel ? '← Use Catalog' : '✏️ Custom Model'}
                </button>
              </div>

              {!isCustomModel ? (
                <>
                  {/* Brand Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {brandList.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBrandFilter(b)}
                        className={`px-3 py-1 rounded-[8px] text-[11px] font-semibold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                          selectedBrandFilter === b
                            ? 'bg-[#0071E3] text-white shadow-sm'
                            : 'bg-black/[0.04] text-zinc-600 hover:text-black border-[0.5px] border-black/10'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {/* Template Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1 rounded-[14px]">
                    {filteredTemplates.map((t) => {
                      const isSelected = selectedTemplateId === t.id
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTemplate(t.id)}
                          className={`p-3 rounded-[12px] border-[0.5px] cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#0071E3]/15 border-[#0071E3] shadow-sm'
                              : 'bg-black/[0.03] border-black/10 hover:border-black/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase tracking-wider text-white"
                              style={{
                                backgroundColor: t.brand_info?.color || '#0071E3',
                              }}
                            >
                              {t.brand_info?.tag || t.brand}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-[6px] bg-black/[0.06] text-zinc-700 font-semibold">
                              {t.height_u}U
                            </span>
                          </div>
                          <div className="font-semibold text-[#1d1d1f] text-xs truncate">{t.model}</div>
                          <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {t.manufacturer} • {t.device_type}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="p-3.5 bg-black/[0.03] border border-dashed border-black/20 rounded-[12px] text-zinc-700">
                  Custom hardware entry mode active. Specify custom Model and OEM Vendor below.
                </div>
              )}

              {/* Equipment Name & Model Details */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-black/10">
                <div>
                  <label className="block text-zinc-700 mb-1 font-medium">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SRV-APP-01"
                    className="w-full h-[40px] bg-black/[0.03] border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 mb-1 font-medium">Form Factor (U)</label>
                  <select
                    value={heightU}
                    onChange={(e) => setHeightU(Number(e.target.value))}
                    className="w-full h-[40px] bg-white border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071E3]"
                  >
                    <option value={1}>1U Standard</option>
                    <option value={2}>2U Dense</option>
                    <option value={3}>3U Extended</option>
                    <option value={4}>4U High-Capacity</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Spatial Placement & RU Optimization */}
          {step === 2 && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-[#1d1d1f] font-semibold text-sm tracking-[-0.022em]">
                  Cabinet Position &amp; RU Optimization
                </h4>
                <p className="text-zinc-600 text-xs mt-0.5">
                  Intelligent auto-placement heuristic based on thermal distribution and chassis weight.
                </p>
              </div>

              {/* Optimization Heuristic Card */}
              <div className="p-4 rounded-[14px] bg-[#0071E3]/10 border-[0.5px] border-[#0071E3]/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-[#0071E3] text-xs">
                    <Sparkles className="w-4 h-4 text-[#0071E3]" />
                    Optimal Placement Recommendation
                  </span>
                  <span className="px-2 py-0.5 rounded-[6px] bg-[#0071E3]/15 text-[#0071E3] text-[10px] font-semibold">
                    {optimalRuSuggestion.badge}
                  </span>
                </div>
                <p className="text-zinc-700 text-xs">{optimalRuSuggestion.reason}</p>
                <button
                  type="button"
                  onClick={() => setStartU(optimalRuSuggestion.recommendedU)}
                  className="px-3 py-1.5 rounded-[10px] bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  Apply Suggested Slot (U{optimalRuSuggestion.recommendedU})
                </button>
              </div>

              {/* Slot Position Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 mb-1 font-medium">Mounting Start U (1-42)</label>
                  <input
                    type="number"
                    min="1"
                    max={42 - heightU + 1}
                    value={startU}
                    onChange={(e) => setStartU(Number(e.target.value))}
                    className="w-full h-[40px] bg-black/[0.03] border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] font-semibold text-xs focus:outline-none focus:border-[#0071E3]"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 mb-1 font-medium">Occupied Slot Span</label>
                  <div className="w-full h-[40px] bg-black/[0.03] border-[0.5px] border-black/10 rounded-[12px] px-3 flex items-center text-[#0071E3] font-semibold text-xs">
                    U{startU} → U{startU + heightU - 1} ({heightU}U Total)
                  </div>
                </div>
              </div>

              {/* Thermal Zone Visual Indicator */}
              <div className="p-3 rounded-[12px] bg-black/[0.03] border-[0.5px] border-black/10 space-y-2">
                <div className="flex justify-between text-zinc-600 text-xs font-medium">
                  <span>Rack Height Heat Gradient</span>
                  <span>ASHRAE TC 9.9 Compliant</span>
                </div>
                <div className="w-full h-3 rounded-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-500 relative flex items-center">
                  <div
                    className="absolute w-2 h-4 bg-white border border-black/30 shadow-md rounded-full"
                    style={{ left: `${Math.min(96, Math.max(2, (startU / 42) * 100))}%` }}
                    title={`Selected Slot U${startU}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>U1 Bottom (20°C Cold Air)</span>
                  <span>U20 Mid (24°C Ideal)</span>
                  <span>U42 Top (27°C Exhaust)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Power Redundancy & PDU Feeds */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-[#1d1d1f] font-semibold text-sm tracking-[-0.022em]">
                  Power Redundancy &amp; PDU Feed Allocation
                </h4>
                <p className="text-zinc-600 text-xs mt-0.5">
                  Configure dual A/B power feeds to maintain 2N redundancy and prevent single-corded hazards.
                </p>
              </div>

              {/* Redundancy Mode Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPowerRedundancy('DUAL_2N')}
                  className={`p-3.5 rounded-[14px] border-[0.5px] text-left transition-all cursor-pointer ${
                    powerRedundancy === 'DUAL_2N'
                      ? 'bg-[#0071E3]/10 border-[#0071E3] shadow-sm'
                      : 'bg-black/[0.03] border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-[#0071E3]" />
                      Dual Feed (2N Redundant)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-[6px] bg-[#34c759]/15 border border-[#34c759]/40 text-[#34c759] font-semibold">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    PSU-1 on Feed A and PSU-2 on Feed B. Zero downtime if either PDU trips.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPowerRedundancy('SINGLE_CORD')}
                  className={`p-3.5 rounded-[14px] border-[0.5px] text-left transition-all cursor-pointer ${
                    powerRedundancy === 'SINGLE_CORD'
                      ? 'bg-[#ff9500]/10 border-[#ff9500] shadow-sm'
                      : 'bg-black/[0.03] border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-[#ff9500]" />
                      Single Feed (High Risk)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-[6px] bg-[#ff9500]/15 border border-[#ff9500]/40 text-[#ff9500] font-semibold">
                      HAZARD
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Only 1 power cord wired. If Feed A fails, server immediately halts.
                  </p>
                </button>
              </div>

              {powerRedundancy === 'SINGLE_CORD' && (
                <div className="p-3.5 rounded-[12px] bg-[#ff9500]/15 border-[0.5px] border-[#ff9500]/30 flex items-center gap-2.5 text-[#ff9500] text-xs">
                  <AlertTriangle className="w-4 h-4 text-[#ff9500] shrink-0" />
                  <span>
                    Warning: Single-corded servers trigger automatic PDU redundancy alarms in telemetry.
                  </span>
                </div>
              )}

              {/* PDU Outlets Assignment Grid */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-black/10">
                <div className="p-3 bg-black/[0.03] border-[0.5px] border-black/10 rounded-[12px] space-y-1">
                  <div className="flex items-center justify-between text-[#0071E3] font-semibold">
                    <span>FEED A (PDU-A)</span>
                    <span className="text-zinc-500 text-[10px]">230V • 16A</span>
                  </div>
                  <div className="text-[#1d1d1f] font-bold text-sm">Outlet #{pduAOutlet}</div>
                  <div className="text-[11px] text-zinc-500">Active Primary Feed</div>
                </div>

                <div
                  className={`p-3 rounded-[12px] space-y-1 border-[0.5px] ${
                    powerRedundancy === 'SINGLE_CORD'
                      ? 'bg-[#ff9500]/10 border-dashed border-[#ff9500]/40'
                      : 'bg-black/[0.03] border-black/10'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between font-semibold ${
                      powerRedundancy === 'SINGLE_CORD' ? 'text-[#ff9500]' : 'text-[#ff3b30]'
                    }`}
                  >
                    <span>FEED B (PDU-B)</span>
                    <span className="text-zinc-500 text-[10px]">230V • 16A</span>
                  </div>
                  <div className="text-[#1d1d1f] font-bold text-sm">
                    {powerRedundancy === 'SINGLE_CORD' ? 'UNASSIGNED (DISCONNECTED)' : `Outlet #${pduBOutlet}`}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {powerRedundancy === 'SINGLE_CORD' ? 'No Secondary Failover' : 'Standby Redundant Feed'}
                  </div>
                </div>
              </div>

              {/* Power Draw Forecast */}
              <div className="p-3 rounded-[12px] bg-black/[0.03] border-[0.5px] border-black/10 flex items-center justify-between text-xs">
                <span className="text-zinc-600">Estimated Power Draw:</span>
                <span className="text-[#ff9500] font-semibold">{estimatedWatts} W (Typical Operating Load)</span>
              </div>
            </div>
          )}

          {/* STEP 4: Zabbix 7.0 Link, Photorealistic Preview & Commit */}
          {step === 4 && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-[#1d1d1f] font-semibold text-sm tracking-[-0.022em]">
                  Zabbix 7.0 Link &amp; Faceplate Preview
                </h4>
                <p className="text-zinc-600 text-xs mt-0.5">
                  Link an active Zabbix host for real-time telemetry and preview the hardware elevation.
                </p>
              </div>

              {/* Preview Card */}
              <div className="p-4 rounded-[14px] bg-black/[0.03] border-[0.5px] border-black/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#1d1d1f] font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#0071E3]" />
                    Chassis Faceplate Preview
                  </span>
                  <div className="flex items-center gap-1.5 text-xs p-1 rounded-[8px] bg-black/[0.05]">
                    <button
                      type="button"
                      onClick={() => setPreviewFace('Front')}
                      className={`px-3 py-1 rounded-[6px] font-semibold cursor-pointer ${
                        previewFace === 'Front' ? 'bg-[#0071E3] text-white shadow-sm' : 'text-zinc-600 hover:text-black'
                      }`}
                    >
                      Front Bezel
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFace('Rear')}
                      className={`px-3 py-1 rounded-[6px] font-semibold cursor-pointer ${
                        previewFace === 'Rear' ? 'bg-[#0071E3] text-white shadow-sm' : 'text-zinc-600 hover:text-black'
                      }`}
                    >
                      Rear I/O
                    </button>
                  </div>
                </div>

                <div className="w-full bg-[#161618] p-3 rounded-[12px] border-[0.5px] border-black/20">
                  <DeviceBezel
                    device={previewDevice}
                    isSelected={true}
                    onClick={() => {}}
                    face={previewFace}
                  />
                </div>
              </div>

              {/* Zabbix Host Search & Link */}
              <div className="space-y-2">
                <label className="block text-zinc-700 font-medium">
                  Link to Zabbix 7.0 Host (Auto-syncs CPU, RAM &amp; Problems)
                </label>
                <input
                  type="text"
                  value={searchHostQuery}
                  onChange={(e) => setSearchHostQuery(e.target.value)}
                  placeholder="Filter active Zabbix hosts by name or IP..."
                  className="w-full h-[40px] bg-black/[0.03] border-[0.5px] border-black/15 rounded-[12px] px-3 text-[#1d1d1f] text-xs placeholder-zinc-400 focus:outline-none focus:border-[#0071E3]"
                />

                <div className="max-h-28 overflow-y-auto space-y-1 rounded-[12px] border-[0.5px] border-black/10 bg-black/[0.02] p-1.5">
                  {filteredHosts.length === 0 ? (
                    <div className="text-zinc-500 py-3 text-center text-xs">
                      No matching hosts found in Zabbix inbox
                    </div>
                  ) : (
                    filteredHosts.map((h) => {
                      const isSelected = zabbixHostId === h.hostid
                      return (
                        <div
                          key={h.hostid}
                          onClick={() => handleSelectZabbixHost(h)}
                          className={`p-2 rounded-[8px] flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#0071E3]/15 border-[0.5px] border-[#0071E3] text-[#0071E3]'
                              : 'text-zinc-700 hover:bg-black/[0.05]'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-xs text-[#1d1d1f]">{h.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{h.ip || 'No IP'}</div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0071E3]" />}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Final Summary Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-black/10">
                <div className="p-2.5 bg-black/[0.03] rounded-[10px] border-[0.5px] border-black/10">
                  <span className="text-zinc-500 block text-[10px] font-medium">Slot Position</span>
                  <span className="text-[#1d1d1f] font-semibold text-xs">U{startU} ({heightU}U)</span>
                </div>
                <div className="p-2.5 bg-black/[0.03] rounded-[10px] border-[0.5px] border-black/10">
                  <span className="text-zinc-500 block text-[10px] font-medium">Power Redundancy</span>
                  <span className={powerRedundancy === 'DUAL_2N' ? 'text-[#34c759] font-semibold text-xs' : 'text-[#ff9500] font-semibold text-xs'}>
                    {powerRedundancy === 'DUAL_2N' ? '2N Dual Feed' : '1x Single Cord'}
                  </span>
                </div>
                <div className="p-2.5 bg-black/[0.03] rounded-[10px] border-[0.5px] border-black/10">
                  <span className="text-zinc-500 block text-[10px] font-medium">Zabbix Link</span>
                  <span className="text-[#0071E3] font-semibold text-xs truncate block">
                    {zabbixHostId ? 'Active Link' : 'Unlinked'}
                  </span>
                </div>
                <div className="p-2.5 bg-black/[0.03] rounded-[10px] border-[0.5px] border-black/10">
                  <span className="text-zinc-500 block text-[10px] font-medium">Management IP</span>
                  <span className="text-[#1d1d1f] font-semibold text-xs truncate block">{ipAddress || 'Auto-assign'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Navigation Footer */}
        <div
          className={`p-4 border-t flex items-center justify-between text-xs ${
            isTeslaDark ? 'bg-[#0A0A0A] border-[#1F1F1F]' : 'bg-black/[0.02] border-black/10'
          }`}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
              className={`min-h-[44px] px-4 flex items-center gap-2 transition-all cursor-pointer border ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] hover:bg-[#1F1F1F] border-[#1F1F1F] text-zinc-300 font-mono'
                  : 'rounded-[12px] border-[0.5px] border-black/10 bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`min-h-[44px] px-4 transition-all cursor-pointer border ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] hover:bg-[#1F1F1F] border-[#1F1F1F] text-zinc-300 font-mono'
                  : 'rounded-[12px] border-[0.5px] border-black/10 bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black'
              }`}
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              className={`min-h-[44px] px-5 font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#3E6AE1] hover:bg-[#345ac2] text-white font-mono shadow-none'
                  : 'rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm hover:scale-[1.01] active:scale-[0.98]'
              }`}
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleCommitMounting}
              className={`min-h-[44px] px-6 font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#00C853] hover:bg-[#00a846] text-black font-mono shadow-none'
                  : 'rounded-[12px] bg-[#34c759] hover:bg-[#2fb34f] text-white shadow-sm hover:scale-[1.01] active:scale-[0.98]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Committing Provision...' : 'Commit & Mount Device'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
