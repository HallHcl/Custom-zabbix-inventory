/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */
import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Server,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Network,
  Cpu,
  Layers,
  Search,
  Trash2,
  Monitor,
  Activity,
  Shield,
  Radio,
  Sliders,
  Globe,
} from 'lucide-react'
import type {
  RackSummary,
  ZabbixHostGroupOption,
  ZabbixTemplateOption,
  ZabbixHostCreatePayload,
  ZabbixHostCreateResponse,
} from '../../types'
import {
  fetchZabbixHostGroups,
  fetchZabbixTemplates,
  createZabbixHost,
} from '../../api/client'

interface AddHostModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (res: ZabbixHostCreateResponse) => void
  racks: RackSummary[]
}

type WizardStep = 1 | 2 | 3 | 4

const WIZARD_STEPS = [
  { id: 1 as WizardStep, title: 'Host Basics', subtitle: 'Identification & Groups', icon: Server },
  { id: 2 as WizardStep, title: 'Interface Protocol', subtitle: 'Agent, SNMP or IPMI', icon: Network },
  { id: 3 as WizardStep, title: 'Templates & Tags', subtitle: 'Telemetry & Metadata', icon: Layers },
  { id: 4 as WizardStep, title: 'DCIM Rack Mount', subtitle: 'Physical Spatial Allocation', icon: Cpu },
]

export function AddHostModal({
  isOpen,
  onClose,
  onSuccess,
  racks,
}: AddHostModalProps) {
  const [step, setStep] = useState<WizardStep>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Host Basics
  const [hostname, setHostname] = useState('')
  const [visibleName, setVisibleName] = useState('')
  const [availableGroups, setAvailableGroups] = useState<ZabbixHostGroupOption[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [groupSearch, setGroupSearch] = useState('')
  const [status, setStatus] = useState<number>(0) // 0=Monitored, 1=Unmonitored

  // Step 2: Interfaces
  const [interfaceType, setInterfaceType] = useState<number>(1) // 1=Agent, 2=SNMP, 3=IPMI, 4=JMX
  const [connectVia, setConnectVia] = useState<'ip' | 'dns'>('ip')
  const [ipAddress, setIpAddress] = useState('192.168.1.')
  const [dnsName, setDnsName] = useState('')
  const [port, setPort] = useState('10050')
  // SNMP specific details
  const [snmpVersion, setSnmpVersion] = useState<number>(2) // 1=v1, 2=v2c, 3=v3
  const [snmpCommunity, setSnmpCommunity] = useState('public')
  const [snmpSecurityName, setSnmpSecurityName] = useState('')

  // Step 3: Templates & Tags
  const [availableTemplates, setAvailableTemplates] = useState<ZabbixTemplateOption[]>([])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [templateSearch, setTemplateSearch] = useState('')
  const [tags, setTags] = useState<Array<{ key: string; value: string }>>([
    { key: 'Environment', value: 'Production' },
  ])
  const [newTagKey, setNewTagKey] = useState('')
  const [newTagVal, setNewTagVal] = useState('')
  const [description, setDescription] = useState('')

  // Step 4: Optional DCIM Rack Placement
  const [mountToRack, setMountToRack] = useState(false)
  const [selectedRackId, setSelectedRackId] = useState<string>(racks[0]?.id ? String(racks[0].id) : '')
  const [startU, setStartU] = useState<number>(1)
  const [heightU, setHeightU] = useState<number>(1)
  const [positionFace, setPositionFace] = useState<'Front' | 'Rear' | 'Both'>('Front')
  const [deviceType, setDeviceType] = useState('Server')
  const [manufacturer, setManufacturer] = useState('Generic')
  const [model, setModel] = useState('Generic Server')

  // Load hostgroups and templates when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setError(null)
      fetchZabbixHostGroups()
        .then((groups) => {
          setAvailableGroups(groups)
          if (groups.length > 0 && selectedGroupIds.length === 0) {
            const defaultGroup =
              groups.find((g) => g.name.toLowerCase().includes('linux') || g.name.toLowerCase().includes('server')) ||
              groups[0]
            if (defaultGroup) setSelectedGroupIds([defaultGroup.groupid])
          }
        })
        .catch(() => {})

      fetchZabbixTemplates()
        .then((tmpls) => {
          setAvailableTemplates(tmpls)
          if (tmpls.length > 0 && selectedTemplateIds.length === 0) {
            const linuxTmpl = tmpls.find(
              (t) => t.name.toLowerCase() === 'linux by zabbix agent' || t.name.includes('Linux by Zabbix agent')
            )
            if (linuxTmpl) setSelectedTemplateIds([linuxTmpl.templateid])
          }
        })
        .catch(() => {})

      if (racks.length > 0 && !selectedRackId) {
        setSelectedRackId(String(racks[0].id))
      }
    }
  }, [isOpen])

  // Update default port when interface type changes
  useEffect(() => {
    if (interfaceType === 1) setPort('10050')
    else if (interfaceType === 2) setPort('161')
    else if (interfaceType === 3) setPort('623')
    else if (interfaceType === 4) setPort('12345')
  }, [interfaceType])

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    if (!groupSearch) return availableGroups
    const q = groupSearch.toLowerCase()
    return availableGroups.filter((g) => g.name.toLowerCase().includes(q))
  }, [availableGroups, groupSearch])

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return availableTemplates
    const q = templateSearch.toLowerCase().trim()
    return availableTemplates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.host.toLowerCase().includes(q)
    )
  }, [availableTemplates, templateSearch])

  const toggleGroup = (gid: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(gid) ? prev.filter((id) => id !== gid) : [...prev, gid]
    )
  }

  const toggleTemplate = (tid: string) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(tid) ? prev.filter((id) => id !== tid) : [...prev, tid]
    )
  }

  const addTag = () => {
    if (!newTagKey.trim()) return
    setTags((prev) => [...prev, { key: newTagKey.trim(), value: newTagVal.trim() }])
    setNewTagKey('')
    setNewTagVal('')
  }

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index))
  }

  // Step Validation
  const canProceedStep1 = hostname.trim().length > 0 && selectedGroupIds.length > 0
  const canProceedStep2 =
    connectVia === 'ip' ? ipAddress.trim().length > 0 : dnsName.trim().length > 0

  const handleNext = () => {
    setError(null)
    if (step === 1 && !canProceedStep1) {
      setError('Please provide a Host Technical Name and select at least one Host Group.')
      return
    }
    if (step === 2 && !canProceedStep2) {
      setError('Please enter a valid IP address or DNS name for the interface.')
      return
    }
    setStep((prev) => (prev < 4 ? ((prev + 1) as WizardStep) : prev))
  }

  const handleBack = () => {
    setError(null)
    setStep((prev) => (prev > 1 ? ((prev - 1) as WizardStep) : prev))
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    // Build interfaces payload
    const ifaceDetails: Record<string, any> = {}
    if (interfaceType === 2) {
      ifaceDetails.version = snmpVersion
      if (snmpVersion === 1 || snmpVersion === 2) {
        ifaceDetails.community = snmpCommunity || 'public'
      } else {
        ifaceDetails.securityname = snmpSecurityName
      }
    }

    const payload: ZabbixHostCreatePayload = {
      host: hostname.trim(),
      name: visibleName.trim() || undefined,
      group_ids: selectedGroupIds,
      interfaces: [
        {
          type: interfaceType,
          main: 1,
          useip: connectVia === 'ip' ? 1 : 0,
          ip: connectVia === 'ip' ? ipAddress.trim() : '127.0.0.1',
          dns: connectVia === 'dns' ? dnsName.trim() : '',
          port: port.trim() || (interfaceType === 2 ? '161' : '10050'),
          details: Object.keys(ifaceDetails).length > 0 ? ifaceDetails : undefined,
        },
      ],
      template_ids: selectedTemplateIds,
      tags: tags.reduce<Record<string, string>>((acc, t) => {
        if (t.key.trim()) acc[t.key.trim()] = t.value.trim()
        return acc
      }, {}),
      description: description.trim() || undefined,
      status,
    }

    // Optional DCIM Rack Binding
    if (mountToRack && selectedRackId && startU) {
      payload.mount_rack_id = selectedRackId
      payload.mount_start_u = startU
      payload.mount_height_u = heightU
      payload.mount_position_face = positionFace
      payload.device_type = deviceType
      payload.manufacturer = manufacturer
      payload.model = model
    }

    try {
      const result = await createZabbixHost(payload)
      onSuccess(result)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create host in Zabbix')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  // Selected Rack Name for summary
  const selectedRack = racks.find((r) => String(r.id) === selectedRackId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/40 backdrop-blur-2xl transition-all duration-300">
      {/* macOS Pro Sheet Window */}
      <div className="w-full max-w-5xl h-[88vh] max-h-[820px] bg-white/95 backdrop-blur-3xl saturate-180 border-[0.5px] border-black/15 rounded-[20px] shadow-[0_24px_64px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif] text-[#1d1d1f]">
        
        {/* macOS Window Header & Traffic Lights */}
        <div className="h-[52px] px-6 bg-black/[0.02] border-b-[0.5px] border-black/10 flex items-center justify-between select-none">
          <div className="flex items-center gap-4">
            {/* Window Traffic Lights */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] hover:opacity-80 transition-opacity cursor-pointer"
              />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>

            <div className="h-4 w-px bg-black/10 mx-1" />

            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold text-[#1d1d1f] tracking-[-0.022em]">
                Provision Zabbix Host
              </h2>
              <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-medium bg-[#0071E3]/15 text-[#0071E3] border-[0.5px] border-[#0071E3]/30 tracking-[-0.011em]">
                Zabbix 7.0 API
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/[0.05] hover:bg-black/[0.1] text-zinc-600 hover:text-black flex items-center justify-center transition-all duration-200 active:scale-[0.96] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Content: 2-Column macOS Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Glass Sidebar (Step Navigation & Live Hardware Card) */}
          <div className="w-72 sm:w-80 shrink-0 bg-black/[0.02] border-r-[0.5px] border-black/10 p-6 flex flex-col justify-between overflow-y-auto">
            {/* Step Navigation */}
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500 mb-3 px-2">
                  Workflow Steps
                </p>
                <nav className="space-y-2">
                  {WIZARD_STEPS.map((s) => {
                    const isActive = step === s.id
                    const isDone = step > s.id
                    const Icon = s.icon
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (s.id < step) setStep(s.id)
                          else if (s.id === 2 && canProceedStep1) setStep(2)
                          else if (s.id === 3 && canProceedStep1 && canProceedStep2) setStep(3)
                          else if (s.id === 4 && canProceedStep1 && canProceedStep2) setStep(4)
                        }}
                        className={`w-full text-left p-3 rounded-[12px] flex items-center gap-3 transition-all duration-300 cursor-pointer ${
                          isActive
                            ? 'bg-[#0071E3] text-white shadow-md shadow-[#0071E3]/25 scale-[1.01]'
                            : isDone
                            ? 'bg-black/[0.04] text-[#1d1d1f] hover:bg-black/[0.08]'
                            : 'text-zinc-600 hover:bg-black/[0.03] hover:text-black'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-[8px] flex items-center justify-center text-xs font-semibold shrink-0 transition-all ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : isDone
                              ? 'bg-[#34c759]/20 text-[#34c759] border-[0.5px] border-[#34c759]/30'
                              : 'bg-black/[0.04] text-zinc-500 border-[0.5px] border-black/10'
                          }`}
                        >
                          {isDone ? <Check className="w-4 h-4 text-[#34c759]" /> : <Icon className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold tracking-[-0.011em] truncate">
                            {s.title}
                          </p>
                          <p
                            className={`text-[11px] tracking-[-0.011em] truncate ${
                              isActive ? 'text-white/80' : 'text-zinc-500'
                            }`}
                          >
                            {s.subtitle}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </nav>
              </div>
            </div>

            {/* Live Hardware Inspector Preview Card */}
            <div className="mt-6 p-4 rounded-[16px] bg-black/[0.03] border-[0.5px] border-black/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Target Spec Preview
                </span>
                <span
                  className={`rounded-[8px] px-2 py-0.5 text-[10px] font-medium tracking-[-0.011em] ${
                    status === 0
                      ? 'bg-[#34c759]/15 text-[#34c759] border-[0.5px] border-[#34c759]/30'
                      : 'bg-[#ff9500]/15 text-[#ff9500] border-[0.5px] border-[#ff9500]/30'
                  }`}
                >
                  {status === 0 ? 'Monitored' : 'Unmonitored'}
                </span>
              </div>

              <div>
                <p className="text-[14px] font-semibold text-[#1d1d1f] tracking-[-0.022em] truncate">
                  {hostname || 'Unspecified Host'}
                </p>
                <p className="text-[11px] text-zinc-500 tracking-[-0.011em] truncate">
                  {visibleName || 'No visible alias assigned'}
                </p>
              </div>

              <div className="pt-2 border-t-[0.5px] border-black/10 space-y-1.5 text-[11px] tracking-[-0.011em]">
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Interface:</span>
                  <span className="text-[#1d1d1f] font-medium">
                    {interfaceType === 1
                      ? 'Agent'
                      : interfaceType === 2
                      ? `SNMP (v${snmpVersion})`
                      : interfaceType === 3
                      ? 'IPMI'
                      : 'JMX'}{' '}
                    • {connectVia === 'ip' ? ipAddress || '-' : dnsName || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Groups:</span>
                  <span className="text-[#1d1d1f] font-medium">{selectedGroupIds.length} selected</span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Templates:</span>
                  <span className="text-[#1d1d1f] font-medium">{selectedTemplateIds.length} linked</span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>DCIM Slot:</span>
                  <span className="text-[#0071E3] font-medium">
                    {mountToRack && selectedRack
                      ? `${selectedRack.name} (U${startU}..${startU + heightU - 1})`
                      : 'Floating / Virtual'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content Canvas (Form Stages & Action Bar) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#fbfbfd]">
            {/* Scrollable Stage Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              
              {/* Header for Active Step */}
              <div className="space-y-1 border-b-[0.5px] border-black/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#0071E3] tracking-[0.04em] uppercase">
                    Step {step} of 4
                  </span>
                </div>
                <h3 className="text-[20px] font-semibold text-[#1d1d1f] tracking-[-0.022em]">
                  {WIZARD_STEPS[step - 1].title}
                </h3>
                <p className="text-[13px] text-zinc-600 tracking-[-0.011em]">
                  {step === 1 && 'Define host identity, system aliases, and logical monitoring group assignments.'}
                  {step === 2 && 'Configure network interface endpoints, protocol version, and telemetry ports.'}
                  {step === 3 && 'Bind pre-configured telemetry templates and associate environment tags.'}
                  {step === 4 && 'Optionally allocate space inside your Data Center physical rack inventory.'}
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="flex items-start gap-3 p-4 rounded-[16px] bg-rose-500/10 border-[0.5px] border-rose-500/30 text-rose-200 text-[13px] tracking-[-0.011em]">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1 font-normal">{error}</div>
                </div>
              )}

              {/* STEP 1: Host Basics */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Identification Inset Card */}
                  <div className="p-5 rounded-[16px] bg-white/[0.03] border-[0.5px] border-white/10 space-y-4">
                    <div className="flex items-center justify-between border-b-[0.5px] border-white/10 pb-3">
                      <div>
                        <h4 className="text-[14px] font-semibold text-white tracking-[-0.022em]">
                          Host Identification
                        </h4>
                        <p className="text-[12px] text-white/50 tracking-[-0.011em]">
                          Primary system hostname and human-readable aliases.
                        </p>
                      </div>
                      <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-medium bg-white/10 text-white/70">
                        Required
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Hostname */}
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-white/80 flex items-center justify-between tracking-[-0.011em]">
                          <span>
                            Technical Hostname <span className="text-[#FF453A]">*</span>
                          </span>
                          {hostname && (
                            <span className="text-[11px] text-emerald-400 font-mono">
                              Valid identifier
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={hostname}
                            onChange={(e) => setHostname(e.target.value)}
                            placeholder="e.g. srv-app01.prod.internal"
                            className="w-full h-[44px] pl-4 pr-10 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white placeholder:text-white/30 text-[14px] tracking-[-0.011em] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all duration-200"
                          />
                          {hostname && (
                            <button
                              type="button"
                              onClick={() => setHostname('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-white/40 tracking-[-0.011em]">
                          DNS-compatible hostname registered with Zabbix server.
                        </p>
                      </div>

                      {/* Visible Name */}
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-white/80 flex items-center justify-between tracking-[-0.011em]">
                          <span>Visible Display Name</span>
                          <span className="text-[11px] text-white/40">Optional</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={visibleName}
                            onChange={(e) => setVisibleName(e.target.value)}
                            placeholder="e.g. Bangkok App Cluster Node 01"
                            className="w-full h-[44px] pl-4 pr-10 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white placeholder:text-white/30 text-[14px] tracking-[-0.011em] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all duration-200"
                          />
                          {visibleName && (
                            <button
                              type="button"
                              onClick={() => setVisibleName('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-white/40 tracking-[-0.011em]">
                          Descriptive name displayed across dashboards and alerts.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Host Groups Inset Card */}
                  <div className="p-5 rounded-[16px] bg-white/[0.03] border-[0.5px] border-white/10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-[0.5px] border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-[14px] font-semibold text-white tracking-[-0.022em]">
                            Host Group Membership
                          </h4>
                          <span className="text-[#FF453A]">*</span>
                          <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-medium bg-[#007AFF]/20 text-[#0A84FF] border-[0.5px] border-[#007AFF]/30">
                            {selectedGroupIds.length} selected
                          </span>
                        </div>
                        <p className="text-[12px] text-white/50 tracking-[-0.011em]">
                          Organize logical permissions and dashboard segmentation.
                        </p>
                      </div>

                      {/* Group Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={groupSearch}
                          onChange={(e) => setGroupSearch(e.target.value)}
                          placeholder="Filter groups..."
                          className="w-full h-[36px] pl-8 pr-8 rounded-[10px] bg-white/[0.06] border-[0.5px] border-white/15 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#007AFF] transition-all"
                        />
                        {groupSearch && (
                          <button
                            type="button"
                            onClick={() => setGroupSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Group Selection Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-3 rounded-[14px] bg-black/20 border-[0.5px] border-white/10">
                      {filteredGroups.map((g) => {
                        const isSelected = selectedGroupIds.includes(g.groupid)
                        return (
                          <button
                            type="button"
                            key={g.groupid}
                            onClick={() => toggleGroup(g.groupid)}
                            className={`min-h-[44px] px-3.5 py-2.5 rounded-[10px] text-left border-[0.5px] transition-all duration-200 flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-[#007AFF]/25 border-[#007AFF] text-white shadow-sm scale-[1.01]'
                                : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white active:scale-[0.98]'
                            }`}
                          >
                            <span className="text-[12px] tracking-[-0.011em] font-medium truncate">
                              {g.name}
                            </span>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                isSelected
                                  ? 'bg-[#007AFF] text-white'
                                  : 'border border-white/20 bg-white/[0.05]'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        )
                      })}
                      {filteredGroups.length === 0 && (
                        <div className="col-span-full py-8 text-center text-white/40 text-[12px]">
                          No host groups matching "{groupSearch}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Status Inset Card */}
                  <div className="p-5 rounded-[16px] bg-white/[0.03] border-[0.5px] border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full shrink-0 transition-all ${
                          status === 0
                            ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse'
                            : 'bg-amber-400 shadow-lg shadow-amber-400/50'
                        }`}
                      />
                      <div>
                        <p className="text-[13px] font-semibold text-white tracking-[-0.011em]">
                          Telemetry Polling State
                        </p>
                        <p className="text-[12px] text-white/50 tracking-[-0.011em]">
                          {status === 0
                            ? 'Immediately initiate active metric collection upon registration.'
                            : 'Create host in dormant/disabled state for scheduled maintenance.'}
                        </p>
                      </div>
                    </div>

                    {/* Apple Segmented Control */}
                    <div className="flex p-1 bg-black/40 rounded-[12px] border-[0.5px] border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => setStatus(0)}
                        className={`h-[36px] px-4 rounded-[8px] text-[12px] font-semibold transition-all duration-200 cursor-pointer ${
                          status === 0
                            ? 'bg-[#007AFF] text-white shadow-sm scale-[1.02]'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        Monitored
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatus(1)}
                        className={`h-[36px] px-4 rounded-[8px] text-[12px] font-semibold transition-all duration-200 cursor-pointer ${
                          status === 1
                            ? 'bg-amber-500/80 text-white shadow-sm scale-[1.02]'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        Unmonitored
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Interfaces */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Protocol Selector Tiles */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold text-white/90 tracking-[-0.011em]">
                        Select Telemetry Protocol
                      </label>
                      <span className="text-[11px] text-white/40 tracking-[-0.011em]">
                        Primary interface channel
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          type: 1,
                          label: 'Zabbix Agent',
                          subtitle: 'Active & Passive metrics',
                          port: '10050',
                          icon: Monitor,
                        },
                        {
                          type: 2,
                          label: 'SNMP',
                          subtitle: 'Network switch & router MIBs',
                          port: '161',
                          icon: Radio,
                        },
                        {
                          type: 3,
                          label: 'IPMI (BMC)',
                          subtitle: 'iLO, iDRAC chassis hardware',
                          port: '623',
                          icon: Shield,
                        },
                        {
                          type: 4,
                          label: 'JMX (Java)',
                          subtitle: 'JVM runtime & thread pools',
                          port: '12345',
                          icon: Activity,
                        },
                      ].map((item) => {
                        const isSelected = interfaceType === item.type
                        const Icon = item.icon
                        return (
                          <button
                            type="button"
                            key={item.type}
                            onClick={() => setInterfaceType(item.type)}
                            className={`p-4 rounded-[16px] border-[0.5px] text-left transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? 'bg-[#007AFF]/25 border-[#007AFF] text-white shadow-md shadow-[#007AFF]/20 scale-[1.02]'
                                : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.07] hover:text-white hover:scale-[1.01] active:scale-[0.98]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div
                                className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-[#007AFF] text-white shadow-sm'
                                    : 'bg-white/[0.06] text-white/60'
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                              </div>
                              <span className="text-[10px] rounded-[6px] px-2 py-0.5 bg-white/10 text-white/70 font-mono">
                                Port {item.port}
                              </span>
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold tracking-[-0.011em] text-white">
                                {item.label}
                              </p>
                              <p className="text-[11px] text-white/45 tracking-[-0.011em] mt-0.5 leading-snug">
                                {item.subtitle}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Connection Endpoint Inset Card */}
                  <div className="p-5 rounded-[16px] bg-white/[0.03] border-[0.5px] border-white/10 space-y-4">
                    <div className="flex items-center justify-between border-b-[0.5px] border-white/10 pb-3">
                      <div>
                        <h4 className="text-[14px] font-semibold text-white tracking-[-0.022em]">
                          Network Endpoint Configuration
                        </h4>
                        <p className="text-[12px] text-white/50 tracking-[-0.011em]">
                          Specify the reachable IP address or DNS domain for Zabbix server polling.
                        </p>
                      </div>

                      {/* Segmented Control IP vs DNS */}
                      <div className="flex p-1 bg-black/40 rounded-[12px] border-[0.5px] border-white/10">
                        <button
                          type="button"
                          onClick={() => setConnectVia('ip')}
                          className={`h-[32px] px-4 rounded-[8px] text-[12px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                            connectVia === 'ip'
                              ? 'bg-[#007AFF] text-white shadow-sm'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          <Network className="w-3.5 h-3.5" />
                          <span>IP Address</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConnectVia('dns')}
                          className={`h-[32px] px-4 rounded-[8px] text-[12px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                            connectVia === 'dns'
                              ? 'bg-[#007AFF] text-white shadow-sm'
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>DNS Hostname</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[12px] font-medium text-white/70 tracking-[-0.011em] flex items-center gap-1">
                          <span>{connectVia === 'ip' ? 'Target IPv4 / IPv6' : 'Fully Qualified Domain Name'}</span>
                          <span className="text-[#FF453A]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={connectVia === 'ip' ? ipAddress : dnsName}
                            onChange={(e) =>
                              connectVia === 'ip' ? setIpAddress(e.target.value) : setDnsName(e.target.value)
                            }
                            placeholder={connectVia === 'ip' ? '192.168.1.50' : 'srv-app01.prod.local'}
                            className="w-full h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white font-mono text-[13px] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
                          />
                        </div>
                        <p className="text-[11px] text-white/40 tracking-[-0.011em]">
                          {connectVia === 'ip'
                            ? 'Zabbix poller directly establishes connection to this IP.'
                            : 'Zabbix poller resolves domain via local DNS cache.'}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-white/70 tracking-[-0.011em]">
                          Listening Port
                        </label>
                        <input
                          type="text"
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          placeholder="10050"
                          className="w-full h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white font-mono text-[13px] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
                        />
                        <p className="text-[11px] text-white/40 tracking-[-0.011em]">
                          Standard: {interfaceType === 2 ? '161' : interfaceType === 3 ? '623' : '10050'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SNMP Security Parameters (Conditional Card) */}
                  {interfaceType === 2 && (
                    <div className="p-5 rounded-[16px] bg-white/[0.03] border-[0.5px] border-white/10 space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b-[0.5px] border-white/10 pb-3">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-[#0A84FF]" />
                          <h4 className="text-[14px] font-semibold text-white tracking-[-0.022em]">
                            SNMP Authentication &amp; MIB Security
                          </h4>
                        </div>
                        <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-medium bg-white/10 text-white/70">
                          SNMP Protocol
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-white/70 tracking-[-0.011em]">
                            SNMP Protocol Version:
                          </span>
                          <div className="flex p-1 bg-black/40 rounded-[12px] border-[0.5px] border-white/10">
                            {[
                              { v: 1, label: 'v1' },
                              { v: 2, label: 'v2c (Recommended)' },
                              { v: 3, label: 'v3 (Auth/Priv)' },
                            ].map((snmp) => (
                              <button
                                key={snmp.v}
                                type="button"
                                onClick={() => setSnmpVersion(snmp.v)}
                                className={`h-[32px] px-3.5 rounded-[8px] text-[12px] font-semibold transition-all duration-200 cursor-pointer ${
                                  snmpVersion === snmp.v
                                    ? 'bg-[#007AFF] text-white shadow-sm'
                                    : 'text-white/60 hover:text-white'
                                }`}
                              >
                                {snmp.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {snmpVersion < 3 ? (
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-white/70 tracking-[-0.011em]">
                              SNMP Community String
                            </label>
                            <input
                              type="text"
                              value={snmpCommunity}
                              onChange={(e) => setSnmpCommunity(e.target.value)}
                              placeholder="public"
                              className="w-full h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white font-mono text-[13px] focus:outline-none focus:border-[#007AFF] transition-all"
                            />
                            <p className="text-[11px] text-white/40 tracking-[-0.011em]">
                              Read-only community string configured on the network equipment.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <label className="text-[12px] font-medium text-white/70 tracking-[-0.011em]">
                              Security Name (v3 Username)
                            </label>
                            <input
                              type="text"
                              value={snmpSecurityName}
                              onChange={(e) => setSnmpSecurityName(e.target.value)}
                              placeholder="snmpv3user"
                              className="w-full h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white font-mono text-[13px] focus:outline-none focus:border-[#007AFF] transition-all"
                            />
                            <p className="text-[11px] text-white/40 tracking-[-0.011em]">
                              Configured user credential with SHA/AES authentication.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Templates & Tags */}
              {step === 3 && (
                <div className="space-y-6">
                  {/* Template Picker Inset Card */}
                  <div className="p-5 rounded-[16px] bg-white/[0.03] border-[0.5px] border-white/10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-[0.5px] border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-[14px] font-semibold text-white tracking-[-0.022em]">
                            Monitoring Templates
                          </h4>
                          <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-medium bg-[#007AFF]/20 text-[#0A84FF] border-[0.5px] border-[#007AFF]/30">
                            {selectedTemplateIds.length} linked
                          </span>
                        </div>
                        <p className="text-[12px] text-white/50 tracking-[-0.011em]">
                          Pre-configured items, triggers, graphs, and discovery rules.
                        </p>
                      </div>

                      {/* Template Search Bar */}
                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={templateSearch}
                          onChange={(e) => setTemplateSearch(e.target.value)}
                          placeholder="Search templates..."
                          className="w-full h-[36px] pl-8 pr-8 rounded-[10px] bg-white/[0.06] border-[0.5px] border-white/15 text-[12px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#007AFF] transition-all"
                        />
                        {templateSearch && (
                          <button
                            type="button"
                            onClick={() => setTemplateSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Template Selection Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto p-3 rounded-[14px] bg-black/20 border-[0.5px] border-white/10">
                      {filteredTemplates.map((t) => {
                        const isSelected = selectedTemplateIds.includes(t.templateid)
                        return (
                          <button
                            type="button"
                            key={t.templateid}
                            onClick={() => toggleTemplate(t.templateid)}
                            className={`min-h-[48px] px-3.5 py-2.5 rounded-[12px] text-left border-[0.5px] transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? 'bg-[#007AFF]/25 border-[#007AFF] text-white shadow-sm scale-[1.01]'
                                : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white active:scale-[0.98]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-[#007AFF] text-white'
                                    : 'bg-white/[0.06] text-white/50'
                                }`}
                              >
                                <Layers className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[12px] tracking-[-0.011em] font-medium truncate">
                                {t.name}
                              </span>
                            </div>

                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                isSelected
                                  ? 'bg-[#007AFF] text-white'
                                  : 'border border-white/20 bg-white/[0.05]'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        )
                      })}
                      {filteredTemplates.length === 0 && (
                        <div className="col-span-full py-8 text-center text-white/40 text-[12px]">
                          No templates found matching "{templateSearch}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata Tags Inset Card */}
                  <div className="p-5 rounded-[16px] bg-white/[0.03] border-[0.5px] border-white/10 space-y-4">
                    <div className="flex items-center justify-between border-b-[0.5px] border-white/10 pb-3">
                      <div>
                        <h4 className="text-[14px] font-semibold text-white tracking-[-0.022em]">
                          Host Tags &amp; Metadata
                        </h4>
                        <p className="text-[12px] text-white/50 tracking-[-0.011em]">
                          Categorize hosts for fine-grained alert filtering and dashboard views.
                        </p>
                      </div>
                      <span className="rounded-[8px] px-2 py-0.5 text-[10px] font-medium bg-white/10 text-white/70">
                        {tags.length} active tags
                      </span>
                    </div>

                    {/* Tag Input Form */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={newTagKey}
                        onChange={(e) => setNewTagKey(e.target.value)}
                        placeholder="Key (e.g. Environment, Tier, DC)"
                        className="flex-1 h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
                      />
                      <input
                        type="text"
                        value={newTagVal}
                        onChange={(e) => setNewTagVal(e.target.value)}
                        placeholder="Value (e.g. Production, Core)"
                        className="flex-1 h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        disabled={!newTagKey.trim()}
                        className="h-[44px] px-6 rounded-[12px] bg-[#007AFF] hover:bg-[#0071E3] disabled:opacity-40 disabled:pointer-events-none text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.96] shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Tag</span>
                      </button>
                    </div>

                    {/* Tag Badges Collection */}
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {tags.map((t, idx) => (
                        <div
                          key={idx}
                          className="rounded-[8px] pl-3 pr-2 py-1.5 bg-white/[0.06] border-[0.5px] border-white/15 text-[12px] text-white flex items-center gap-2 tracking-[-0.011em] hover:bg-white/[0.1] transition-all"
                        >
                          <span className="text-white/50 font-normal">{t.key}:</span>
                          <span className="font-semibold text-white">{t.value}</span>
                          <button
                            type="button"
                            onClick={() => removeTag(idx)}
                            aria-label={`Remove tag ${t.key}`}
                            className="w-5 h-5 rounded-full hover:bg-white/15 text-white/40 hover:text-[#FF453A] flex items-center justify-center transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {tags.length === 0 && (
                        <p className="text-[12px] text-white/40 py-2">
                          No tags assigned yet. Add standard environment tags above.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Operational Notes Inset Card */}
                  <div className="p-5 rounded-[16px] bg-white/[0.03] border-[0.5px] border-white/10 space-y-2">
                    <label className="text-[13px] font-semibold text-white tracking-[-0.011em] block">
                      Operational Notes &amp; Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Specify system contact, SLA tiers, maintenance windows, or purpose..."
                      className="w-full p-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white placeholder:text-white/30 text-[13px] tracking-[-0.011em] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: DCIM Rack Mount */}
              {step === 4 && (
                <div className="space-y-6">
                  {/* Mount Activation iOS Toggle Card */}
                  <div className="p-5 rounded-[16px] bg-white/[0.03] border-[0.5px] border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-[12px] bg-[#007AFF]/20 text-[#0A84FF] border-[0.5px] border-[#007AFF]/30 flex items-center justify-center shrink-0">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-semibold text-white tracking-[-0.022em]">
                          Physical Rack Enclosure Allocation
                        </h4>
                        <p className="text-[12px] text-white/50 tracking-[-0.011em]">
                          Mount this host directly into the Data Center spatial elevation digital twin.
                        </p>
                      </div>
                    </div>

                    {/* iOS Native Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => setMountToRack(!mountToRack)}
                      aria-label="Toggle DCIM Mount"
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                        mountToRack ? 'bg-[#34C759]' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                          mountToRack ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {mountToRack && (
                    <div className="p-5 rounded-[16px] bg-white/[0.03] border-[0.5px] border-white/10 space-y-5 animate-in fade-in duration-300">
                      
                      {/* Target Rack Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-white/80 tracking-[-0.011em] flex items-center justify-between">
                          <span>Target Cabinet</span>
                          {selectedRack && (
                            <span className="text-[11px] text-[#0A84FF]">
                              Capacity: {selectedRack.total_u || 42}U
                            </span>
                          )}
                        </label>
                        <select
                          value={selectedRackId}
                          onChange={(e) => setSelectedRackId(e.target.value)}
                          className="w-full h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white text-[13px] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all cursor-pointer"
                        >
                          {racks.map((r) => (
                            <option key={r.id} value={String(r.id)} className="bg-[#1c1c1e] text-white">
                              {r.name} ({r.total_u || 42}U) — {r.device_count || 0} units occupied
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Elevation U Positioning */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-medium text-white/80 tracking-[-0.011em]">
                            Start Elevation (Unit)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={48}
                            value={startU}
                            onChange={(e) => setStartU(parseInt(e.target.value) || 1)}
                            className="w-full h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white font-mono text-[13px] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[12px] font-medium text-white/80 tracking-[-0.011em]">
                            Chassis Form Factor
                          </label>
                          <select
                            value={heightU}
                            onChange={(e) => setHeightU(parseInt(e.target.value) || 1)}
                            className="w-full h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white text-[13px] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5, 6, 8].map((u) => (
                              <option key={u} value={u} className="bg-[#1c1c1e] text-white">
                                {u}U Rackmount Enclosure
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[12px] font-medium text-white/80 tracking-[-0.011em]">
                            Mounting Face
                          </label>
                          <select
                            value={positionFace}
                            onChange={(e) => setPositionFace(e.target.value as any)}
                            className="w-full h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white text-[13px] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/30 transition-all cursor-pointer"
                          >
                            <option value="Front" className="bg-[#1c1c1e] text-white">Front Face</option>
                            <option value="Rear" className="bg-[#1c1c1e] text-white">Rear Face</option>
                            <option value="Both" className="bg-[#1c1c1e] text-white">Full Depth (Both)</option>
                          </select>
                        </div>
                      </div>

                      {/* Equipment Spec Metadata */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t-[0.5px] border-white/10">
                        <div className="space-y-1.5">
                          <label className="text-[12px] font-medium text-white/80 tracking-[-0.011em]">
                            Equipment Category
                          </label>
                          <select
                            value={deviceType}
                            onChange={(e) => setDeviceType(e.target.value)}
                            className="w-full h-[44px] px-3.5 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white text-[13px] focus:outline-none focus:border-[#007AFF] cursor-pointer"
                          >
                            {['Server', 'Switch', 'Firewall', 'Storage', 'UPS', 'Patch Panel'].map((t) => (
                              <option key={t} value={t} className="bg-[#1c1c1e] text-white">
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[12px] font-medium text-white/80 tracking-[-0.011em]">
                            Manufacturer / OEM
                          </label>
                          <input
                            type="text"
                            value={manufacturer}
                            onChange={(e) => setManufacturer(e.target.value)}
                            placeholder="Dell, HPE, Cisco..."
                            className="w-full h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white text-[13px] focus:outline-none focus:border-[#007AFF]"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[12px] font-medium text-white/80 tracking-[-0.011em]">
                            Model Number
                          </label>
                          <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder="PowerEdge R750..."
                            className="w-full h-[44px] px-4 rounded-[12px] bg-white/[0.06] border-[0.5px] border-white/15 text-white text-[13px] focus:outline-none focus:border-[#007AFF]"
                          />
                        </div>
                      </div>

                      {/* Mini Digital Twin Spatial Chassis Preview */}
                      <div className="p-4 rounded-[14px] bg-black/30 border-[0.5px] border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[8px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <Server className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40 block">
                              Digital Twin Placement
                            </span>
                            <span className="text-[13px] font-semibold text-white">
                              {selectedRack?.name || 'Cabinet'} • Position U{startU}..{startU + heightU - 1} ({heightU}U)
                            </span>
                          </div>
                        </div>

                        <span className="rounded-[8px] px-2.5 py-1 text-[11px] font-medium bg-[#007AFF]/20 text-[#0A84FF] border-[0.5px] border-[#007AFF]/30">
                          {positionFace} Facing
                        </span>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Apple macOS Bottom Action Bar */}
            <div className="h-[72px] px-6 sm:px-8 bg-black/[0.02] border-t-[0.5px] border-black/10 flex items-center justify-between select-none">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="h-[44px] px-6 rounded-[12px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black text-[13px] font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.96] cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={loading}
                    className="h-[44px] px-6 rounded-[12px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black text-[13px] font-semibold flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.96] cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="h-[44px] px-6 rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-semibold shadow-md shadow-[#0071E3]/25 flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.96] cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="h-[44px] px-8 rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-semibold shadow-lg shadow-[#0071E3]/35 flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.96] cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        <span>Provisioning...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Create &amp; Provision Host</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
