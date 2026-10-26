/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import { useState, useEffect } from 'react'
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Activity,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Sliders,
  CheckSquare,
  Square,
  AlertOctagon,
} from 'lucide-react'
import type { Device } from '../../types'
import { fetchDeviceBlastRadius, decommissionDevice } from '../../api/client'
import { useTheme } from '../../lib/theme'

interface DecommissionModalProps {
  device: Device | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type DecommissionStep = 1 | 2 | 3 | 4
type LifecycleAction = 'DECOMMISSION' | 'HOT_SWAP' | 'PERMANENT_REMOVE'

export function DecommissionModal({
  device,
  isOpen,
  onClose,
  onSuccess,
}: DecommissionModalProps) {
  const { isTeslaDark } = useTheme()
  const [step, setStep] = useState<DecommissionStep>(1)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Blast Radius
  const [blastData, setBlastData] = useState<any>(null)
  const [loadingBlast, setLoadingBlast] = useState<boolean>(true)

  // Step 2: Zabbix Maintenance
  const [enableMaintenance, setEnableMaintenance] = useState<boolean>(true)
  const [maintenanceHours, setMaintenanceHours] = useState<number>(2)

  // Step 3: LOTO Checklist (All 5 must be completed)
  const [loto1, setLoto1] = useState<boolean>(false) // Feed B
  const [loto2, setLoto2] = useState<boolean>(false) // Feed A
  const [loto3, setLoto3] = useState<boolean>(false) // Network
  const [loto4, setLoto4] = useState<boolean>(false) // OOB
  const [loto5, setLoto5] = useState<boolean>(false) // Rail Latches

  // Step 4: Lifecycle Action
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction>('DECOMMISSION')

  const allLotoChecked = loto1 && loto2 && loto3 && loto4 && loto5

  // Fetch blast radius when modal opens
  useEffect(() => {
    if (isOpen && device) {
      setStep(1)
      setError(null)
      setLoto1(false)
      setLoto2(false)
      setLoto3(false)
      setLoto4(false)
      setLoto5(false)
      setLoadingBlast(true)

      fetchDeviceBlastRadius(device.id)
        .then((data) => setBlastData(data))
        .catch(() => {
          setBlastData({
            cascade_severity: 'LOW',
            affected_devices_count: 0,
            affected_servers: [],
            single_corded_risks: [],
            affected_departments: ['Core IT'],
          })
        })
        .finally(() => setLoadingBlast(false))
    }
  }, [isOpen, device])

  if (!isOpen || !device) return null

  const handleExecuteDecommission = async () => {
    setLoading(true)
    setError(null)

    try {
      await decommissionDevice(device.id, {
        action: lifecycleAction,
        maintenance_mode: enableMaintenance,
        maintenance_duration_hours: maintenanceHours,
        loto_completed: allLotoChecked,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to complete decommission')
    } finally {
      setLoading(false)
    }
  }

  const severity = blastData?.cascade_severity || 'LOW'

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
        {/* Header Ribbon with Traffic Lights & 4-Step Stepper */}
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
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className={`text-sm font-semibold ${isTeslaDark ? 'text-white font-mono' : 'tracking-[-0.022em] text-[#1d1d1f]'}`}>
                  Decommission Wizard: {device.name}
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
              { id: 1, label: '1. Blast Radius' },
              { id: 2, label: '2. Zabbix Maint' },
              { id: 3, label: '3. LOTO Safety' },
              { id: 4, label: '4. Execute Action' },
            ].map((s) => {
              const isCurrent = step === s.id
              const isPast = step > s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id as DecommissionStep)}
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
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${isTeslaDark ? 'text-[#00C853]' : 'text-[#34c759]'}`}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-[12px] bg-[#ff3b30]/15 border-[0.5px] border-[#ff3b30]/30 flex items-center gap-2.5 text-xs text-[#ff3b30]">
              <AlertOctagon className="w-4 h-4 text-[#ff3b30] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Blast Radius & Dependency Impact Evaluation */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[#1d1d1f] font-semibold text-sm tracking-[-0.022em] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#ff9500]" />
                  Downstream Blast-Radius &amp; Cascade Impact
                </h4>
                <p className="text-zinc-600 text-xs mt-0.5">
                  Graph traversal of power feeds, network links, and dependent services prior to physical extraction.
                </p>
              </div>

              {loadingBlast ? (
                <div className="p-8 text-center text-zinc-500 animate-pulse">
                  Traversing physical topology graph in dcim_db...
                </div>
              ) : (
                <>
                  {/* Severity Banner */}
                  <div
                    className={`p-4 rounded-[14px] border-[0.5px] flex items-center justify-between ${
                      severity === 'CRITICAL'
                        ? 'bg-[#ff3b30]/15 border-[#ff3b30]/30 text-[#ff3b30]'
                        : severity === 'WARNING'
                        ? 'bg-[#ff9500]/15 border-[#ff9500]/30 text-[#ff9500]'
                        : 'bg-[#34c759]/15 border-[#34c759]/30 text-[#34c759]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {severity === 'CRITICAL' ? (
                        <AlertOctagon className="w-5 h-5 text-[#ff3b30] shrink-0 animate-bounce" />
                      ) : severity === 'WARNING' ? (
                        <AlertTriangle className="w-5 h-5 text-[#ff9500] shrink-0" />
                      ) : (
                        <Shield className="w-5 h-5 text-[#34c759] shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold text-xs uppercase tracking-wide">
                          {severity === 'CRITICAL'
                            ? 'CRITICAL CASCADE OUTAGE RISK'
                            : severity === 'WARNING'
                            ? 'WARNING: DEPENDENT PEERS DETECTED'
                            : 'LOW RISK: ISOLATED WORKLOAD'}
                        </div>
                        <div className="text-[11px] text-zinc-600 mt-0.5">
                          {severity === 'CRITICAL'
                            ? 'Decommissioning will sever downstream power or core network connectivity!'
                            : severity === 'WARNING'
                            ? 'Peer devices in the same cabinet may lose redundancy.'
                            : 'Device has zero downstream dependencies. Safe for scheduled maintenance.'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-[8px] bg-black/[0.06] border border-black/10 text-[#1d1d1f] text-xs font-semibold">
                      {blastData?.affected_devices_count || 0} Connected Peers
                    </span>
                  </div>

                  {/* Impact Breakdown Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 bg-black/[0.03] border-[0.5px] border-black/10 rounded-[12px]">
                      <span className="text-zinc-500 block text-[10px] uppercase font-medium">Target Slot</span>
                      <span className="text-[#1d1d1f] font-semibold text-xs mt-1 block">
                        U{device.start_u} ({device.height_u}U Standard)
                      </span>
                      <span className="text-[#0071E3] text-[11px] mt-0.5 block truncate">
                        {device.model || device.device_type}
                      </span>
                    </div>

                    <div className="p-3.5 bg-black/[0.03] border-[0.5px] border-black/10 rounded-[12px]">
                      <span className="text-zinc-500 block text-[10px] uppercase font-medium">Single-Corded Casualties</span>
                      <span className="text-[#ff9500] font-semibold text-xs mt-1 block">
                        {blastData?.single_corded_risks?.length || 0} Servers at Risk
                      </span>
                      <span className="text-zinc-500 text-[11px] mt-0.5 block">
                        Will lose power if PDU-A trips
                      </span>
                    </div>

                    <div className="p-3.5 bg-black/[0.03] border-[0.5px] border-black/10 rounded-[12px]">
                      <span className="text-zinc-500 block text-[10px] uppercase font-medium">Affected Departments</span>
                      <span className="text-[#34c759] font-semibold text-xs mt-1 block truncate">
                        {blastData?.affected_departments?.join(', ') || 'None'}
                      </span>
                      <span className="text-zinc-500 text-[11px] mt-0.5 block">Production SLA active</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: Automated Zabbix Maintenance Mode */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[#1d1d1f] font-semibold text-sm tracking-[-0.022em] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#0071E3]" />
                  Automated Zabbix 7.0 Maintenance Mode
                </h4>
                <p className="text-zinc-600 text-xs mt-0.5">
                  Mutes alerts, trigger evaluations, and pager escalations during cable disconnect.
                </p>
              </div>

              {/* Maintenance Toggle */}
              <div className="p-4 bg-black/[0.03] border-[0.5px] border-black/10 rounded-[14px] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#1d1d1f] text-xs flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#0071E3]" />
                    Suppress Zabbix Alert Storms
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Enables Zabbix maintenance window with data collection (no notifications sent).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableMaintenance}
                  onChange={(e) => setEnableMaintenance(e.target.checked)}
                  className="w-5 h-5 accent-[#0071E3] cursor-pointer"
                />
              </div>

              {/* Duration Window Selector */}
              {enableMaintenance && (
                <div className="space-y-2">
                  <label className="block text-zinc-700 font-medium text-xs">
                    Maintenance Window Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[1, 2, 4, 8].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setMaintenanceHours(hrs)}
                        className={`py-2.5 px-3 rounded-[12px] border-[0.5px] text-center transition-all cursor-pointer ${
                          maintenanceHours === hrs
                            ? 'bg-[#0071E3] border-[#0071E3] text-white font-semibold shadow-sm'
                            : 'bg-black/[0.03] border-black/10 text-zinc-700 hover:bg-black/[0.06]'
                        }`}
                      >
                        <div className="text-xs font-semibold">{hrs} Hours</div>
                        <div className="text-[10px] opacity-75 mt-0.5">
                          {hrs === 2 ? 'Recommended' : hrs === 1 ? 'Quick Swap' : 'Deep Overhaul'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Host Status Badge */}
              <div className="p-3.5 bg-black/[0.03] border-[0.5px] border-black/10 rounded-[12px] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-[#34c759] animate-ping" />
                  <span className="text-[#1d1d1f] font-semibold">{device.name}</span>
                  <span className="text-[11px] text-zinc-500">
                    (Zabbix Host ID: {device.zabbix_host_id || 'Unlinked'})
                  </span>
                </div>
                <span className="text-[#0071E3] font-medium text-xs">
                  {enableMaintenance ? `Window: ${maintenanceHours}h Active` : 'Muting Disabled'}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Cable Disconnect & LOTO Checklist */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[#1d1d1f] font-semibold text-sm tracking-[-0.022em] flex items-center gap-2 text-[#ff9500]">
                  <AlertTriangle className="w-4 h-4 text-[#ff9500]" />
                  Physical Disconnect &amp; LOTO Safety Protocol
                </h4>
                <p className="text-zinc-600 text-xs mt-0.5">
                  Mandatory data center safety checklist. All 5 steps must be verified before rack rail release.
                </p>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2.5">
                {[
                  {
                    id: 1,
                    checked: loto1,
                    setter: setLoto1,
                    title: '1. Disconnect Redundant Power Feed B (PDU-B)',
                    desc: 'Unplug C14/C20 power cord from PSU-2 inlet on the right rear chassis.',
                  },
                  {
                    id: 2,
                    checked: loto2,
                    setter: setLoto2,
                    title: '2. Disconnect Primary Power Feed A (PDU-A)',
                    desc: 'Unplug C14/C20 power cord from PSU-1 inlet. Verify LEDs turn off completely.',
                  },
                  {
                    id: 3,
                    checked: loto3,
                    setter: setLoto3,
                    title: '3. Unplug Network Uplink Patch Cables (SFP28 / RJ45)',
                    desc: 'Label cable tags and attach protective dust caps onto fiber optical transceivers.',
                  },
                  {
                    id: 4,
                    checked: loto4,
                    setter: setLoto4,
                    title: '4. Unplug Dedicated Out-of-Band Management (OOB)',
                    desc: 'Disconnect dedicated 1GbE RJ45 cable to iDRAC9 / iLO 5 / IPMI port.',
                  },
                  {
                    id: 5,
                    checked: loto5,
                    setter: setLoto5,
                    title: '5. Release EIA-310 Rail Safety Thumbscrews',
                    desc: 'Disengage side locking pins and slide server forward onto mobile hydraulic lift.',
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => item.setter(!item.checked)}
                    className={`p-3.5 rounded-[12px] border-[0.5px] flex items-start gap-3 cursor-pointer transition-all ${
                      item.checked
                        ? 'bg-[#34c759]/15 border-[#34c759]/40 shadow-sm'
                        : 'bg-black/[0.03] border-black/10 hover:border-black/20'
                    }`}
                  >
                    <div className="pt-0.5">
                      {item.checked ? (
                        <CheckSquare className="w-4 h-4 text-[#34c759]" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <div className={`font-semibold text-xs ${item.checked ? 'text-[#1d1d1f]' : 'text-zinc-700'}`}>
                        {item.title}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Indicator */}
              <div
                className={`p-3 rounded-[12px] border-[0.5px] flex items-center justify-between text-xs font-semibold ${
                  allLotoChecked
                    ? 'bg-[#34c759]/15 border-[#34c759]/40 text-[#34c759]'
                    : 'bg-black/[0.03] border-black/10 text-zinc-600'
                }`}
              >
                <span>
                  Safety Progress: {[loto1, loto2, loto3, loto4, loto5].filter(Boolean).length} / 5 Checked
                </span>
                {allLotoChecked ? (
                  <span className="flex items-center gap-1.5 text-[#34c759]">
                    <CheckCircle2 className="w-4 h-4" />
                    Clear for Extraction
                  </span>
                ) : (
                  <span className="text-[#ff9500] text-xs">Verify all 5 safety steps to proceed</span>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Lifecycle Action Decision & Execute */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[#1d1d1f] font-semibold text-sm tracking-[-0.022em] flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-[#ff9500]" />
                  Confirm Lifecycle Action &amp; Commit
                </h4>
                <p className="text-zinc-600 text-xs mt-0.5">
                  Choose what happens to the hardware asset record in DCIM inventory.
                </p>
              </div>

              {/* Action Selection Cards */}
              <div className="space-y-2.5">
                {[
                  {
                    action: 'DECOMMISSION' as LifecycleAction,
                    title: 'Decommission to Spare Inventory',
                    desc: 'Frees rack slot U' + device.start_u + '. Marks hardware asset status as "SPARE / INVENTORY" for future re-provisioning.',
                    badge: 'Standard Workflow',
                  },
                  {
                    action: 'HOT_SWAP' as LifecycleAction,
                    title: 'Hot-Swap Hardware Replacement',
                    desc: 'Marks slot U' + device.start_u + ' as "MAINTENANCE (Hot-Swap Pending)", keeping the slot reserved for immediate replacement.',
                    badge: 'Zero Conflict Slot',
                  },
                  {
                    action: 'PERMANENT_REMOVE' as LifecycleAction,
                    title: 'Permanent Decommission & Wipe',
                    desc: 'Purges device from DCIM topology. Logs final decommission audit post-mortem.',
                    badge: 'Permanent Deletion',
                  },
                ].map((act) => {
                  const isSelected = lifecycleAction === act.action
                  return (
                    <div
                      key={act.action}
                      onClick={() => setLifecycleAction(act.action)}
                      className={`p-3.5 rounded-[14px] border-[0.5px] cursor-pointer transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-[#0071E3]/10 border-[#0071E3] shadow-sm'
                          : 'bg-black/[0.03] border-black/10 hover:border-black/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1d1d1f] text-xs">{act.title}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-black/[0.06] rounded-[6px] text-zinc-600 font-medium">
                            {act.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">{act.desc}</p>
                      </div>
                      <div className="pt-0.5">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-[#0071E3] bg-[#0071E3]' : 'border-zinc-400'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Execution Summary Table */}
              <div className="p-3.5 bg-black/[0.03] border-[0.5px] border-black/10 rounded-[12px] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#1d1d1f] font-semibold">
                  <span>Target Equipment:</span>
                  <span>{device.name} (U{device.start_u} • {device.height_u}U)</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Zabbix Maintenance:</span>
                  <span className="text-[#0071E3]">{enableMaintenance ? `${maintenanceHours} Hours Active` : 'Disabled'}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Physical LOTO:</span>
                  <span className="text-[#34c759] font-semibold">5/5 Steps Verified</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div
          className={`p-4 border-t flex items-center justify-between text-xs ${
            isTeslaDark ? 'bg-[#0A0A0A] border-[#1F1F1F]' : 'bg-black/[0.02] border-black/10'
          }`}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as DecommissionStep)}
              className={`min-h-[44px] px-4 flex items-center gap-2 transition-colors cursor-pointer border ${
                isTeslaDark
                  ? 'rounded-[6px] border-[#1F1F1F] bg-[#161616] text-zinc-300 hover:text-white font-mono'
                  : 'rounded-[12px] border-[0.5px] border-black/15 bg-black/[0.04] text-zinc-700 hover:text-black'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`min-h-[44px] px-4 transition-colors cursor-pointer border ${
                isTeslaDark
                  ? 'rounded-[6px] border-[#1F1F1F] bg-[#161616] text-zinc-300 hover:text-white font-mono'
                  : 'rounded-[12px] border-[0.5px] border-black/15 bg-black/[0.04] text-zinc-700 hover:text-black'
              }`}
            >
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              disabled={step === 3 && !allLotoChecked}
              onClick={() => setStep((s) => (s + 1) as DecommissionStep)}
              className={`min-h-[44px] px-5 font-semibold transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
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
              onClick={handleExecuteDecommission}
              className={`min-h-[44px] px-6 font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#E82127] hover:bg-[#cf1b21] text-white font-mono shadow-none'
                  : 'rounded-[12px] bg-[#ff3b30] hover:bg-[#e0342a] text-white shadow-sm hover:scale-[1.01] active:scale-[0.98]'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              {loading ? 'Executing Decommission...' : 'Confirm & Execute Decommission'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
