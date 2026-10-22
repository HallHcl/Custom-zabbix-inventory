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

interface MountDeviceModalProps {
  rackId: number
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
            setEstimatedWatts(defaultTmpl.device_type === 'Server' ? 450 : defaultTmpl.device_type === 'Switch' ? 250 : 600)
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

  // Optimal RU Suggestion Heuristic (Data center engineering standards)
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
      const defaultPower = tmpl.device_type === 'Server' ? 450 : tmpl.device_type === 'Switch' ? 250 : 600
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
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message ? err.message : 'Failed to mount device'
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
        color: '#38bdf8',
        bg_color: '#1a2329',
        badge_class: 'bg-sky-950 border-sky-600 text-sky-200',
        glow_color: '#38bdf844',
        model_family: model,
      },
      tags: { single_corded: powerRedundancy === 'SINGLE_CORD' },
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
  ])

  if (!isOpen) return null

  const filteredHosts = zabbixHosts.filter(
    (h) =>
      h.name.toLowerCase().includes(searchHostQuery.toLowerCase()) ||
      h.ip.includes(searchHostQuery)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="w-full max-w-2xl noc-panel shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Ribbon with 4-Step Stepper */}
        <div className="noc-panel-header flex-col items-stretch gap-2 p-3 border-b border-[#394650] bg-[#1a2329]">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              <span className="font-mono uppercase tracking-wider text-xs font-bold text-white">
                Device Provisioning Wizard (Slot U{startU})
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

          {/* VisionOS / Tesla Glassmorphic Stepper */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-[10px]">
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
                  className={`py-1.5 px-2 rounded-[3px] border flex items-center justify-between transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-[0_0_8px_#38bdf844] font-bold'
                      : isPast
                        ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300 font-semibold'
                        : 'bg-[#141b20] border-[#2b3741] text-[#85a6b1] hover:text-slate-300'
                  }`}
                >
                  <span className="truncate">{s.label}</span>
                  {isPast && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scrollable Wizard Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Global Error Banner */}
          {error && (
            <div className="p-2.5 rounded-[2px] bg-rose-950/60 border border-rose-700 flex items-center gap-2 text-xs font-mono text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Hardware Spec & Template Catalog */}
          {step === 1 && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-sm">Select Hardware Model & Brand</h4>
                  <p className="text-[11px] text-[#85a6b1]">
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
                  className="px-2 py-1 rounded bg-[#273139] border border-[#394650] text-[#8bd7d1] hover:text-white text-[10px] cursor-pointer"
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
                        className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase transition-all shrink-0 cursor-pointer ${
                          selectedBrandFilter === b
                            ? 'bg-sky-900 border border-sky-400 text-white shadow-xs'
                            : 'bg-[#20282f] text-[#85a6b1] hover:text-white border border-[#394650]'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {/* Template Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-[#141b20] border border-[#2b3741] rounded-[3px]">
                    {filteredTemplates.map((t) => {
                      const isSelected = selectedTemplateId === t.id
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectTemplate(t.id)}
                          className={`p-2.5 rounded-[2px] border cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#202b33] border-sky-400 shadow-[0_0_8px_#38bdf833]'
                              : 'bg-[#182026] border-[#313f4b] hover:border-[#50626f]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider"
                              style={{
                                backgroundColor: t.brand_info?.color || '#38bdf8',
                                color: '#000',
                              }}
                            >
                              {t.brand_info?.tag || t.brand}
                            </span>
                            <span className="text-[10px] px-1 py-0.2 rounded bg-black/40 border border-white/10 text-white font-bold">
                              {t.height_u}U
                            </span>
                          </div>
                          <div className="font-bold text-white text-[11px] truncate">{t.model}</div>
                          <div className="text-[9.5px] text-[#85a6b1] truncate mt-0.5">
                            {t.manufacturer} • {t.device_type}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="p-3 bg-[#182026] border border-dashed border-[#50626f] rounded-[3px] text-slate-300">
                  Custom hardware entry mode active. Specify custom Model and OEM Vendor below.
                </div>
              )}

              {/* Equipment Name & Model Details */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2d3a43]">
                <div>
                  <label className="block text-[#caedde] mb-1 font-bold">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SRV-APP-01"
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-[#caedde] mb-1 font-bold">Form Factor (U)</label>
                  <select
                    value={heightU}
                    onChange={(e) => setHeightU(Number(e.target.value))}
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white focus:outline-none focus:border-sky-400"
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

          {/* STEP 2: Spatial Placement & Thermal/Weight Optimization */}
          {step === 2 && (
            <div className="space-y-4 font-mono text-xs">
              <div>
                <h4 className="text-white font-bold text-sm">Cabinet Position & RU Optimization</h4>
                <p className="text-[11px] text-[#85a6b1]">
                  Intelligent auto-placement heuristic based on thermal distribution and chassis weight.
                </p>
              </div>

              {/* Optimization Heuristic Card */}
              <div className="p-3 rounded-[3px] bg-sky-950/40 border border-sky-600/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-sky-300 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Optimal Placement Recommendation
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/80 text-sky-200 text-[9px] font-bold">
                    {optimalRuSuggestion.badge}
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300">{optimalRuSuggestion.reason}</p>
                <button
                  type="button"
                  onClick={() => setStartU(optimalRuSuggestion.recommendedU)}
                  className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-black font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                >
                  Apply Suggested Slot (U{optimalRuSuggestion.recommendedU})
                </button>
              </div>

              {/* Slot Position Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#caedde] mb-1 font-bold">Mounting Start U (1-42)</label>
                  <input
                    type="number"
                    min="1"
                    max={42 - heightU + 1}
                    value={startU}
                    onChange={(e) => setStartU(Number(e.target.value))}
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-[#caedde] mb-1 font-bold">Occupied Slot Span</label>
                  <div className="w-full bg-[#182026] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-sky-300 font-bold">
                    U{startU} → U{startU + heightU - 1} ({heightU}U Total)
                  </div>
                </div>
              </div>

              {/* Thermal Zone Visual Indicator */}
              <div className="p-2.5 rounded-[2px] bg-[#141b20] border border-[#2b3741] space-y-1.5 text-[10px]">
                <div className="flex justify-between text-[#85a6b1]">
                  <span>Rack Height Heat Gradient</span>
                  <span>ASHRAE TC 9.9 Compliant</span>
                </div>
                <div className="w-full h-3 rounded-[1px] bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-500 relative flex items-center">
                  <div
                    className="absolute w-2 h-4 bg-white border border-black shadow-md rounded-[1px]"
                    style={{ left: `${Math.min(96, Math.max(2, (startU / 42) * 100))}%` }}
                    title={`Selected Slot U${startU}`}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-[#85a6b1]">
                  <span>U1 Bottom (20°C Cold Air)</span>
                  <span>U20 Mid (24°C Ideal)</span>
                  <span>U42 Top (27°C Exhaust)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Power Redundancy & PDU Feeds */}
          {step === 3 && (
            <div className="space-y-4 font-mono text-xs">
              <div>
                <h4 className="text-white font-bold text-sm">Power Redundancy & PDU Feed Allocation</h4>
                <p className="text-[11px] text-[#85a6b1]">
                  Configure dual A/B power feeds to maintain 2N redundancy and prevent single-corded hazards.
                </p>
              </div>

              {/* Redundancy Mode Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPowerRedundancy('DUAL_2N')}
                  className={`p-3 rounded-[3px] border text-left transition-all cursor-pointer ${
                    powerRedundancy === 'DUAL_2N'
                      ? 'bg-sky-950/70 border-sky-400 shadow-[0_0_8px_#38bdf844]'
                      : 'bg-[#182026] border-[#313f4b]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sky-300 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      Dual Feed (2N Redundant)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-[10px] text-[#85a6b1]">
                    PSU-1 on Feed A and PSU-2 on Feed B. Zero downtime if either PDU trips.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPowerRedundancy('SINGLE_CORD')}
                  className={`p-3 rounded-[3px] border text-left transition-all cursor-pointer ${
                    powerRedundancy === 'SINGLE_CORD'
                      ? 'bg-amber-950/60 border-amber-500 shadow-[0_0_8px_#f59e0b44]'
                      : 'bg-[#182026] border-[#313f4b]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Single Feed (High Risk)
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-600 text-amber-300 font-bold">
                      HAZARD
                    </span>
                  </div>
                  <p className="text-[10px] text-[#85a6b1]">
                    Only 1 power cord wired. If Feed A fails, server immediately halts.
                  </p>
                </button>
              </div>

              {powerRedundancy === 'SINGLE_CORD' && (
                <div className="p-2.5 rounded-[2px] bg-amber-950/50 border border-amber-500 flex items-center gap-2 text-amber-300 text-[10.5px]">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Warning: Single-corded servers trigger automatic PDU redundancy alarms in NexusTwin telemetry.
                  </span>
                </div>
              )}

              {/* PDU Outlets Assignment Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2d3a43]">
                <div className="p-2.5 bg-[#141b20] border border-sky-800/80 rounded-[2px] space-y-1">
                  <div className="flex items-center justify-between text-sky-400 font-bold">
                    <span>FEED A (PDU-A)</span>
                    <span className="text-[9px] text-[#85a6b1]">230V • 16A</span>
                  </div>
                  <div className="text-[11px] text-white">Outlet #{pduAOutlet}</div>
                  <div className="text-[9.5px] text-[#85a6b1]">Active Primary Feed</div>
                </div>

                <div
                  className={`p-2.5 rounded-[2px] space-y-1 ${
                    powerRedundancy === 'SINGLE_CORD'
                      ? 'bg-amber-950/30 border border-dashed border-amber-600'
                      : 'bg-[#141b20] border border-rose-800/80'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between font-bold ${
                      powerRedundancy === 'SINGLE_CORD' ? 'text-amber-400' : 'text-rose-400'
                    }`}
                  >
                    <span>FEED B (PDU-B)</span>
                    <span className="text-[9px] text-[#85a6b1]">230V • 16A</span>
                  </div>
                  <div className="text-[11px] text-white">
                    {powerRedundancy === 'SINGLE_CORD' ? 'UNASSIGNED (DISCONNECTED)' : `Outlet #${pduBOutlet}`}
                  </div>
                  <div className="text-[9.5px] text-[#85a6b1]">
                    {powerRedundancy === 'SINGLE_CORD' ? 'No Secondary Failover' : 'Standby Redundant Feed'}
                  </div>
                </div>
              </div>

              {/* Power Headroom Forecast */}
              <div className="p-2 rounded bg-[#182026] border border-[#2d3a43] flex items-center justify-between text-[11px]">
                <span className="text-[#85a6b1]">Estimated Power Draw:</span>
                <span className="text-amber-300 font-bold">{estimatedWatts} W (Typical Operating Load)</span>
              </div>
            </div>
          )}

          {/* STEP 4: Zabbix 7.0 Link, Photorealistic Preview & Commit */}
          {step === 4 && (
            <div className="space-y-4 font-mono text-xs">
              <div>
                <h4 className="text-white font-bold text-sm">Zabbix 7.0 Link & Faceplate Preview</h4>
                <p className="text-[11px] text-[#85a6b1]">
                  Link an active Zabbix host for real-time telemetry and preview the hardware elevation.
                </p>
              </div>

              {/* Photorealistic Live Elevation Preview Card */}
              <div className="p-3 rounded-[3px] bg-[#141b20] border border-[#2d3a43] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#85a6b1] font-bold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-sky-400" />
                    Photorealistic Elevation Preview
                  </span>
                  <div className="flex items-center gap-1 text-[9px]">
                    <button
                      type="button"
                      onClick={() => setPreviewFace('Front')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        previewFace === 'Front' ? 'bg-sky-500 text-black font-bold' : 'text-[#85a6b1]'
                      }`}
                    >
                      Front Bezel
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewFace('Rear')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        previewFace === 'Rear' ? 'bg-sky-500 text-black font-bold' : 'text-[#85a6b1]'
                      }`}
                    >
                      Rear I/O
                    </button>
                  </div>
                </div>

                <div className="w-full bg-[#1c242a] p-2 rounded-[2px] border border-[#34424b]">
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
                <label className="block text-[#caedde] font-bold">
                  Link to Zabbix 7.0 Host (Auto-syncs CPU, RAM &amp; Problems)
                </label>
                <input
                  type="text"
                  value={searchHostQuery}
                  onChange={(e) => setSearchHostQuery(e.target.value)}
                  placeholder="Filter active Zabbix hosts by name or IP..."
                  className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-sky-400"
                />

                <div className="max-h-24 overflow-y-auto space-y-1 rounded-[2px] border border-[#394650] bg-[#161c20] p-1">
                  {filteredHosts.length === 0 ? (
                    <div className="text-[#85a6b1] py-2 text-center text-[10px]">
                      No matching hosts found in Zabbix inbox
                    </div>
                  ) : (
                    filteredHosts.map((h) => {
                      const isSelected = zabbixHostId === h.hostid
                      return (
                        <div
                          key={h.hostid}
                          onClick={() => handleSelectZabbixHost(h)}
                          className={`p-1.5 rounded-[2px] flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-sky-950 border border-sky-500 text-white'
                              : 'text-[#85a6b1] hover:bg-[#273139]'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-[11px] text-white">{h.name}</div>
                            <div className="text-[9px] text-[#85a6b1] font-mono">{h.ip || 'No IP'}</div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Final Summary Table */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-2 border-t border-[#2d3a43]">
                <div className="p-1.5 bg-[#182026] rounded border border-[#2b3741]">
                  <span className="text-[#85a6b1] block">Slot Position</span>
                  <span className="text-white font-bold">U{startU} ({heightU}U)</span>
                </div>
                <div className="p-1.5 bg-[#182026] rounded border border-[#2b3741]">
                  <span className="text-[#85a6b1] block">Power Redundancy</span>
                  <span className={powerRedundancy === 'DUAL_2N' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {powerRedundancy === 'DUAL_2N' ? '2N Dual Feed' : '1x Single Cord'}
                  </span>
                </div>
                <div className="p-1.5 bg-[#182026] rounded border border-[#2b3741]">
                  <span className="text-[#85a6b1] block">Zabbix Link</span>
                  <span className="text-sky-300 font-bold truncate block">
                    {zabbixHostId ? 'Active Link' : 'Unlinked'}
                  </span>
                </div>
                <div className="p-1.5 bg-[#182026] rounded border border-[#2b3741]">
                  <span className="text-[#85a6b1] block">Management IP</span>
                  <span className="text-white font-bold truncate block">{ipAddress || 'Auto-assign'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Navigation Footer */}
        <div className="p-3 bg-[#1a2329] border-t border-[#394650] flex items-center justify-between font-mono text-xs">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as WizardStep)}
              className="px-3 py-1.5 rounded-[2px] border border-[#394650] bg-[#273139] text-[#caedde] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-[2px] border border-[#394650] bg-[#273139] text-[#caedde] hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
              className="px-4 py-1.5 rounded-[2px] bg-sky-500 hover:bg-sky-400 text-black font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
            >
              Next Step
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleCommitMounting}
              className="px-5 py-1.5 rounded-[2px] bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950"
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
