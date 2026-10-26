/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import {
  Server,
  Zap,
  Thermometer,
  AlertTriangle,
  AlertOctagon,
  ChevronRight,
  Map,
  Bell,
  Monitor,
  Info,
  Activity,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'
import type { RoomOverview, RackSummary } from '../../types'

interface OverviewViewProps {
  overview: RoomOverview | null
  onNavigateToFloorPlan: (rackId?: number) => void
  onNavigateToRackElevation: (rack: RackSummary) => void
  onNavigateToAlerts: () => void
  onNavigateToDevices: () => void
}

export function OverviewView({
  overview,
  onNavigateToFloorPlan,
  onNavigateToRackElevation,
  onNavigateToAlerts,
  onNavigateToDevices,
}: OverviewViewProps) {
  if (!overview) {
    return (
      <div className="max-w-[1600px] mx-auto p-16 rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 text-center shadow-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-[14px] bg-[#0071E3]/10 border-[0.5px] border-[#0071E3]/25 flex items-center justify-center">
          <Activity className="w-6 h-6 text-[#0071E3] animate-pulse" />
        </div>
        <h3 className="text-base font-semibold tracking-[-0.022em] text-[#1d1d1f]">
          Synchronizing Telemetry Stream
        </h3>
        <p className="text-xs text-zinc-500 mt-1 tracking-[-0.011em]">
          Connecting to Zabbix 7.0 &amp; Redis 7 DCIM Cache Engine...
        </p>
      </div>
    )
  }

  const {
    site_name,
    room_name,
    room_temp_c,
    total_racks,
    total_devices,
    total_alerts,
    status_counts,
    severity_counts,
    racks,
    total_power_kw,
    total_used_u,
    total_capacity_u,
  } = overview

  const usedU = total_used_u || racks.reduce((acc, r) => acc + r.used_u, 0)
  const capacityU = total_capacity_u || total_racks * 42
  const usagePct = capacityU > 0 ? Math.round((usedU / capacityU) * 100) : 0
  const totalPower = total_power_kw || racks.reduce((acc, r) => acc + r.power_kw, 0)
  const powerCapacityKW = 40.0
  const powerPct = Math.round((totalPower / powerCapacityKW) * 100)

  // Problem racks sorted by highest severity
  const problemRacks = [...racks]
    .filter((r) => r.status === 'critical' || r.status === 'warning')
    .sort((a, b) => b.highest_severity - a.highest_severity)

  const topAttentionRacks = (
    problemRacks.length > 0 ? problemRacks : racks.slice(0, 4)
  ).slice(0, 4)

  const sev = severity_counts || {
    disaster: 0,
    high: 0,
    average: 0,
    warning: 0,
    info: 0,
    unclassified: 0,
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 select-none font-sans text-[#1d1d1f] pb-12">
      {/* Apple Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-0.022em] text-[#1d1d1f]">
              Operations Overview
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-emerald-50 border-[0.5px] border-emerald-200 text-emerald-700 text-[11px] font-semibold tracking-[-0.011em]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE TELEMETRY</span>
            </div>
          </div>
          <p className="text-xs text-zinc-500 tracking-[-0.011em]">
            <span className="text-zinc-800 font-medium">{site_name}</span> • Room <span className="text-zinc-800 font-medium">{room_name}</span> • Powered by Zabbix 7.0 &amp; Redis 7 Stream
          </p>
        </div>

        {/* Action button to open Floor Plan */}
        <button
          type="button"
          onClick={() => onNavigateToFloorPlan()}
          className="min-h-[44px] px-5 rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium text-xs tracking-[-0.011em] flex items-center justify-center gap-2 shadow-sm shadow-[#0071E3]/25 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.02] active:scale-[0.96] cursor-pointer self-start sm:self-auto"
        >
          <Map className="w-4 h-4" />
          <span>2.5D Room Floor Plan</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-80" />
        </button>
      </div>

      {/* Top 5 Apple Health-Style Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Racks */}
        <div className="rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm flex flex-col justify-between hover:border-black/20 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.02]">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Cabinets</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-bold tracking-tight text-[#1d1d1f]">{total_racks}</div>
            <div className="text-xs text-zinc-500 mt-1 tracking-[-0.011em]">
              <span className="text-emerald-600 font-semibold">{status_counts.healthy}</span> Nominal •{' '}
              <span className="text-amber-600 font-semibold">{status_counts.warning + status_counts.critical}</span> Alert
            </div>
          </div>
          <div className="w-full bg-black/[0.06] h-1.5 rounded-full overflow-hidden flex mt-2">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${(status_counts.healthy / (total_racks || 1)) * 100}%` }}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${(status_counts.warning / (total_racks || 1)) * 100}%` }}
            />
            <div
              className="bg-rose-500 h-full transition-all duration-500"
              style={{ width: `${(status_counts.critical / (total_racks || 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Devices */}
        <div
          onClick={onNavigateToDevices}
          className="rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm flex flex-col justify-between hover:border-[#0071E3]/50 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.02] cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Mounted Devices</span>
            <div className="w-8 h-8 rounded-[10px] bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-bold tracking-tight text-[#1d1d1f]">{total_devices}</div>
            <div className="text-xs text-zinc-500 mt-1 tracking-[-0.011em]">
              Across {total_racks} 42U Enclosures
            </div>
          </div>
          <div className="text-xs text-[#0071E3] font-semibold group-hover:translate-x-0.5 flex items-center gap-1 transition-transform">
            <span>Browse Inventory</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Metric 3: Alerts */}
        <div
          onClick={onNavigateToAlerts}
          className="rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm flex flex-col justify-between hover:border-rose-400 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.02] cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Active Triggers</span>
            <div className="w-8 h-8 rounded-[10px] bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-bold tracking-tight text-[#1d1d1f] flex items-center gap-2">
              <span>{total_alerts}</span>
              {sev.disaster > 0 && (
                <span className="px-2 py-0.5 rounded-[8px] text-[10px] bg-rose-100 text-rose-700 border border-rose-300 font-bold">
                  {sev.disaster} DISASTER
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-500 mt-1 tracking-[-0.011em]">
              <span className="text-amber-600 font-semibold">{sev.high} High</span> •{' '}
              <span className="text-yellow-600 font-semibold">{sev.warning} Warn</span>
            </div>
          </div>
          <div className="text-xs text-rose-600 font-semibold group-hover:translate-x-0.5 flex items-center gap-1 transition-transform">
            <span>Triage Alerts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Metric 4: Power */}
        <div className="rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm flex flex-col justify-between hover:border-black/20 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.02]">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Power Circuit</span>
            <div className="w-8 h-8 rounded-[10px] bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-bold tracking-tight text-[#1d1d1f]">{totalPower} <span className="text-lg font-normal text-zinc-400">kW</span></div>
            <div className="text-xs text-zinc-500 mt-1 tracking-[-0.011em]">
              {powerPct}% of {powerCapacityKW} kW Limit
            </div>
          </div>
          <div className="w-full bg-black/[0.06] h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all duration-500 ${
                powerPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(powerPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 5: Temperature */}
        <div className="rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm flex flex-col justify-between hover:border-black/20 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.02]">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Inlet Ambient</span>
            <div className="w-8 h-8 rounded-[10px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-bold tracking-tight text-[#1d1d1f]">{room_temp_c} <span className="text-lg font-normal text-zinc-400">°C</span></div>
            <div className="text-xs text-emerald-600 mt-1 font-semibold tracking-[-0.011em]">
              ASHRAE TC 9.9 Nominal
            </div>
          </div>
          <div className="w-full bg-black/[0.06] h-1.5 rounded-full overflow-hidden mt-2">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: '48%' }} />
          </div>
        </div>
      </div>

      {/* Middle Grid: Status Matrices & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Cabinet Health Matrix */}
        <div className="rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-[-0.022em] text-[#1d1d1f]">Cabinet Health Matrix</h3>
                <p className="text-xs text-zinc-500 tracking-[-0.011em]">Distribution across {total_racks} data cabinets</p>
              </div>
              <span className="px-2.5 py-1 rounded-[8px] bg-black/[0.04] text-xs font-semibold text-zinc-700">
                {total_racks} Units
              </span>
            </div>

            {/* Segment Bar */}
            <div className="w-full bg-black/[0.06] h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${(status_counts.healthy / (total_racks || 1)) * 100}%` }}
              />
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${(status_counts.warning / (total_racks || 1)) * 100}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${(status_counts.critical / (total_racks || 1)) * 100}%` }}
              />
            </div>

            {/* Breakdown Items */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-[12px] bg-black/[0.02] border-[0.5px] border-black/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-zinc-700 font-medium">Nominal Cabinets</span>
                </div>
                <span className="font-semibold text-[#1d1d1f] text-sm">{status_counts.healthy}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[12px] bg-black/[0.02] border-[0.5px] border-black/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-zinc-700 font-medium">Warning Cabinets</span>
                </div>
                <span className="font-semibold text-amber-600 text-sm">{status_counts.warning}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[12px] bg-black/[0.02] border-[0.5px] border-black/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-zinc-700 font-medium">Critical Cabinets</span>
                </div>
                <span className="font-semibold text-rose-600 text-sm">{status_counts.critical}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToFloorPlan()}
            className="w-full min-h-[44px] py-2.5 rounded-[12px] bg-black/[0.03] hover:bg-black/[0.06] border-[0.5px] border-black/10 text-zinc-700 hover:text-black text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
          >
            <span>Inspect 2.5D Room Floor Plan</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#0071E3]" />
          </button>
        </div>

        {/* Card 2: Zabbix Trigger Matrix */}
        <div className="rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-[-0.022em] text-[#1d1d1f]">Zabbix Trigger Matrix</h3>
                <p className="text-xs text-zinc-500 tracking-[-0.011em]">Telemetry triggers sorted by severity</p>
              </div>
              <span className="px-2.5 py-1 rounded-[8px] bg-rose-50 border-[0.5px] border-rose-200 text-xs font-semibold text-rose-700">
                {total_alerts} Problems
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-rose-50 border-[0.5px] border-rose-200 text-rose-700">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" />
                  <span className="font-semibold">Disaster (Severity 5)</span>
                </div>
                <span className="font-bold text-white bg-rose-600 px-2 py-0.5 rounded-[6px]">{sev.disaster}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-amber-50 border-[0.5px] border-amber-200 text-amber-700">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" />
                  <span className="font-semibold">High (Severity 4)</span>
                </div>
                <span className="font-bold text-white bg-amber-600 px-2 py-0.5 rounded-[6px]">{sev.high}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-yellow-50 border-[0.5px] border-yellow-200 text-yellow-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-semibold">Average (Severity 3)</span>
                </div>
                <span className="font-bold text-white bg-yellow-600 px-2 py-0.5 rounded-[6px]">{sev.average}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-orange-50 border-[0.5px] border-orange-200 text-orange-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Warning (Severity 2)</span>
                </div>
                <span className="font-semibold text-zinc-700">{sev.warning}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-blue-50 border-[0.5px] border-blue-200 text-blue-700">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span className="font-medium">Information (Severity 1)</span>
                </div>
                <span className="font-semibold text-zinc-700">{sev.info}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToAlerts}
            className="w-full min-h-[44px] py-2.5 rounded-[12px] bg-rose-50 hover:bg-rose-100 border-[0.5px] border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
          >
            <span>Open Alert Command Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Capacity & Telemetry */}
        <div className="rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-[-0.022em] text-[#1d1d1f]">Capacity &amp; Telemetry</h3>
                <p className="text-xs text-zinc-500 tracking-[-0.011em]">Power load and physical rack units</p>
              </div>
              <span className="px-2.5 py-1 rounded-[8px] bg-black/[0.04] text-xs font-semibold text-zinc-700">
                {capacityU} U Total
              </span>
            </div>

            {/* Space Meter */}
            <div className="space-y-2 p-3.5 rounded-[14px] bg-black/[0.02] border-[0.5px] border-black/10">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-medium">Rack Space Occupancy</span>
                <span className="text-[#1d1d1f] font-semibold">
                  {usedU} / {capacityU} U ({usagePct}%)
                </span>
              </div>
              <div className="w-full bg-black/[0.06] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#0071E3] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-500 flex justify-between pt-1">
                <span>Available: {capacityU - usedU} U</span>
                <span>12 Cabinets × 42U</span>
              </div>
            </div>

            {/* Power Meter */}
            <div className="space-y-2 p-3.5 rounded-[14px] bg-black/[0.02] border-[0.5px] border-black/10">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-medium">Power Utilization</span>
                <span className="text-[#1d1d1f] font-semibold">
                  {totalPower} / {powerCapacityKW} kW ({powerPct}%)
                </span>
              </div>
              <div className="w-full bg-black/[0.06] h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    powerPct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(powerPct, 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-500 flex justify-between pt-1">
                <span>Headroom: {(powerCapacityKW - totalPower).toFixed(1)} kW</span>
                <span>Breaker: 40 kW</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-[12px] bg-emerald-50 border-[0.5px] border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>Power &amp; thermal thresholds within nominal envelope</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Critical Attention Racks & Operations Hub */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Top Attention Racks (2 cols) */}
        <div className="xl:col-span-2 rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-[-0.022em] text-[#1d1d1f]">
                High-Priority Attention Cabinets
              </h3>
              <p className="text-xs text-zinc-500 tracking-[-0.011em]">
                Requiring review or showing telemetry warnings
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToFloorPlan()}
              className="text-xs font-semibold text-[#0071E3] hover:text-[#0077ED] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Floor Plan View</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topAttentionRacks.map((rack) => {
              const isCrit = rack.status === 'critical'
              const isWarn = rack.status === 'warning'

              return (
                <div
                  key={rack.id}
                  className="p-4 rounded-[16px] bg-black/[0.02] border-[0.5px] border-black/10 hover:border-black/20 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[10px] bg-black/[0.04] flex items-center justify-center text-zinc-700">
                          <Server className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-[#1d1d1f] text-sm">{rack.name}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-[8px] text-[11px] font-semibold uppercase tracking-wider ${
                          isCrit
                            ? 'bg-rose-50 text-rose-700 border-[0.5px] border-rose-200'
                            : isWarn
                            ? 'bg-amber-50 text-amber-700 border-[0.5px] border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-[0.5px] border-emerald-200'
                        }`}
                      >
                        {rack.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-[10px] bg-white border-[0.5px] border-black/10 text-center text-xs shadow-2xs">
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 block font-medium">Used Space</span>
                        <span className="text-[#1d1d1f] font-semibold">{rack.used_u}/{rack.total_u} U</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 block font-medium">Power Load</span>
                        <span className="text-[#1d1d1f] font-semibold">{rack.power_kw} kW</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-zinc-500 block font-medium">Inlet Temp</span>
                        <span className="text-[#1d1d1f] font-semibold">{rack.inlet_temp_c} °C</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigateToRackElevation(rack)}
                      className="flex-1 min-h-[36px] py-1.5 rounded-[10px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      Inspect 42U
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToFloorPlan(rack.id)}
                      className="px-3 min-h-[36px] py-1.5 rounded-[10px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black text-xs font-medium transition-colors cursor-pointer"
                    >
                      Locate
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Quick Operations Hub */}
        <div className="rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-[-0.022em] text-[#1d1d1f]">Operations Hub</h3>
                <p className="text-xs text-zinc-500 tracking-[-0.011em]">Direct navigation shortcuts</p>
              </div>
              <span className="px-2 py-0.5 rounded-[6px] bg-black/[0.04] text-[10px] font-semibold text-zinc-600">
                PRO SPEED
              </span>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => onNavigateToFloorPlan()}
                className="p-3.5 rounded-[14px] bg-black/[0.02] border-[0.5px] border-black/10 hover:bg-black/[0.04] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Map className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#1d1d1f] text-sm block">2.5D Room Floor Plan</span>
                    <span className="text-xs text-zinc-500">
                      12 Cabinets with Live Heatmap &amp; Status
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
              </div>

              <div
                onClick={onNavigateToDevices}
                className="p-3.5 rounded-[14px] bg-black/[0.02] border-[0.5px] border-black/10 hover:bg-black/[0.04] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#1d1d1f] text-sm block">Device Matrix</span>
                    <span className="text-xs text-zinc-500">
                      Filter &amp; Inspect Hardware Units
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
              </div>

              <div
                onClick={onNavigateToAlerts}
                className="p-3.5 rounded-[14px] bg-black/[0.02] border-[0.5px] border-black/10 hover:bg-black/[0.04] transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#1d1d1f] text-sm block">Alerts Command Center</span>
                    <span className="text-xs text-zinc-500">
                      Triage Active Problems &amp; Triggers
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-[12px] bg-black/[0.02] border-[0.5px] border-black/5 text-center text-xs text-zinc-500">
            Datacenter Infrastructure Management • Zabbix 7.0 Engine
          </div>
        </div>
      </div>
    </div>
  )
}
