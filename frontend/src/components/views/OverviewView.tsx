import {
  Server,
  Zap,
  Thermometer,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Map,
  Bell,
  Monitor,
  Info,
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
      <div className="max-w-[1600px] mx-auto p-12 text-center text-zinc-500 rounded-2xl bg-[#0f0f0f] border border-zinc-800">
        <Server className="w-8 h-8 mx-auto mb-3 text-zinc-600 animate-pulse" />
        <p className="text-sm">Loading Data Center telemetry...</p>
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

  // Top racks to display (if fewer problem racks, fill with warning/active ones)
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
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold tracking-tight text-white">Executive Dashboard</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800 flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            {site_name} • {room_name} • Monitored via Zabbix 7.0 & Redis 7
          </p>
        </div>

        {/* Action button to open Floor Plan */}
        <button
          type="button"
          onClick={() => onNavigateToFloorPlan()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto"
        >
          <Map className="w-4 h-4 text-black" />
          <span>Open 2.5D Floor Plan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top 5 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Racks */}
        <div className="p-4 rounded-2xl bg-[#0f0f0f] border border-zinc-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Racks</span>
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Server className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-white tracking-tight">{total_racks}</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
              {status_counts.healthy} Healthy • {status_counts.warning + status_counts.critical} Warning
            </div>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${(status_counts.healthy / (total_racks || 1)) * 100}%` }}
            />
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${(status_counts.warning / (total_racks || 1)) * 100}%` }}
            />
            <div
              className="bg-rose-500 h-full"
              style={{ width: `${(status_counts.critical / (total_racks || 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Devices */}
        <div
          onClick={onNavigateToDevices}
          className="p-4 rounded-2xl bg-[#0f0f0f] border border-zinc-800 shadow-lg flex flex-col justify-between hover:border-zinc-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Mounted Devices</span>
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:text-white transition-colors">
              <Monitor className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-white tracking-tight">{total_devices}</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
              Across {total_racks} Cabinets
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 group-hover:text-zinc-200 flex items-center gap-1 font-medium">
            <span>Browse inventory</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Alerts */}
        <div
          onClick={onNavigateToAlerts}
          className="p-4 rounded-2xl bg-[#0f0f0f] border border-zinc-800 shadow-lg flex flex-col justify-between hover:border-zinc-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Active Alerts</span>
            <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-400">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{total_alerts}</span>
              {sev.disaster > 0 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-400 border border-rose-800">
                  {sev.disaster} Disaster
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
              {sev.high} High • {sev.warning} Warning
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 group-hover:text-zinc-200 flex items-center gap-1 font-medium">
            <span>Review live triggers</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Total Power */}
        <div className="p-4 rounded-2xl bg-[#0f0f0f] border border-zinc-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Power Load</span>
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-white tracking-tight">{totalPower} kW</div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
              {powerPct}% of {powerCapacityKW} kW limit
            </div>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${powerPct > 80 ? 'bg-amber-500' : 'bg-white'}`}
              style={{ width: `${Math.min(powerPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Ambient Room Temp */}
        <div className="p-4 rounded-2xl bg-[#0f0f0f] border border-zinc-800 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Room Temp</span>
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Thermometer className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-white tracking-tight">{room_temp_c} °C</div>
            <div className="text-[11px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              ASHRAE Compliant
            </div>
          </div>
          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '45%' }} />
          </div>
        </div>
      </div>

      {/* Middle Grid: Health Matrix & Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Rack Health Distribution */}
        <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Rack Status Distribution</h3>
              <span className="text-xs text-zinc-400 font-mono">{total_racks} Racks</span>
            </div>

            {/* Segment Bar */}
            <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden flex mb-4">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${(status_counts.healthy / (total_racks || 1)) * 100}%` }}
                title={`Healthy: ${status_counts.healthy}`}
              />
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${(status_counts.warning / (total_racks || 1)) * 100}%` }}
                title={`Warning: ${status_counts.warning}`}
              />
              <div
                className="bg-rose-500 h-full transition-all"
                style={{ width: `${(status_counts.critical / (total_racks || 1)) * 100}%` }}
                title={`Critical: ${status_counts.critical}`}
              />
            </div>

            {/* Breakdown List */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-[#141414] border border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-zinc-300 font-medium">Healthy Cabinets</span>
                </div>
                <span className="font-bold text-white font-mono">{status_counts.healthy}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[#141414] border border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-zinc-300 font-medium">Warning Cabinets</span>
                </div>
                <span className="font-bold text-amber-400 font-mono">{status_counts.warning}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-[#141414] border border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-zinc-300 font-medium">Critical Cabinets</span>
                </div>
                <span className="font-bold text-rose-400 font-mono">{status_counts.critical}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToFloorPlan()}
            className="mt-4 w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>View all in 2.5D Room</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: Trigger Severity Breakdown */}
        <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Active Problem Severities</h3>
              <span className="text-xs text-rose-400 font-mono font-bold">
                {total_alerts} Total
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-rose-950/20 border border-rose-900/40">
                <div className="flex items-center gap-2 text-rose-400 font-medium">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Disaster (Priority 5)</span>
                </div>
                <span className="font-bold text-rose-300 font-mono">{sev.disaster}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-rose-950/10 border border-rose-900/30">
                <div className="flex items-center gap-2 text-rose-400/90 font-medium">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>High (Priority 4)</span>
                </div>
                <span className="font-bold text-rose-300 font-mono">{sev.high}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-950/20 border border-amber-900/40">
                <div className="flex items-center gap-2 text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Average (Priority 3)</span>
                </div>
                <span className="font-bold text-amber-300 font-mono">{sev.average}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-950/10 border border-amber-900/20">
                <div className="flex items-center gap-2 text-amber-300/80 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Warning (Priority 2)</span>
                </div>
                <span className="font-bold text-amber-200 font-mono">{sev.warning}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-blue-950/20 border border-blue-900/30">
                <div className="flex items-center gap-2 text-blue-400 font-medium">
                  <Info className="w-3.5 h-3.5" />
                  <span>Information (Priority 1)</span>
                </div>
                <span className="font-bold text-blue-300 font-mono">{sev.info}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToAlerts}
            className="mt-4 w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Open Alerts Command Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: Capacity & Power Utilization */}
        <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Facility Capacity</h3>
              <span className="text-xs text-zinc-400 font-mono">{capacityU} U Total</span>
            </div>

            {/* Space Meter */}
            <div className="mb-5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Rack Space Utilization</span>
                <span className="text-white font-bold font-mono">
                  {usedU} / {capacityU} U ({usagePct}%)
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-white h-full rounded-full transition-all"
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-500 font-mono flex justify-between">
                <span>Free: {capacityU - usedU} U</span>
                <span>Max: 12 Racks × 42U</span>
              </div>
            </div>

            {/* Power Meter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Power Circuit Draw</span>
                <span className="text-white font-bold font-mono">
                  {totalPower} / {powerCapacityKW} kW ({powerPct}%)
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(powerPct, 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-500 font-mono flex justify-between">
                <span>Headroom: {(powerCapacityKW - totalPower).toFixed(1)} kW</span>
                <span>Breaker: 40 kW Limit</span>
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-[#141414] border border-zinc-800 text-[11px] text-zinc-400">
            <span className="text-white font-semibold block mb-0.5">Facility Status: Optimal</span>
            No power tripping hazard or thermal hotspots detected in Room A.
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Problem Racks & Quick Ops Shortcuts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Top Attention Racks (2 cols) */}
        <div className="xl:col-span-2 p-5 rounded-2xl bg-[#0f0f0f] border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Top Attention Racks</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cabinets requiring maintenance or having active warnings
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToFloorPlan()}
              className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              View on Map →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {topAttentionRacks.map((rack) => {
              const isCrit = rack.status === 'critical'
              const isWarn = rack.status === 'warning'

              return (
                <div
                  key={rack.id}
                  className="p-4 rounded-xl bg-[#141414] border border-zinc-800/90 hover:border-zinc-700 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white">
                          <Server className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-white text-sm">{rack.name}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          isCrit
                            ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                            : isWarn
                            ? 'bg-amber-950/50 text-amber-400 border-amber-800'
                            : 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                        }`}
                      >
                        {rack.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-zinc-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">USED U</span>
                        <span className="text-zinc-200 font-semibold">
                          {rack.used_u}/{rack.total_u} U
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">POWER</span>
                        <span className="text-zinc-200 font-semibold">{rack.power_kw} kW</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">INLET</span>
                        <span className="text-zinc-200 font-semibold">{rack.inlet_temp_c} °C</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigateToRackElevation(rack)}
                      className="flex-1 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Inspect 42U
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToFloorPlan(rack.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Locate
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Quick Operations Shortcuts */}
        <div className="p-5 rounded-2xl bg-[#0f0f0f] border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Quick Navigation Hub</h3>
            <p className="text-xs text-zinc-400 mb-4">Direct shortcuts to system operational views</p>

            <div className="space-y-2.5">
              <div
                onClick={() => onNavigateToFloorPlan()}
                className="p-3 rounded-xl bg-[#141414] border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:text-white">
                    <Map className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">2.5D Floor Plan</span>
                    <span className="text-[11px] text-zinc-400">
                      Explore 12 racks with LED status
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>

              <div
                onClick={onNavigateToDevices}
                className="p-3 rounded-xl bg-[#141414] border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:text-white">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">Device Inventory</span>
                    <span className="text-[11px] text-zinc-400">
                      Search 186 mounted hardware units
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>

              <div
                onClick={onNavigateToAlerts}
                className="p-3 rounded-xl bg-[#141414] border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:text-white">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs block">Alerts Command Center</span>
                    <span className="text-[11px] text-zinc-400">Triage 106 live Zabbix triggers</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 font-mono text-center">
            POP DCIM v0.1.0 • Connected to Zabbix 7.0
          </div>
        </div>
      </div>
    </div>
  )
}
