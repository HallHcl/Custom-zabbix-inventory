import { useState, useEffect, useMemo } from 'react'
import {
  X,
  Server,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Network,
  Cpu,
  Layers,
  Tag,
  Search,
  Info,
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
            // Default select Linux servers or first group
            const defaultGroup = groups.find((g) => g.name.toLowerCase().includes('linux') || g.name.toLowerCase().includes('server')) || groups[0]
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#1a2127] border border-[#394650] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#394650] bg-[#20282f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#244158] border border-[#7aa5d2] flex items-center justify-center text-[#7aa5d2]">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-sans tracking-wide">
                  ADD NEW ZABBIX HOST
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#34424b] text-[#8bd7d1] border border-[#50626f]">
                  Zabbix 7.0 API
                </span>
              </div>
              <p className="text-xs text-[#85a6b1] font-mono">
                Provision monitoring agent &amp; slot into Data Center inventory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#85a6b1] hover:text-white p-1.5 rounded hover:bg-[#34424b] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Navigation Bar */}
        <div className="flex items-center justify-between px-8 py-3 bg-[#161c21] border-b border-[#394650] text-xs font-mono select-none">
          {[
            { id: 1, label: 'Host Basics' },
            { id: 2, label: 'Interfaces' },
            { id: 3, label: 'Templates & Tags' },
            { id: 4, label: 'DCIM Rack Binding' },
          ].map((s) => {
            const isActive = step === s.id
            const isDone = step > s.id
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-600 text-white shadow-emerald-500/20 shadow-md'
                      : isActive
                      ? 'bg-[#7aa5d2] text-[#1a2127] ring-2 ring-[#7aa5d2]/40 font-black'
                      : 'bg-[#273139] text-[#85a6b1] border border-[#394650]'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span
                  className={`${
                    isActive
                      ? 'text-white font-semibold'
                      : isDone
                      ? 'text-emerald-400'
                      : 'text-[#85a6b1]'
                  }`}
                >
                  {s.label}
                </span>
                {s.id < 4 && <div className="w-8 h-px bg-[#394650] mx-2 hidden sm:block" />}
              </div>
            )
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-rose-950/50 border border-rose-700/50 text-rose-300 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* STEP 1: Host Basics */}
          {step === 1 && (
            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[#85a6b1] flex items-center gap-1 font-semibold">
                    Host Technical Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={hostname}
                    onChange={(e) => setHostname(e.target.value)}
                    placeholder="e.g. srv-app01.prod.local"
                    className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2] placeholder:text-[#50626f]"
                  />
                  <p className="text-[11px] text-[#85a6b1]">
                    Unique technical identifier for Zabbix server.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#85a6b1] font-semibold">Visible Name (Optional)</label>
                  <input
                    type="text"
                    value={visibleName}
                    onChange={(e) => setVisibleName(e.target.value)}
                    placeholder="e.g. Web App Server 01 (Bangkok DC)"
                    className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2] placeholder:text-[#50626f]"
                  />
                  <p className="text-[11px] text-[#85a6b1]">
                    Friendly display name shown in dashboards.
                  </p>
                </div>
              </div>

              {/* Host Groups Multi-Select */}
              <div className="space-y-2 pt-2 border-t border-[#394650]">
                <div className="flex items-center justify-between">
                  <label className="text-[#85a6b1] font-semibold flex items-center gap-1">
                    Host Groups <span className="text-rose-400">*</span>
                    <span className="text-[#caedde] text-[11px]">
                      ({selectedGroupIds.length} selected)
                    </span>
                  </label>
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 text-[#85a6b1] absolute left-2 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Filter groups..."
                      className="w-full pl-7 pr-2 py-1 bg-[#273139] border border-[#394650] rounded text-[11px] text-white focus:outline-none focus:border-[#7aa5d2]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto p-2 bg-[#20282f] border border-[#394650] rounded">
                  {filteredGroups.map((g) => {
                    const isSelected = selectedGroupIds.includes(g.groupid)
                    return (
                      <button
                        type="button"
                        key={g.groupid}
                        onClick={() => toggleGroup(g.groupid)}
                        className={`flex items-center justify-between p-2 rounded text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#244158] border-[#7aa5d2] text-white'
                            : 'bg-[#273139] border-[#394650] text-[#caedde] hover:border-[#50626f]'
                        }`}
                      >
                        <span className="truncate pr-1">{g.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#7aa5d2] shrink-0" />}
                      </button>
                    )
                  })}
                  {filteredGroups.length === 0 && (
                    <div className="col-span-full py-4 text-center text-[#85a6b1]">
                      No host groups match "{groupSearch}"
                    </div>
                  )}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-[#20282f] border border-[#394650] rounded">
                <div>
                  <span className="font-semibold text-white">Monitoring Status</span>
                  <p className="text-[11px] text-[#85a6b1]">
                    Enable or disable immediate telemetry polling upon creation.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus(0)}
                    className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                      status === 0
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-[#273139] text-[#85a6b1]'
                    }`}
                  >
                    Monitored
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(1)}
                    className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                      status === 1
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-[#273139] text-[#85a6b1]'
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
            <div className="space-y-4 font-mono text-xs">
              {/* Interface Type Selector */}
              <div>
                <label className="text-[#85a6b1] font-semibold block mb-2">
                  Select Interface Protocol
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { type: 1, label: 'Zabbix Agent', port: '10050', icon: Server },
                    { type: 2, label: 'SNMP', port: '161', icon: Network },
                    { type: 3, label: 'IPMI', port: '623', icon: Cpu },
                    { type: 4, label: 'JMX', port: '12345', icon: Layers },
                  ].map((proto) => {
                    const isSelected = interfaceType === proto.type
                    const Icon = proto.icon
                    return (
                      <button
                        type="button"
                        key={proto.type}
                        onClick={() => setInterfaceType(proto.type)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#244158] border-[#7aa5d2] text-white shadow-md'
                            : 'bg-[#20282f] border-[#394650] text-[#85a6b1] hover:text-[#caedde] hover:border-[#50626f]'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-[#7aa5d2]' : ''}`} />
                        <span className="font-bold">{proto.label}</span>
                        <span className="text-[10px] text-[#85a6b1]">Port {proto.port}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Connection Mode (IP vs DNS) */}
              <div className="p-4 bg-[#20282f] border border-[#394650] rounded space-y-3">
                <div className="flex items-center gap-4 border-b border-[#394650] pb-2">
                  <span className="text-[#85a6b1] font-semibold">Connect To:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-white">
                    <input
                      type="radio"
                      name="connectVia"
                      checked={connectVia === 'ip'}
                      onChange={() => setConnectVia('ip')}
                      className="accent-[#7aa5d2]"
                    />
                    <span>IP Address</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-white">
                    <input
                      type="radio"
                      name="connectVia"
                      checked={connectVia === 'dns'}
                      onChange={() => setConnectVia('dns')}
                      className="accent-[#7aa5d2]"
                    />
                    <span>DNS Name</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[#85a6b1] flex items-center gap-1">
                      {connectVia === 'ip' ? 'IP Address' : 'DNS Name'}
                      <span className="text-rose-400">*</span>
                    </label>
                    {connectVia === 'ip' ? (
                      <input
                        type="text"
                        value={ipAddress}
                        onChange={(e) => setIpAddress(e.target.value)}
                        placeholder="192.168.1.50"
                        className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                      />
                    ) : (
                      <input
                        type="text"
                        value={dnsName}
                        onChange={(e) => setDnsName(e.target.value)}
                        placeholder="host.datacenter.internal"
                        className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                      />
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#85a6b1]">Port</label>
                    <input
                      type="text"
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      placeholder="10050"
                      className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                    />
                  </div>
                </div>

                {/* SNMP Details if SNMP selected */}
                {interfaceType === 2 && (
                  <div className="pt-3 border-t border-[#394650] space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[#85a6b1] font-semibold">SNMP Version:</span>
                      {[
                        { v: 1, label: 'SNMPv1' },
                        { v: 2, label: 'SNMPv2c' },
                        { v: 3, label: 'SNMPv3' },
                      ].map((item) => (
                        <button
                          type="button"
                          key={item.v}
                          onClick={() => setSnmpVersion(item.v)}
                          className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                            snmpVersion === item.v
                              ? 'bg-[#244158] border border-[#7aa5d2] text-white font-bold'
                              : 'bg-[#273139] border border-[#394650] text-[#85a6b1]'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {snmpVersion !== 3 ? (
                      <div className="space-y-1">
                        <label className="text-[#85a6b1]">SNMP Community String</label>
                        <input
                          type="text"
                          value={snmpCommunity}
                          onChange={(e) => setSnmpCommunity(e.target.value)}
                          placeholder="public"
                          className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[#85a6b1]">Security Name / User</label>
                        <input
                          type="text"
                          value={snmpSecurityName}
                          onChange={(e) => setSnmpSecurityName(e.target.value)}
                          placeholder="e.g. snmpuser"
                          className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Templates & Tags */}
          {step === 3 && (
            <div className="space-y-4 font-mono text-xs">
              {/* Templates Multi-select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[#85a6b1] font-semibold flex items-center gap-1">
                    Link Templates
                    <span className="text-[#caedde] text-[11px]">
                      ({selectedTemplateIds.length} linked)
                    </span>
                  </label>
                  <div className="relative w-56">
                    <Search className="w-3.5 h-3.5 text-[#85a6b1] absolute left-2 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      placeholder="Search OS, SNMP, DB..."
                      className="w-full pl-7 pr-2 py-1 bg-[#273139] border border-[#394650] rounded text-[11px] text-white focus:outline-none focus:border-[#7aa5d2]"
                    />
                  </div>
                </div>

                {/* Selected Template Badges */}
                {selectedTemplateIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-[#161c21] border border-[#394650] rounded">
                    {selectedTemplateIds.map((tid) => {
                      const tmpl = availableTemplates.find((t) => t.templateid === tid)
                      return (
                        <span
                          key={tid}
                          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#244158] border border-[#7aa5d2] text-white text-[11px]"
                        >
                          <span className="truncate max-w-[220px]">{tmpl ? tmpl.name : tid}</span>
                          <button
                            type="button"
                            onClick={() => toggleTemplate(tid)}
                            className="text-[#85a6b1] hover:text-rose-400 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Quick Add Suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-[#85a6b1] font-semibold">Quick Add:</span>
                  {[
                    'Linux by Zabbix agent',
                    'Windows by Zabbix agent',
                    'Cisco IOS by SNMP',
                    'Generic SNMP',
                    'ICMP Ping',
                  ].map((presetName) => {
                    const match = availableTemplates.find(
                      (t) => t.name.toLowerCase() === presetName.toLowerCase()
                    )
                    if (!match) return null
                    const isSelected = selectedTemplateIds.includes(match.templateid)
                    return (
                      <button
                        key={match.templateid}
                        type="button"
                        onClick={() => toggleTemplate(match.templateid)}
                        className={`px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950 border-emerald-600 text-emerald-300 font-bold'
                            : 'bg-[#20282f] border-[#394650] text-[#85a6b1] hover:text-white hover:border-[#7aa5d2]'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {presetName}
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-2 bg-[#20282f] border border-[#394650] rounded">
                  {filteredTemplates.map((tmpl) => {
                    const isSelected = selectedTemplateIds.includes(tmpl.templateid)
                    return (
                      <button
                        type="button"
                        key={tmpl.templateid}
                        onClick={() => toggleTemplate(tmpl.templateid)}
                        className={`flex items-center justify-between p-2 rounded text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#244158] border-[#7aa5d2] text-white'
                            : 'bg-[#273139] border-[#394650] text-[#caedde] hover:border-[#50626f]'
                        }`}
                      >
                        <span className="truncate pr-2">{tmpl.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#7aa5d2] shrink-0" />}
                      </button>
                    )
                  })}
                  {filteredTemplates.length === 0 && (
                    <div className="col-span-full py-4 text-center text-[#85a6b1]">
                      No templates match "{templateSearch}"
                      <button
                        type="button"
                        onClick={() => setTemplateSearch('')}
                        className="block mx-auto mt-1 text-[#7aa5d2] underline cursor-pointer text-[11px]"
                      >
                        Clear search
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Section */}
              <div className="space-y-2 pt-2 border-t border-[#394650]">
                <label className="text-[#85a6b1] font-semibold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  Custom Host Tags
                </label>

                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#20282f] border border-[#394650] text-white text-[11px]"
                    >
                      <span className="text-[#85a6b1]">{t.key}:</span>
                      <span>{t.value}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(idx)}
                        className="text-[#85a6b1] hover:text-rose-400 cursor-pointer ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagKey}
                    onChange={(e) => setNewTagKey(e.target.value)}
                    placeholder="Tag Name (e.g. Owner)"
                    className="flex-1 px-3 py-1.5 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                  />
                  <input
                    type="text"
                    value={newTagVal}
                    onChange={(e) => setNewTagVal(e.target.value)}
                    placeholder="Tag Value (e.g. NOC-Alpha)"
                    className="flex-1 px-3 py-1.5 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#34424b] hover:bg-[#435561] border border-[#50626f] text-white rounded cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1 pt-2 border-t border-[#394650]">
                <label className="text-[#85a6b1] font-semibold">Notes / Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Operational notes, maintainer contact, purpose..."
                  className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                />
              </div>
            </div>
          )}

          {/* STEP 4: DCIM Rack Binding (Optional) */}
          {step === 4 && (
            <div className="space-y-4 font-mono text-xs">
              {/* Optional Mount Toggle */}
              <div className="p-4 rounded-lg bg-[#20282f] border border-[#394650] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      Mount to DCIM Rack Elevation
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#34424b] text-[#caedde]">
                      Optional Step
                    </span>
                  </div>
                  <p className="text-xs text-[#85a6b1] mt-0.5">
                    Attach this device physically to a rack cabinet and U-slot right now.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mountToRack}
                    onChange={(e) => setMountToRack(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#34424b] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {mountToRack ? (
                <div className="p-4 rounded-lg bg-[#1a2127] border border-[#7aa5d2]/40 space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[#85a6b1] font-semibold">Target Rack Cabinet</label>
                      <select
                        value={selectedRackId}
                        onChange={(e) => setSelectedRackId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2] cursor-pointer"
                      >
                        {racks.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.row} - {r.total_u - r.used_u}U Free)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[#85a6b1] font-semibold">Start U Position</label>
                        <input
                          type="number"
                          min={1}
                          max={42}
                          value={startU}
                          onChange={(e) => setStartU(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[#85a6b1] font-semibold">Height (U)</label>
                        <select
                          value={heightU}
                          onChange={(e) => setHeightU(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2] cursor-pointer"
                        >
                          <option value={1}>1U</option>
                          <option value={2}>2U</option>
                          <option value={3}>3U</option>
                          <option value={4}>4U</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[#85a6b1] font-semibold">Cabinet Face</label>
                      <select
                        value={positionFace}
                        onChange={(e) =>
                          setPositionFace(e.target.value as 'Front' | 'Rear' | 'Both')
                        }
                        className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2] cursor-pointer"
                      >
                        <option value="Front">Front</option>
                        <option value="Rear">Rear</option>
                        <option value="Both">Both (Full Depth)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#85a6b1] font-semibold">Device Type</label>
                      <select
                        value={deviceType}
                        onChange={(e) => setDeviceType(e.target.value)}
                        className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2] cursor-pointer"
                      >
                        <option value="Server">Server</option>
                        <option value="Switch">Switch</option>
                        <option value="Firewall">Firewall</option>
                        <option value="Storage">Storage</option>
                        <option value="UPS">UPS</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#85a6b1] font-semibold">Hardware Vendor</label>
                      <input
                        type="text"
                        value={manufacturer}
                        onChange={(e) => setManufacturer(e.target.value)}
                        placeholder="Dell, Cisco, HPE..."
                        className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#85a6b1] font-semibold">Model Name</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="e.g. PowerEdge R650, Catalyst 9300"
                      className="w-full px-3 py-2 bg-[#273139] border border-[#394650] rounded text-white focus:outline-none focus:border-[#7aa5d2]"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-[#20282f] border border-[#394650] text-[#85a6b1] space-y-2">
                  <div className="flex items-center gap-2 text-[#8bd7d1] font-bold">
                    <Info className="w-4 h-4" />
                    <span>Host Will Be Registered in Zabbix Only</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    This host will be created in Zabbix 7.0 and will immediately appear in your{' '}
                    <span className="text-white font-semibold">Unassigned Hosts</span> queue.
                    You can assign it to a rack slot at any time later with a single click.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#394650] bg-[#20282f] font-mono text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded bg-[#273139] hover:bg-[#34424b] text-[#caedde] border border-[#394650] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#273139] hover:bg-[#34424b] text-white border border-[#394650] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-[#244158] hover:bg-[#2b516f] text-white border border-[#7aa5d2] transition-colors cursor-pointer font-bold"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer font-bold shadow-lg shadow-emerald-950/40"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Host in Zabbix...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Create Host</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
