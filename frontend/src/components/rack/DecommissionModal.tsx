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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="w-full max-w-2xl noc-panel shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-amber-500/50">
        {/* Header Ribbon with 4-Step Stepper */}
        <div className="noc-panel-header flex-col items-stretch gap-2 p-3 border-b border-[#394650] bg-[#1a1c22]">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="font-mono uppercase tracking-wider text-xs font-bold text-white">
                Decommission &amp; Hardware Replacement Wizard: {device.name}
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

          {/* Stepper Progress Ribbon */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-[10px]">
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
                  className={`py-1.5 px-2 rounded-[3px] border flex items-center justify-between transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_8px_#f59e0b44] font-bold'
                      : isPast
                        ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300 font-semibold'
                        : 'bg-[#14181c] border-[#2b353d] text-[#85a6b1] hover:text-slate-300'
                  }`}
                >
                  <span className="truncate">{s.label}</span>
                  {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {error && (
            <div className="p-2.5 rounded-[2px] bg-rose-950/60 border border-rose-700 flex items-center gap-2 text-rose-200">
              <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Blast Radius & Dependency Impact Evaluation */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  Downstream Blast-Radius &amp; Cascade Impact
                </h4>
                <p className="text-[11px] text-[#85a6b1]">
                  Graph traversal of power feeds, network links, and dependent services prior to physical extraction.
                </p>
              </div>

              {loadingBlast ? (
                <div className="p-8 text-center text-[#85a6b1] animate-pulse">
                  Traversing physical topology graph in dcim_db...
                </div>
              ) : (
                <>
                  {/* Severity Banner */}
                  <div
                    className={`p-3 rounded-[3px] border flex items-center justify-between ${
                      severity === 'CRITICAL'
                        ? 'bg-rose-950/50 border-rose-600 text-rose-200'
                        : severity === 'WARNING'
                          ? 'bg-amber-950/50 border-amber-600 text-amber-200'
                          : 'bg-emerald-950/40 border-emerald-600 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {severity === 'CRITICAL' ? (
                        <AlertOctagon className="w-5 h-5 text-rose-400 animate-bounce" />
                      ) : severity === 'WARNING' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Shield className="w-5 h-5 text-emerald-400" />
                      )}
                      <div>
                        <div className="font-bold text-xs uppercase tracking-wide">
                          {severity === 'CRITICAL'
                            ? 'CRITICAL CASCADE OUTAGE RISK'
                            : severity === 'WARNING'
                              ? 'WARNING: DEPENDENT PEERS DETECTED'
                              : 'LOW RISK: ISOLATED WORKLOAD'}
                        </div>
                        <div className="text-[10px] opacity-80 mt-0.5">
                          {severity === 'CRITICAL'
                            ? 'Decommissioning will sever downstream power or core network connectivity!'
                            : severity === 'WARNING'
                              ? 'Peer devices in the same cabinet may lose redundancy.'
                              : 'Device has zero downstream dependencies. Safe for scheduled maintenance.'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 rounded bg-black/40 border border-white/20 text-[10px] font-bold">
                      {blastData?.affected_devices_count || 0} Connected Peers
                    </span>
                  </div>

                  {/* Impact Breakdown Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[10px]">
                    <div className="p-2.5 bg-[#14181c] border border-[#2b353d] rounded-[2px]">
                      <span className="text-[#85a6b1] block uppercase">Target Slot</span>
                      <span className="text-white font-bold text-xs mt-0.5 block">
                        U{device.start_u} ({device.height_u}U Standard)
                      </span>
                      <span className="text-sky-300 text-[9px] mt-1 block truncate">
                        {device.model || device.device_type}
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#14181c] border border-[#2b353d] rounded-[2px]">
                      <span className="text-[#85a6b1] block uppercase">Single-Corded Casualties</span>
                      <span className="text-amber-400 font-bold text-xs mt-0.5 block">
                        {blastData?.single_corded_risks?.length || 0} Servers at Risk
                      </span>
                      <span className="text-[#85a6b1] text-[9px] mt-1 block">
                        Will lose power if PDU-A trips
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#14181c] border border-[#2b353d] rounded-[2px]">
                      <span className="text-[#85a6b1] block uppercase">Affected Departments</span>
                      <span className="text-emerald-400 font-bold text-xs mt-0.5 block truncate">
                        {blastData?.affected_departments?.join(', ') || 'None'}
                      </span>
                      <span className="text-[#85a6b1] text-[9px] mt-1 block">Production SLA active</span>
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
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  Automated Zabbix 7.0 Maintenance Mode
                </h4>
                <p className="text-[11px] text-[#85a6b1]">
                  Mutes alerts, trigger evaluations, and pager escalations during cable disconnect.
                </p>
              </div>

              {/* Maintenance Toggle */}
              <div className="p-3 bg-[#151c22] border border-sky-600/60 rounded-[3px] flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-sky-400" />
                    Suppress Zabbix Alert Storms
                  </div>
                  <div className="text-[10px] text-[#85a6b1] mt-0.5">
                    Enables Zabbix maintenance window with data collection (no notifications sent).
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableMaintenance}
                  onChange={(e) => setEnableMaintenance(e.target.checked)}
                  className="w-4 h-4 accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Duration Window Selector */}
              {enableMaintenance && (
                <div className="space-y-2">
                  <label className="block text-[#caedde] font-bold text-xs">
                    Maintenance Window Duration
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 4, 8].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setMaintenanceHours(hrs)}
                        className={`py-2 px-3 rounded-[2px] border text-center transition-all cursor-pointer ${
                          maintenanceHours === hrs
                            ? 'bg-sky-950 border-sky-400 text-sky-200 font-bold shadow-xs'
                            : 'bg-[#182026] border-[#313f4b] text-[#85a6b1] hover:text-white'
                        }`}
                      >
                        <div className="text-xs">{hrs} Hours</div>
                        <div className="text-[9px] opacity-75">
                          {hrs === 2 ? 'Recommended' : hrs === 1 ? 'Quick Swap' : 'Deep Overhaul'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Host Status Badge */}
              <div className="p-2.5 bg-[#14181c] border border-[#2b353d] rounded-[2px] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-white font-bold">{device.name}</span>
                  <span className="text-[10px] text-[#85a6b1]">
                    (Zabbix Host ID: {device.zabbix_host_id || 'Unlinked'})
                  </span>
                </div>
                <span className="text-sky-300 font-mono text-[10px]">
                  {enableMaintenance ? `Window: ${maintenanceHours}h Active` : 'Muting Disabled'}
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Cable Disconnect & Lockout/Tagout (LOTO) Checklist */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-bold text-sm flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Physical Disconnect &amp; LOTO Safety Protocol
                </h4>
                <p className="text-[11px] text-[#85a6b1]">
                  Mandatory data center safety checklist. All 5 steps must be verified before rack rail release.
                </p>
              </div>

              {/* Checklist Items */}
              <div className="space-y-2">
                {[
                  {
                    id: 1,
                    checked: loto1,
                    setter: setLoto1,
                    title: '1. Disconnect Redundant Power Feed B (PDU-B)',
                    desc: 'Unplug C14/C20 power cord from PSU-2 inlet on the right rear chassis.',
                    color: 'text-rose-400',
                  },
                  {
                    id: 2,
                    checked: loto2,
                    setter: setLoto2,
                    title: '2. Disconnect Primary Power Feed A (PDU-A)',
                    desc: 'Unplug C14/C20 power cord from PSU-1 inlet. Verify LEDs turn off completely.',
                    color: 'text-sky-400',
                  },
                  {
                    id: 3,
                    checked: loto3,
                    setter: setLoto3,
                    title: '3. Unplug Network Uplink Patch Cables (SFP28 / RJ45)',
                    desc: 'Label cable tags and attach protective dust caps onto fiber optical transceivers.',
                    color: 'text-emerald-400',
                  },
                  {
                    id: 4,
                    checked: loto4,
                    setter: setLoto4,
                    title: '4. Unplug Dedicated Out-of-Band Management (OOB)',
                    desc: 'Disconnect dedicated 1GbE RJ45 cable to iDRAC9 / iLO 5 / IPMI port.',
                    color: 'text-slate-300',
                  },
                  {
                    id: 5,
                    checked: loto5,
                    setter: setLoto5,
                    title: '5. Release EIA-310 Rail Safety Thumbscrews',
                    desc: 'Disengage side locking pins and slide server forward onto mobile hydraulic lift.',
                    color: 'text-amber-300',
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => item.setter(!item.checked)}
                    className={`p-2.5 rounded-[3px] border flex items-start gap-3 cursor-pointer transition-all ${
                      item.checked
                        ? 'bg-[#18251e] border-emerald-500/80 shadow-xs'
                        : 'bg-[#181c20] border-[#313b43] hover:border-[#50626f]'
                    }`}
                  >
                    <div className="pt-0.5">
                      {item.checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-[#85a6b1]" />
                      )}
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${item.checked ? 'text-white' : item.color}`}>
                        {item.title}
                      </div>
                      <div className="text-[10px] text-[#85a6b1] mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checklist completion indicator */}
              <div
                className={`p-2 rounded-[2px] flex items-center justify-between text-xs font-bold ${
                  allLotoChecked
                    ? 'bg-emerald-950/60 border border-emerald-500 text-emerald-300'
                    : 'bg-[#14181c] border border-[#2b353d] text-[#85a6b1]'
                }`}
              >
                <span>
                  Safety Progress: {[loto1, loto2, loto3, loto4, loto5].filter(Boolean).length} / 5 Checked
                </span>
                {allLotoChecked ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Clear for Extraction
                  </span>
                ) : (
                  <span className="text-amber-400 text-[10px]">Verify all 5 safety steps to proceed</span>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Lifecycle Action Decision & Execute */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-bold text-sm flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-amber-400" />
                  Confirm Lifecycle Action &amp; Commit
                </h4>
                <p className="text-[11px] text-[#85a6b1]">
                  Choose what happens to the hardware asset record in NexusTwin DCIM.
                </p>
              </div>

              {/* Action Selection Cards */}
              <div className="space-y-2">
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
                      className={`p-3 rounded-[3px] border cursor-pointer transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_8px_#f59e0b33]'
                          : 'bg-[#182026] border-[#313f4b] hover:border-[#50626f]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{act.title}</span>
                          <span className="text-[9px] px-1.5 py-0.2 bg-black/40 border border-white/10 rounded text-amber-300">
                            {act.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#85a6b1] mt-1">{act.desc}</p>
                      </div>
                      <div className="pt-0.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-amber-400 bg-amber-500' : 'border-[#50626f]'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 bg-black rounded-full" />}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Execution Summary Table */}
              <div className="p-3 bg-[#14181c] border border-[#2b353d] rounded-[3px] space-y-1.5 text-[10.5px]">
                <div className="flex justify-between text-white font-bold">
                  <span>Target Equipment:</span>
                  <span>{device.name} (U{device.start_u} • {device.height_u}U)</span>
                </div>
                <div className="flex justify-between text-[#85a6b1]">
                  <span>Zabbix Maintenance:</span>
                  <span className="text-sky-300">{enableMaintenance ? `${maintenanceHours} Hours Active` : 'Disabled'}</span>
                </div>
                <div className="flex justify-between text-[#85a6b1]">
                  <span>Physical LOTO:</span>
                  <span className="text-emerald-400 font-bold">5/5 Steps Verified</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-3 bg-[#1a1c22] border-t border-[#394650] flex items-center justify-between font-mono text-xs">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as DecommissionStep)}
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
              disabled={step === 3 && !allLotoChecked}
              onClick={() => setStep((s) => (s + 1) as DecommissionStep)}
              className="px-4 py-1.5 rounded-[2px] bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next Step
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleExecuteDecommission}
              className="px-5 py-1.5 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white font-black transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-950"
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
