/* Tesla UI Design System (TDS) – Verified: Pure OLED Black, Radical Subtraction, Telemetry Typography, Electric Blue Accents */

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
import { useTheme } from '../../lib/theme'

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
  const { isTeslaDark } = useTheme()

  if (!overview) {
    return (
      <div
        className={`max-w-[1600px] mx-auto p-16 text-center ${
          isTeslaDark
            ? 'rounded-[12px] bg-[#111111] border border-[#1F1F1F] text-[#F5F5F7]'
            : 'rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 text-[#1d1d1f] shadow-sm'
        }`}
      >
        <div
          className={`w-12 h-12 mx-auto mb-4 flex items-center justify-center ${
            isTeslaDark
              ? 'rounded-[8px] bg-[#161616] border border-[#1F1F1F]'
              : 'rounded-[14px] bg-[#0071E3]/10 border-[0.5px] border-[#0071E3]/25'
          }`}
        >
          <Activity
            className={`w-6 h-6 animate-pulse ${
              isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'
            }`}
          />
        </div>
        <h3
          className={`text-base font-bold ${
            isTeslaDark ? 'font-mono uppercase tracking-[1.5px] text-white' : 'tracking-[-0.022em] text-[#1d1d1f]'
          }`}
        >
          Synchronizing Telemetry Stream
        </h3>
        <p className={`text-xs mt-1 ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 tracking-[-0.011em]'}`}>
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
    <div
      className={`max-w-[1600px] mx-auto space-y-6 select-none pb-12 ${
        isTeslaDark ? 'text-[#F5F5F7] font-sans' : 'font-sans text-[#1d1d1f]'
      }`}
    >
      {/* Header: Tesla Cockpit HUD / Apple Executive */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 ${
          isTeslaDark
            ? 'rounded-[12px] bg-[#111111] border border-[#1F1F1F]'
            : 'rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm'
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1
              className={`text-2xl font-bold ${
                isTeslaDark ? 'font-mono text-white tracking-tight' : 'tracking-[-0.022em] text-[#1d1d1f]'
              }`}
            >
              Operations Overview
            </h1>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold ${
                isTeslaDark
                  ? 'rounded-[4px] bg-[#161616] border border-[#1F1F1F] text-[#00C853] font-mono tracking-[1.5px] uppercase'
                  : 'rounded-[8px] bg-emerald-50 border-[0.5px] border-emerald-200 text-emerald-700 tracking-[-0.011em]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isTeslaDark ? 'bg-[#00C853]' : 'bg-emerald-500'
                }`}
              />
              <span>LIVE TELEMETRY</span>
            </div>
          </div>
          <p
            className={`text-xs ${
              isTeslaDark ? 'text-[#A1A1A6] font-mono' : 'text-zinc-500 tracking-[-0.011em]'
            }`}
          >
            <span className={isTeslaDark ? 'text-white font-medium' : 'text-zinc-800 font-medium'}>
              {site_name}
            </span>{' '}
            • Room{' '}
            <span className={isTeslaDark ? 'text-white font-medium' : 'text-zinc-800 font-medium'}>
              {room_name}
            </span>{' '}
            • Powered by Zabbix 7.0 &amp; Redis 7 Stream
          </p>
        </div>

        {/* Action button to open Floor Plan */}
        <button
          type="button"
          onClick={() => onNavigateToFloorPlan()}
          className={`min-h-[44px] px-5 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer self-start sm:self-auto ${
            isTeslaDark
              ? 'rounded-[6px] bg-[#3E6AE1] hover:bg-[#3256B8] text-white font-mono uppercase tracking-[1px]'
              : 'rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white tracking-[-0.011em] shadow-sm shadow-[#0071E3]/25 hover:scale-[1.02] active:scale-[0.96]'
          }`}
        >
          <Map className="w-4 h-4" />
          <span>2.5D Room Floor Plan</span>
          <ChevronRight className="w-3.5 h-3.5 opacity-80" />
        </button>
      </div>

      {/* Top 5 Metric Cards: Tesla Telemetry Tiles / Apple Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Racks */}
        <div
          className={`flex flex-col justify-between transition-all duration-200 ${
            isTeslaDark
              ? 'rounded-[10px] bg-[#111111] border border-[#1F1F1F] p-5 hover:border-[#2E2E2E]'
              : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm hover:border-black/20 hover:scale-[1.02]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-semibold uppercase ${
                isTeslaDark
                  ? 'text-[10px] font-mono font-bold tracking-[1.5px] text-[#636366]'
                  : 'tracking-wider text-zinc-500'
              }`}
            >
              Cabinets
            </span>
            <div
              className={`w-8 h-8 flex items-center justify-center ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] border border-[#1F1F1F] text-[#3E6AE1]'
                  : 'rounded-[10px] bg-[#0071E3]/10 text-[#0071E3]'
              }`}
            >
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div
              className={`font-bold tracking-tight ${
                isTeslaDark ? 'text-[38px] font-mono text-white leading-none' : 'text-3xl text-[#1d1d1f]'
              }`}
            >
              {total_racks}
            </div>
            <div
              className={`text-xs mt-1 ${
                isTeslaDark ? 'text-[#A1A1A6] font-mono' : 'text-zinc-500 tracking-[-0.011em]'
              }`}
            >
              <span className={isTeslaDark ? 'text-[#00C853] font-semibold' : 'text-emerald-600 font-semibold'}>
                {status_counts.healthy}
              </span>{' '}
              Nominal •{' '}
              <span className={isTeslaDark ? 'text-[#F59E0B] font-semibold' : 'text-amber-600 font-semibold'}>
                {status_counts.warning + status_counts.critical}
              </span>{' '}
              Alert
            </div>
          </div>
          <div
            className={`w-full h-1.5 flex mt-2 overflow-hidden ${
              isTeslaDark ? 'bg-[#1C1C1E] rounded-[2px] p-[0.5px]' : 'bg-black/[0.06] rounded-full'
            }`}
          >
            <div
              className={`h-full transition-all duration-500 ${
                isTeslaDark ? 'bg-[#00C853]' : 'bg-emerald-500'
              }`}
              style={{ width: `${(status_counts.healthy / (total_racks || 1)) * 100}%` }}
            />
            <div
              className={`h-full transition-all duration-500 ${
                isTeslaDark ? 'bg-[#F59E0B]' : 'bg-amber-500'
              }`}
              style={{ width: `${(status_counts.warning / (total_racks || 1)) * 100}%` }}
            />
            <div
              className={`h-full transition-all duration-500 ${
                isTeslaDark ? 'bg-[#E82127]' : 'bg-rose-500'
              }`}
              style={{ width: `${(status_counts.critical / (total_racks || 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Devices */}
        <div
          onClick={onNavigateToDevices}
          className={`flex flex-col justify-between transition-all duration-200 cursor-pointer group ${
            isTeslaDark
              ? 'rounded-[10px] bg-[#111111] border border-[#1F1F1F] p-5 hover:border-[#3E6AE1]'
              : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm hover:border-[#0071E3]/50 hover:scale-[1.02]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-semibold uppercase ${
                isTeslaDark
                  ? 'text-[10px] font-mono font-bold tracking-[1.5px] text-[#636366]'
                  : 'tracking-wider text-zinc-500'
              }`}
            >
              Mounted Devices
            </span>
            <div
              className={`w-8 h-8 flex items-center justify-center transition-transform ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] border border-[#1F1F1F] text-[#3E6AE1] group-hover:scale-105'
                  : 'rounded-[10px] bg-indigo-50 text-indigo-600 group-hover:scale-110'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div
              className={`font-bold tracking-tight ${
                isTeslaDark ? 'text-[38px] font-mono text-white leading-none' : 'text-3xl text-[#1d1d1f]'
              }`}
            >
              {total_devices}
            </div>
            <div
              className={`text-xs mt-1 ${
                isTeslaDark ? 'text-[#A1A1A6] font-mono' : 'text-zinc-500 tracking-[-0.011em]'
              }`}
            >
              Across {total_racks} 42U Enclosures
            </div>
          </div>
          <div
            className={`text-xs font-semibold flex items-center gap-1 transition-transform ${
              isTeslaDark
                ? 'text-[#3E6AE1] font-mono uppercase tracking-[0.5px]'
                : 'text-[#0071E3] group-hover:translate-x-0.5'
            }`}
          >
            <span>Browse Inventory</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Metric 3: Alerts */}
        <div
          onClick={onNavigateToAlerts}
          className={`flex flex-col justify-between transition-all duration-200 cursor-pointer group ${
            isTeslaDark
              ? 'rounded-[10px] bg-[#111111] border border-[#1F1F1F] p-5 hover:border-[#E82127]'
              : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm hover:border-rose-400 hover:scale-[1.02]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-semibold uppercase ${
                isTeslaDark
                  ? 'text-[10px] font-mono font-bold tracking-[1.5px] text-[#636366]'
                  : 'tracking-wider text-zinc-500'
              }`}
            >
              Active Triggers
            </span>
            <div
              className={`w-8 h-8 flex items-center justify-center transition-transform ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] border border-[#1F1F1F] text-[#E82127] group-hover:scale-105'
                  : 'rounded-[10px] bg-rose-50 text-rose-600 group-hover:scale-110'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div
              className={`font-bold tracking-tight flex items-center gap-2 ${
                isTeslaDark ? 'text-[38px] font-mono text-white leading-none' : 'text-3xl text-[#1d1d1f]'
              }`}
            >
              <span>{total_alerts}</span>
              {sev.disaster > 0 && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold ${
                    isTeslaDark
                      ? 'rounded-[2px] bg-[#E82127] text-white font-mono uppercase tracking-[1px]'
                      : 'rounded-[8px] bg-rose-100 text-rose-700 border border-rose-300'
                  }`}
                >
                  {sev.disaster} DISASTER
                </span>
              )}
            </div>
            <div
              className={`text-xs mt-1 ${
                isTeslaDark ? 'text-[#A1A1A6] font-mono' : 'text-zinc-500 tracking-[-0.011em]'
              }`}
            >
              <span className={isTeslaDark ? 'text-[#E82127] font-semibold' : 'text-amber-600 font-semibold'}>
                {sev.high} High
              </span>{' '}
              •{' '}
              <span className={isTeslaDark ? 'text-[#F59E0B] font-semibold' : 'text-yellow-600 font-semibold'}>
                {sev.warning} Warn
              </span>
            </div>
          </div>
          <div
            className={`text-xs font-semibold flex items-center gap-1 transition-transform ${
              isTeslaDark
                ? 'text-[#E82127] font-mono uppercase tracking-[0.5px]'
                : 'text-rose-600 group-hover:translate-x-0.5'
            }`}
          >
            <span>Triage Alerts</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Metric 4: Power */}
        <div
          className={`flex flex-col justify-between transition-all duration-200 ${
            isTeslaDark
              ? 'rounded-[10px] bg-[#111111] border border-[#1F1F1F] p-5 hover:border-[#2E2E2E]'
              : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm hover:border-black/20 hover:scale-[1.02]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-semibold uppercase ${
                isTeslaDark
                  ? 'text-[10px] font-mono font-bold tracking-[1.5px] text-[#636366]'
                  : 'tracking-wider text-zinc-500'
              }`}
            >
              Power Circuit
            </span>
            <div
              className={`w-8 h-8 flex items-center justify-center ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] border border-[#1F1F1F] text-[#F59E0B]'
                  : 'rounded-[10px] bg-amber-50 text-amber-600'
              }`}
            >
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div
              className={`font-bold tracking-tight ${
                isTeslaDark ? 'text-[38px] font-mono text-white leading-none' : 'text-3xl text-[#1d1d1f]'
              }`}
            >
              {totalPower}{' '}
              <span className={`text-base font-normal ${isTeslaDark ? 'text-[#636366]' : 'text-zinc-400'}`}>
                kW
              </span>
            </div>
            <div
              className={`text-xs mt-1 ${
                isTeslaDark ? 'text-[#A1A1A6] font-mono' : 'text-zinc-500 tracking-[-0.011em]'
              }`}
            >
              {powerPct}% of {powerCapacityKW} kW Limit
            </div>
          </div>
          {/* Tesla Battery Gauge / Apple Bar */}
          <div
            className={`w-full overflow-hidden mt-2 ${
              isTeslaDark ? 'bg-[#1C1C1E] h-2 rounded-[2px] p-[1px]' : 'bg-black/[0.06] h-1.5 rounded-full'
            }`}
          >
            <div
              className={`h-full transition-all duration-500 ${
                isTeslaDark
                  ? powerPct > 80
                    ? 'bg-gradient-to-r from-[#E82127] to-[#FF8080] rounded-[1px]'
                    : 'bg-gradient-to-r from-[#00C853] to-[#69F0AE] rounded-[1px]'
                  : powerPct > 80
                  ? 'bg-amber-500 rounded-full'
                  : 'bg-emerald-500 rounded-full'
              }`}
              style={{ width: `${Math.min(powerPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 5: Temperature */}
        <div
          className={`flex flex-col justify-between transition-all duration-200 ${
            isTeslaDark
              ? 'rounded-[10px] bg-[#111111] border border-[#1F1F1F] p-5 hover:border-[#2E2E2E]'
              : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm hover:border-black/20 hover:scale-[1.02]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-semibold uppercase ${
                isTeslaDark
                  ? 'text-[10px] font-mono font-bold tracking-[1.5px] text-[#636366]'
                  : 'tracking-wider text-zinc-500'
              }`}
            >
              Inlet Ambient
            </span>
            <div
              className={`w-8 h-8 flex items-center justify-center ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] border border-[#1F1F1F] text-[#00C853]'
                  : 'rounded-[10px] bg-emerald-50 text-emerald-600'
              }`}
            >
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div
              className={`font-bold tracking-tight ${
                isTeslaDark ? 'text-[38px] font-mono text-white leading-none' : 'text-3xl text-[#1d1d1f]'
              }`}
            >
              {room_temp_c}{' '}
              <span className={`text-base font-normal ${isTeslaDark ? 'text-[#636366]' : 'text-zinc-400'}`}>
                °C
              </span>
            </div>
            <div
              className={`text-xs mt-1 ${
                isTeslaDark ? 'text-[#00C853] font-mono font-semibold' : 'text-emerald-600 font-semibold tracking-[-0.011em]'
              }`}
            >
              ASHRAE TC 9.9 Nominal
            </div>
          </div>
          <div
            className={`w-full overflow-hidden mt-2 ${
              isTeslaDark ? 'bg-[#1C1C1E] h-2 rounded-[2px] p-[1px]' : 'bg-black/[0.06] h-1.5 rounded-full'
            }`}
          >
            <div
              className={`h-full transition-all duration-500 ${
                isTeslaDark
                  ? 'bg-gradient-to-r from-[#00C853] to-[#69F0AE] rounded-[1px]'
                  : 'bg-emerald-500 rounded-full'
              }`}
              style={{ width: '48%' }}
            />
          </div>
        </div>
      </div>

      {/* Middle Grid: Status Matrices & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Cabinet Health Matrix */}
        <div
          className={`flex flex-col justify-between space-y-6 ${
            isTeslaDark
              ? 'rounded-[10px] bg-[#111111] border border-[#1F1F1F] p-6'
              : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-6 shadow-sm'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className={`text-base font-semibold ${
                    isTeslaDark ? 'font-mono text-white tracking-tight' : 'tracking-[-0.022em] text-[#1d1d1f]'
                  }`}
                >
                  Cabinet Health Matrix
                </h3>
                <p className={`text-xs ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 tracking-[-0.011em]'}`}>
                  Distribution across {total_racks} data cabinets
                </p>
              </div>
              <span
                className={`text-xs font-semibold ${
                  isTeslaDark
                    ? 'px-2 py-0.5 rounded-[4px] bg-[#161616] border border-[#1F1F1F] text-[#A1A1A6] font-mono'
                    : 'px-2.5 py-1 rounded-[8px] bg-black/[0.04] text-zinc-700'
                }`}
              >
                {total_racks} Units
              </span>
            </div>

            {/* Segment Bar */}
            <div
              className={`w-full overflow-hidden flex ${
                isTeslaDark ? 'bg-[#1C1C1E] h-2 rounded-[2px] p-[0.5px]' : 'bg-black/[0.06] h-2 rounded-full'
              }`}
            >
              <div
                className={`h-full transition-all duration-500 ${isTeslaDark ? 'bg-[#00C853]' : 'bg-emerald-500'}`}
                style={{ width: `${(status_counts.healthy / (total_racks || 1)) * 100}%` }}
              />
              <div
                className={`h-full transition-all duration-500 ${isTeslaDark ? 'bg-[#F59E0B]' : 'bg-amber-500'}`}
                style={{ width: `${(status_counts.warning / (total_racks || 1)) * 100}%` }}
              />
              <div
                className={`h-full transition-all duration-500 ${isTeslaDark ? 'bg-[#E82127]' : 'bg-rose-500'}`}
                style={{ width: `${(status_counts.critical / (total_racks || 1)) * 100}%` }}
              />
            </div>

            {/* Breakdown Items */}
            <div className="space-y-2 text-xs">
              <div
                className={`flex items-center justify-between p-3 border ${
                  isTeslaDark
                    ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F]'
                    : 'rounded-[12px] bg-black/[0.02] border-black/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isTeslaDark ? 'bg-[#00C853]' : 'bg-emerald-500'
                    }`}
                  />
                  <span className={isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-zinc-700 font-medium'}>
                    Nominal Cabinets
                  </span>
                </div>
                <span className={`font-semibold text-sm ${isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'}`}>
                  {status_counts.healthy}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-3 border ${
                  isTeslaDark
                    ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F]'
                    : 'rounded-[12px] bg-black/[0.02] border-black/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isTeslaDark ? 'bg-[#F59E0B]' : 'bg-amber-500'
                    }`}
                  />
                  <span className={isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-zinc-700 font-medium'}>
                    Warning Cabinets
                  </span>
                </div>
                <span
                  className={`font-semibold text-sm ${
                    isTeslaDark ? 'text-[#F59E0B] font-mono' : 'text-amber-600'
                  }`}
                >
                  {status_counts.warning}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-3 border ${
                  isTeslaDark
                    ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F]'
                    : 'rounded-[12px] bg-black/[0.02] border-black/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isTeslaDark ? 'bg-[#E82127]' : 'bg-rose-500'
                    }`}
                  />
                  <span className={isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-zinc-700 font-medium'}>
                    Critical Cabinets
                  </span>
                </div>
                <span
                  className={`font-semibold text-sm ${
                    isTeslaDark ? 'text-[#E82127] font-mono' : 'text-rose-600'
                  }`}
                >
                  {status_counts.critical}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToFloorPlan()}
            className={`w-full min-h-[44px] py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#161616] hover:bg-[#1C1C1E] border border-[#1F1F1F] text-[#F5F5F7] font-mono uppercase tracking-[0.5px]'
                : 'rounded-[12px] bg-black/[0.03] hover:bg-black/[0.06] border-[0.5px] border-black/10 text-zinc-700 hover:text-black hover:scale-[1.01] active:scale-[0.98]'
            }`}
          >
            <span>Inspect 2.5D Room Floor Plan</span>
            <ChevronRight className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
          </button>
        </div>

        {/* Card 2: Zabbix Trigger Matrix */}
        <div
          className={`flex flex-col justify-between space-y-6 ${
            isTeslaDark
              ? 'rounded-[10px] bg-[#111111] border border-[#1F1F1F] p-6'
              : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-6 shadow-sm'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className={`text-base font-semibold ${
                    isTeslaDark ? 'font-mono text-white tracking-tight' : 'tracking-[-0.022em] text-[#1d1d1f]'
                  }`}
                >
                  Zabbix Trigger Matrix
                </h3>
                <p className={`text-xs ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 tracking-[-0.011em]'}`}>
                  Telemetry triggers sorted by severity
                </p>
              </div>
              <span
                className={`text-xs font-semibold ${
                  isTeslaDark
                    ? 'px-2 py-0.5 rounded-[4px] bg-[#E82127]/20 border border-[#E82127]/40 text-[#E82127] font-mono'
                    : 'px-2.5 py-1 rounded-[8px] bg-rose-50 border-[0.5px] border-rose-200 text-rose-700'
                }`}
              >
                {total_alerts} Problems
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div
                className={`flex items-center justify-between p-2.5 border ${
                  isTeslaDark
                    ? 'rounded-[6px] bg-[#E82127]/15 border-[#E82127]/40 text-[#E82127] font-mono'
                    : 'rounded-[12px] bg-rose-50 border-[0.5px] border-rose-200 text-rose-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" />
                  <span className="font-semibold">Disaster (Severity 5)</span>
                </div>
                <span
                  className={`font-bold px-2 py-0.5 ${
                    isTeslaDark
                      ? 'rounded-[2px] bg-[#E82127] text-white font-mono'
                      : 'rounded-[6px] bg-rose-600 text-white'
                  }`}
                >
                  {sev.disaster}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-2.5 border ${
                  isTeslaDark
                    ? 'rounded-[6px] bg-[#F59E0B]/15 border-[#F59E0B]/40 text-[#F59E0B] font-mono'
                    : 'rounded-[12px] bg-amber-50 border-[0.5px] border-amber-200 text-amber-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4" />
                  <span className="font-semibold">High (Severity 4)</span>
                </div>
                <span
                  className={`font-bold px-2 py-0.5 ${
                    isTeslaDark
                      ? 'rounded-[2px] bg-[#F59E0B] text-black font-mono font-bold'
                      : 'rounded-[6px] bg-amber-600 text-white'
                  }`}
                >
                  {sev.high}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-2.5 border ${
                  isTeslaDark
                    ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F] text-[#F5F5F7] font-mono'
                    : 'rounded-[12px] bg-yellow-50 border-[0.5px] border-yellow-200 text-yellow-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${isTeslaDark ? 'text-amber-400' : ''}`} />
                  <span className="font-semibold">Average (Severity 3)</span>
                </div>
                <span
                  className={`font-bold px-2 py-0.5 ${
                    isTeslaDark
                      ? 'rounded-[2px] bg-[#1C1C1E] text-white border border-[#1F1F1F] font-mono'
                      : 'rounded-[6px] bg-yellow-600 text-white'
                  }`}
                >
                  {sev.average}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-2.5 border ${
                  isTeslaDark
                    ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F] text-[#A1A1A6] font-mono'
                    : 'rounded-[12px] bg-orange-50 border-[0.5px] border-orange-200 text-orange-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Warning (Severity 2)</span>
                </div>
                <span className={isTeslaDark ? 'text-[#A1A1A6] font-mono' : 'text-zinc-700 font-semibold'}>
                  {sev.warning}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-2.5 border ${
                  isTeslaDark
                    ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F] text-[#A1A1A6] font-mono'
                    : 'rounded-[12px] bg-blue-50 border-[0.5px] border-blue-200 text-blue-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span className="font-medium">Information (Severity 1)</span>
                </div>
                <span className={isTeslaDark ? 'text-[#A1A1A6] font-mono' : 'text-zinc-700 font-semibold'}>
                  {sev.info}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToAlerts}
            className={`w-full min-h-[44px] py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#E82127]/20 hover:bg-[#E82127]/30 border border-[#E82127]/50 text-[#E82127] font-mono uppercase tracking-[0.5px]'
                : 'rounded-[12px] bg-rose-50 hover:bg-rose-100 border-[0.5px] border-rose-200 text-rose-700 hover:scale-[1.01] active:scale-[0.98]'
            }`}
          >
            <span>Open Alert Command Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Capacity & Telemetry */}
        <div
          className={`flex flex-col justify-between space-y-6 ${
            isTeslaDark
              ? 'rounded-[10px] bg-[#111111] border border-[#1F1F1F] p-6'
              : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-6 shadow-sm'
          }`}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className={`text-base font-semibold ${
                    isTeslaDark ? 'font-mono text-white tracking-tight' : 'tracking-[-0.022em] text-[#1d1d1f]'
                  }`}
                >
                  Capacity &amp; Telemetry
                </h3>
                <p className={`text-xs ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 tracking-[-0.011em]'}`}>
                  Power load and physical rack units
                </p>
              </div>
              <span
                className={`text-xs font-semibold ${
                  isTeslaDark
                    ? 'px-2 py-0.5 rounded-[4px] bg-[#161616] border border-[#1F1F1F] text-[#A1A1A6] font-mono'
                    : 'px-2.5 py-1 rounded-[8px] bg-black/[0.04] text-zinc-700'
                }`}
              >
                {capacityU} U Total
              </span>
            </div>

            {/* Space Meter */}
            <div
              className={`space-y-2 p-3.5 border ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F]'
                  : 'rounded-[14px] bg-black/[0.02] border-black/10'
              }`}
            >
              <div className="flex justify-between items-center text-xs">
                <span className={isTeslaDark ? 'text-[#636366] font-mono uppercase tracking-[1px] text-[10px]' : 'text-zinc-500 font-medium'}>
                  Rack Space Occupancy
                </span>
                <span className={isTeslaDark ? 'text-white font-mono font-bold' : 'text-[#1d1d1f] font-semibold'}>
                  {usedU} / {capacityU} U ({usagePct}%)
                </span>
              </div>
              <div
                className={`w-full overflow-hidden ${
                  isTeslaDark ? 'bg-[#1C1C1E] h-2 rounded-[2px] p-[1px]' : 'bg-black/[0.06] h-2 rounded-full'
                }`}
              >
                <div
                  className={`h-full transition-all duration-500 ${
                    isTeslaDark
                      ? 'bg-gradient-to-r from-[#3E6AE1] to-[#60A5FA] rounded-[1px]'
                      : 'bg-[#0071E3] rounded-full'
                  }`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
              <div className={`text-[11px] flex justify-between pt-1 ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500'}`}>
                <span>Available: {capacityU - usedU} U</span>
                <span>12 Cabinets × 42U</span>
              </div>
            </div>

            {/* Power Meter */}
            <div
              className={`space-y-2 p-3.5 border ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F]'
                  : 'rounded-[14px] bg-black/[0.02] border-black/10'
              }`}
            >
              <div className="flex justify-between items-center text-xs">
                <span className={isTeslaDark ? 'text-[#636366] font-mono uppercase tracking-[1px] text-[10px]' : 'text-zinc-500 font-medium'}>
                  Power Utilization
                </span>
                <span className={isTeslaDark ? 'text-white font-mono font-bold' : 'text-[#1d1d1f] font-semibold'}>
                  {totalPower} / {powerCapacityKW} kW ({powerPct}%)
                </span>
              </div>
              <div
                className={`w-full overflow-hidden ${
                  isTeslaDark ? 'bg-[#1C1C1E] h-2 rounded-[2px] p-[1px]' : 'bg-black/[0.06] h-2 rounded-full'
                }`}
              >
                <div
                  className={`h-full transition-all duration-500 ${
                    isTeslaDark
                      ? powerPct > 80
                        ? 'bg-gradient-to-r from-[#E82127] to-[#FF8080] rounded-[1px]'
                        : 'bg-gradient-to-r from-[#00C853] to-[#69F0AE] rounded-[1px]'
                      : powerPct > 80
                      ? 'bg-amber-500 rounded-full'
                      : 'bg-emerald-500 rounded-full'
                  }`}
                  style={{ width: `${Math.min(powerPct, 100)}%` }}
                />
              </div>
              <div className={`text-[11px] flex justify-between pt-1 ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500'}`}>
                <span>Headroom: {(powerCapacityKW - totalPower).toFixed(1)} kW</span>
                <span>Breaker: 40 kW</span>
              </div>
            </div>
          </div>

          <div
            className={`p-3 text-xs flex items-center gap-2 border ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F] text-[#00C853] font-mono'
                : 'rounded-[12px] bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 shrink-0 ${isTeslaDark ? 'text-[#00C853]' : 'text-emerald-600'}`} />
            <span>Power &amp; thermal thresholds within nominal envelope</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Critical Attention Racks & Operations Hub */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Top Attention Racks (2 cols) */}
        <div
          className={`xl:col-span-2 flex flex-col justify-between space-y-5 ${
            isTeslaDark
              ? 'rounded-[10px] bg-[#111111] border border-[#1F1F1F] p-6'
              : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-6 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3
                className={`text-base font-semibold ${
                  isTeslaDark ? 'font-mono text-white tracking-tight' : 'tracking-[-0.022em] text-[#1d1d1f]'
                }`}
              >
                High-Priority Attention Cabinets
              </h3>
              <p className={`text-xs ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 tracking-[-0.011em]'}`}>
                Requiring review or showing telemetry warnings
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToFloorPlan()}
              className={`text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                isTeslaDark
                  ? 'text-[#3E6AE1] hover:text-[#60A5FA] font-mono uppercase tracking-[0.5px]'
                  : 'text-[#0071E3] hover:text-[#0077ED]'
              }`}
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
                  className={`p-4 flex flex-col justify-between space-y-4 border transition-all duration-200 ${
                    isTeslaDark
                      ? 'rounded-[8px] bg-[#161616] border-[#1F1F1F] hover:border-[#2E2E2E]'
                      : 'rounded-[16px] bg-black/[0.02] border-black/10 hover:border-black/20 hover:scale-[1.01]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 flex items-center justify-center ${
                            isTeslaDark
                              ? 'rounded-[6px] bg-[#111111] border border-[#1F1F1F] text-[#3E6AE1]'
                              : 'rounded-[10px] bg-black/[0.04] text-zinc-700'
                          }`}
                        >
                          <Server className="w-4 h-4" />
                        </div>
                        <span className={`font-semibold text-sm ${isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'}`}>
                          {rack.name}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          isTeslaDark
                            ? isCrit
                              ? 'rounded-[2px] bg-[#E82127]/20 border border-[#E82127]/40 text-[#E82127] font-mono'
                              : isWarn
                              ? 'rounded-[2px] bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] font-mono'
                              : 'rounded-[2px] bg-[#00C853]/20 border border-[#00C853]/40 text-[#00C853] font-mono'
                            : isCrit
                            ? 'rounded-[8px] bg-rose-50 text-rose-700 border border-rose-200'
                            : isWarn
                            ? 'rounded-[8px] bg-amber-50 text-amber-700 border border-amber-200'
                            : 'rounded-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {rack.status}
                      </span>
                    </div>

                    <div
                      className={`grid grid-cols-3 gap-2 p-2.5 border text-center text-xs ${
                        isTeslaDark
                          ? 'rounded-[6px] bg-[#111111] border-[#1F1F1F]'
                          : 'rounded-[10px] bg-white border-black/10 shadow-2xs'
                      }`}
                    >
                      <div>
                        <span className={`text-[10px] uppercase block ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 font-medium'}`}>
                          Used Space
                        </span>
                        <span className={`font-semibold ${isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'}`}>
                          {rack.used_u}/{rack.total_u} U
                        </span>
                      </div>
                      <div>
                        <span className={`text-[10px] uppercase block ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 font-medium'}`}>
                          Power Load
                        </span>
                        <span className={`font-semibold ${isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'}`}>
                          {rack.power_kw} kW
                        </span>
                      </div>
                      <div>
                        <span className={`text-[10px] uppercase block ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 font-medium'}`}>
                          Inlet Temp
                        </span>
                        <span className={`font-semibold ${isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'}`}>
                          {rack.inlet_temp_c} °C
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigateToRackElevation(rack)}
                      className={`flex-1 min-h-[36px] py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        isTeslaDark
                          ? 'rounded-[4px] bg-[#3E6AE1] hover:bg-[#3256B8] text-white font-mono uppercase tracking-[0.5px]'
                          : 'rounded-[10px] bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm'
                      }`}
                    >
                      Inspect 42U
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToFloorPlan(rack.id)}
                      className={`px-3 min-h-[36px] py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isTeslaDark
                          ? 'rounded-[4px] bg-[#1C1C1E] hover:bg-[#2E2E2E] border border-[#1F1F1F] text-[#A1A1A6] hover:text-white font-mono'
                          : 'rounded-[10px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black'
                      }`}
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
        <div
          className={`flex flex-col justify-between space-y-4 ${
            isTeslaDark
              ? 'rounded-[10px] bg-[#111111] border border-[#1F1F1F] p-6'
              : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-6 shadow-sm'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className={`text-base font-semibold ${
                    isTeslaDark ? 'font-mono text-white tracking-tight' : 'tracking-[-0.022em] text-[#1d1d1f]'
                  }`}
                >
                  Operations Hub
                </h3>
                <p className={`text-xs ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 tracking-[-0.011em]'}`}>
                  Direct navigation shortcuts
                </p>
              </div>
              <span
                className={`text-[10px] font-semibold ${
                  isTeslaDark
                    ? 'px-2 py-0.5 rounded-[4px] bg-[#161616] border border-[#1F1F1F] text-[#3E6AE1] font-mono'
                    : 'px-2 py-0.5 rounded-[6px] bg-black/[0.04] text-zinc-600'
                }`}
              >
                PRO SPEED
              </span>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => onNavigateToFloorPlan()}
                className={`p-3.5 border transition-all cursor-pointer group flex items-center justify-between ${
                  isTeslaDark
                    ? 'rounded-[8px] bg-[#161616] hover:bg-[#1C1C1E] border-[#1F1F1F]'
                    : 'rounded-[14px] bg-black/[0.02] border-black/10 hover:bg-black/[0.04] hover:scale-[1.01]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 flex items-center justify-center transition-transform ${
                      isTeslaDark
                        ? 'rounded-[6px] bg-[#111111] border border-[#1F1F1F] text-[#3E6AE1]'
                        : 'rounded-[12px] bg-[#0071E3]/10 text-[#0071E3] group-hover:scale-105'
                    }`}
                  >
                    <Map className="w-5 h-5" />
                  </div>
                  <div>
                    <span
                      className={`text-sm block ${
                        isTeslaDark ? 'text-white font-mono font-bold' : 'font-semibold text-[#1d1d1f]'
                      }`}
                    >
                      2.5D Room Floor Plan
                    </span>
                    <span className={`text-xs ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500'}`}>
                      12 Cabinets with Live Heatmap &amp; Status
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-all ${
                    isTeslaDark ? 'text-[#636366] group-hover:text-white' : 'text-zinc-400 group-hover:text-black group-hover:translate-x-0.5'
                  }`}
                />
              </div>

              <div
                onClick={onNavigateToDevices}
                className={`p-3.5 border transition-all cursor-pointer group flex items-center justify-between ${
                  isTeslaDark
                    ? 'rounded-[8px] bg-[#161616] hover:bg-[#1C1C1E] border-[#1F1F1F]'
                    : 'rounded-[14px] bg-black/[0.02] border-black/10 hover:bg-black/[0.04] hover:scale-[1.01]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 flex items-center justify-center transition-transform ${
                      isTeslaDark
                        ? 'rounded-[6px] bg-[#111111] border border-[#1F1F1F] text-[#3E6AE1]'
                        : 'rounded-[12px] bg-indigo-50 text-indigo-600 group-hover:scale-105'
                    }`}
                  >
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <span
                      className={`text-sm block ${
                        isTeslaDark ? 'text-white font-mono font-bold' : 'font-semibold text-[#1d1d1f]'
                      }`}
                    >
                      Device Matrix
                    </span>
                    <span className={`text-xs ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500'}`}>
                      Filter &amp; Inspect Hardware Units
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-all ${
                    isTeslaDark ? 'text-[#636366] group-hover:text-white' : 'text-zinc-400 group-hover:text-black group-hover:translate-x-0.5'
                  }`}
                />
              </div>

              <div
                onClick={onNavigateToAlerts}
                className={`p-3.5 border transition-all cursor-pointer group flex items-center justify-between ${
                  isTeslaDark
                    ? 'rounded-[8px] bg-[#161616] hover:bg-[#1C1C1E] border-[#1F1F1F]'
                    : 'rounded-[14px] bg-black/[0.02] border-black/10 hover:bg-black/[0.04] hover:scale-[1.01]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 flex items-center justify-center transition-transform ${
                      isTeslaDark
                        ? 'rounded-[6px] bg-[#111111] border border-[#1F1F1F] text-[#E82127]'
                        : 'rounded-[12px] bg-rose-50 text-rose-600 group-hover:scale-105'
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <span
                      className={`text-sm block ${
                        isTeslaDark ? 'text-white font-mono font-bold' : 'font-semibold text-[#1d1d1f]'
                      }`}
                    >
                      Alerts Command Center
                    </span>
                    <span className={`text-xs ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500'}`}>
                      Triage Active Problems &amp; Triggers
                    </span>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-all ${
                    isTeslaDark ? 'text-[#636366] group-hover:text-white' : 'text-zinc-400 group-hover:text-black group-hover:translate-x-0.5'
                  }`}
                />
              </div>
            </div>
          </div>

          <div
            className={`p-3 text-center text-xs border ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F] text-[#636366] font-mono'
                : 'rounded-[12px] bg-black/[0.02] border-black/5 text-zinc-500'
            }`}
          >
            Datacenter Infrastructure Management • Zabbix 7.0 Engine
          </div>
        </div>
      </div>
    </div>
  )
}
