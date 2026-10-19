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
      <div className="max-w-[1600px] mx-auto p-12 text-center text-[#85a6b1] noc-panel">
        <Activity className="w-8 h-8 mx-auto mb-3 text-[#8bd7d1] animate-pulse" />
        <p className="text-xs font-mono">Synchronizing DC Telemetry Stream...</p>
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
    <div className="max-w-[1600px] mx-auto space-y-4 select-none">
      {/* Top NOC Facility Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#394650]">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-[#8bd7d1] animate-pulse" />
            <h2 className="text-lg font-bold tracking-tight text-white font-sans">
              FACILITY TELEMETRY CONSOLE
            </h2>
            <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] font-mono text-[#8bd7d1]">
              LIVE
            </span>
          </div>
          <p className="text-xs text-[#85a6b1] font-mono">
            {site_name} / {room_name} • Real-time Zabbix 7.0 &amp; Redis 7 Cache Engine
          </p>
        </div>

        {/* Action button to open Floor Plan */}
        <button
          type="button"
          onClick={() => onNavigateToFloorPlan()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[3px] bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] text-[#caedde] font-medium text-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Map className="w-3.5 h-3.5 text-[#8bd7d1]" />
          <span>2.5D Room Floor Plan</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#85a6b1]" />
        </button>
      </div>

      {/* Top 5 High-Density Metric Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Racks */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs">
            <span className="font-mono uppercase tracking-wider text-[10px]">Rack Cabinets</span>
            <Server className="w-3.5 h-3.5 text-[#85a6b1]" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-white font-mono tracking-tight">{total_racks}</div>
            <div className="text-[11px] text-[#85a6b1] font-mono">
              {status_counts.healthy} Nominal • {status_counts.warning + status_counts.critical} Warning
            </div>
          </div>
          <div className="w-full bg-[#34424b] h-1.5 rounded-[1px] overflow-hidden flex">
            <div
              className="bg-[#8bd7d1] h-full"
              style={{ width: `${(status_counts.healthy / (total_racks || 1)) * 100}%` }}
            />
            <div
              className="bg-amber-400 h-full"
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
          className="noc-panel p-3.5 flex flex-col justify-between hover:border-[#50626f] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#85a6b1] text-xs">
            <span className="font-mono uppercase tracking-wider text-[10px]">Mounted Devices</span>
            <Monitor className="w-3.5 h-3.5 text-[#85a6b1] group-hover:text-[#caedde]" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-white font-mono tracking-tight">{total_devices}</div>
            <div className="text-[11px] text-[#85a6b1] font-mono">
              Across {total_racks} 42U Enclosures
            </div>
          </div>
          <div className="text-[11px] text-[#8bd7d1] group-hover:underline flex items-center gap-1 font-mono">
            <span>Browse Inventory</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Alerts */}
        <div
          onClick={onNavigateToAlerts}
          className="noc-panel p-3.5 flex flex-col justify-between hover:border-[#50626f] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#85a6b1] text-xs">
            <span className="font-mono uppercase tracking-wider text-[10px]">Active Triggers</span>
            <Bell className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
              <span>{total_alerts}</span>
              {sev.disaster > 0 && (
                <span className="px-1.5 py-0.2 rounded-[2px] text-[10px] bg-rose-950 text-rose-300 border border-rose-700 font-mono font-bold">
                  {sev.disaster} DISASTER
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#85a6b1] font-mono">
              {sev.high} High • {sev.warning} Warn
            </div>
          </div>
          <div className="text-[11px] text-rose-400 group-hover:underline flex items-center gap-1 font-mono">
            <span>Triage Alerts</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Total Power */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs">
            <span className="font-mono uppercase tracking-wider text-[10px]">Power Circuit Load</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-white font-mono tracking-tight">{totalPower} kW</div>
            <div className="text-[11px] text-[#85a6b1] font-mono">
              {powerPct}% of {powerCapacityKW} kW Limit
            </div>
          </div>
          <div className="w-full bg-[#34424b] h-1.5 rounded-[1px] overflow-hidden">
            <div
              className={`h-full ${powerPct > 80 ? 'bg-amber-400' : 'bg-[#8bd7d1]'}`}
              style={{ width: `${Math.min(powerPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Ambient Room Temp */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs">
            <span className="font-mono uppercase tracking-wider text-[10px]">Inlet Ambient</span>
            <Thermometer className="w-3.5 h-3.5 text-[#8bd7d1]" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-bold text-white font-mono tracking-tight">{room_temp_c} °C</div>
            <div className="text-[11px] text-[#8bd7d1] font-mono">
              Nominal (ASHRAE TC 9.9)
            </div>
          </div>
          <div className="w-full bg-[#34424b] h-1.5 rounded-[1px] overflow-hidden">
            <div className="bg-[#8bd7d1] h-full" style={{ width: '48%' }} />
          </div>
        </div>
      </div>

      {/* Middle Grid: Status Matrices & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Card 1: Rack Health Distribution */}
        <div className="noc-panel flex flex-col justify-between">
          <div>
            <div className="noc-panel-header">
              <span className="font-mono uppercase tracking-wider text-[11px]">Cabinet Health Matrix</span>
              <span className="text-[11px] text-[#85a6b1] font-mono">{total_racks} Units</span>
            </div>

            <div className="p-3.5 space-y-3">
              {/* Status Segment Bar */}
              <div className="w-full bg-[#34424b] h-2.5 rounded-[2px] overflow-hidden flex">
                <div
                  className="bg-[#8bd7d1] h-full"
                  style={{ width: `${(status_counts.healthy / (total_racks || 1)) * 100}%` }}
                />
                <div
                  className="bg-amber-400 h-full"
                  style={{ width: `${(status_counts.warning / (total_racks || 1)) * 100}%` }}
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${(status_counts.critical / (total_racks || 1)) * 100}%` }}
                />
              </div>

              {/* Status Breakdown Table */}
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded-[2px] bg-[#273139] border border-[#394650]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#8bd7d1]" />
                    <span className="text-[#caedde]">Nominal Status</span>
                  </div>
                  <span className="font-bold text-white">{status_counts.healthy}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-[2px] bg-[#273139] border border-[#394650]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-[#caedde]">Warning Status</span>
                  </div>
                  <span className="font-bold text-amber-400">{status_counts.warning}</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-[2px] bg-[#273139] border border-[#394650]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-[#caedde]">Critical Status</span>
                  </div>
                  <span className="font-bold text-rose-400">{status_counts.critical}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[#394650] bg-[#20282f]">
            <button
              type="button"
              onClick={() => onNavigateToFloorPlan()}
              className="w-full py-1.5 rounded-[3px] bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] text-[#caedde] hover:text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Inspect in 2.5D Floor Plan</span>
              <ChevronRight className="w-3 h-3 text-[#8bd7d1]" />
            </button>
          </div>
        </div>

        {/* Card 2: Zabbix Problem Severities Matrix */}
        <div className="noc-panel flex flex-col justify-between">
          <div>
            <div className="noc-panel-header">
              <span className="font-mono uppercase tracking-wider text-[11px]">Zabbix Trigger Matrix</span>
              <span className="text-[11px] text-rose-400 font-mono font-bold">
                {total_alerts} Problems
              </span>
            </div>

            <div className="p-3.5 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-[2px] bg-rose-950/20 border border-rose-900/40">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Disaster (Severity 5)</span>
                </div>
                <span className="font-bold text-rose-300">{sev.disaster}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-[2px] bg-rose-950/15 border border-rose-900/30">
                <div className="flex items-center gap-2 text-rose-400/90">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>High (Severity 4)</span>
                </div>
                <span className="font-bold text-rose-300">{sev.high}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-[2px] bg-amber-950/20 border border-amber-900/40">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Average (Severity 3)</span>
                </div>
                <span className="font-bold text-amber-300">{sev.average}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-[2px] bg-amber-950/10 border border-amber-900/25">
                <div className="flex items-center gap-2 text-amber-300/80">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Warning (Severity 2)</span>
                </div>
                <span className="font-bold text-amber-200">{sev.warning}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-[2px] bg-sky-950/20 border border-sky-900/30">
                <div className="flex items-center gap-2 text-sky-400">
                  <Info className="w-3.5 h-3.5" />
                  <span>Info (Severity 1)</span>
                </div>
                <span className="font-bold text-sky-300">{sev.info}</span>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[#394650] bg-[#20282f]">
            <button
              type="button"
              onClick={onNavigateToAlerts}
              className="w-full py-1.5 rounded-[3px] bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] text-[#caedde] hover:text-white text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Open Alert Triage View</span>
              <ChevronRight className="w-3 h-3 text-[#8bd7d1]" />
            </button>
          </div>
        </div>

        {/* Card 3: Facility Space & Power Telemetry */}
        <div className="noc-panel flex flex-col justify-between">
          <div>
            <div className="noc-panel-header">
              <span className="font-mono uppercase tracking-wider text-[11px]">Capacity &amp; Telemetry</span>
              <span className="text-[11px] text-[#85a6b1] font-mono">{capacityU} U Total</span>
            </div>

            <div className="p-3.5 space-y-4">
              {/* Space Meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#85a6b1]">Rack Space Occupancy</span>
                  <span className="text-white font-bold">
                    {usedU} / {capacityU} U ({usagePct}%)
                  </span>
                </div>
                <div className="w-full bg-[#34424b] h-2 rounded-[2px] overflow-hidden">
                  <div
                    className="bg-[#8bd7d1] h-full"
                    style={{ width: `${Math.min(usagePct, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-[#85a6b1] font-mono flex justify-between">
                  <span>Available: {capacityU - usedU} U</span>
                  <span>12 Racks × 42U</span>
                </div>
              </div>

              {/* Power Meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#85a6b1]">Power Circuit Utilization</span>
                  <span className="text-white font-bold">
                    {totalPower} / {powerCapacityKW} kW ({powerPct}%)
                  </span>
                </div>
                <div className="w-full bg-[#34424b] h-2 rounded-[2px] overflow-hidden">
                  <div
                    className="bg-[#8bd7d1] h-full"
                    style={{ width: `${Math.min(powerPct, 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-[#85a6b1] font-mono flex justify-between">
                  <span>Headroom: {(powerCapacityKW - totalPower).toFixed(1)} kW</span>
                  <span>Breaker Limit: 40 kW</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[#394650] bg-[#20282f] text-[11px] font-mono text-[#85a6b1] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8bd7d1]" />
            <span>Power &amp; Thermal thresholds nominal</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Critical Attention Racks & Operations Hub */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Left: Top Attention Racks (2 cols) */}
        <div className="xl:col-span-2 noc-panel">
          <div className="noc-panel-header">
            <div>
              <span className="font-mono uppercase tracking-wider text-[11px] text-[#caedde]">
                High-Priority Attention Cabinets
              </span>
              <span className="text-[10px] text-[#85a6b1] ml-2 font-mono">
                Requiring review or showing telemetry warnings
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToFloorPlan()}
              className="text-xs font-mono text-[#8bd7d1] hover:underline cursor-pointer"
            >
              Floor Plan View →
            </button>
          </div>

          <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {topAttentionRacks.map((rack) => {
              const isCrit = rack.status === 'critical'
              const isWarn = rack.status === 'warning'

              return (
                <div
                  key={rack.id}
                  className="p-3 rounded-[3px] bg-[#273139] border border-[#394650] hover:border-[#50626f] transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-[#8bd7d1]" />
                        <span className="font-bold text-white text-xs font-mono">{rack.name}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold border uppercase ${
                          isCrit
                            ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                            : isWarn
                            ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                        }`}
                      >
                        {rack.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-1.5 border-y border-[#394650] text-[10px] font-mono">
                      <div>
                        <span className="text-[#85a6b1] block">USED U</span>
                        <span className="text-[#caedde] font-bold">
                          {rack.used_u}/{rack.total_u} U
                        </span>
                      </div>
                      <div>
                        <span className="text-[#85a6b1] block">LOAD</span>
                        <span className="text-[#caedde] font-bold">{rack.power_kw} kW</span>
                      </div>
                      <div>
                        <span className="text-[#85a6b1] block">INLET</span>
                        <span className="text-[#caedde] font-bold">{rack.inlet_temp_c} °C</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onNavigateToRackElevation(rack)}
                      className="flex-1 py-1 rounded-[2px] bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] text-[#8bd7d1] text-xs font-mono font-medium transition-colors cursor-pointer"
                    >
                      Inspect 42U
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToFloorPlan(rack.id)}
                      className="px-2.5 py-1 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-[#85a6b1] hover:text-white text-xs font-mono transition-colors cursor-pointer"
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
        <div className="noc-panel flex flex-col justify-between">
          <div>
            <div className="noc-panel-header">
              <span className="font-mono uppercase tracking-wider text-[11px]">Operations Hub</span>
              <span className="text-[10px] text-[#85a6b1] font-mono">Direct Jump</span>
            </div>

            <div className="p-3.5 space-y-2">
              <div
                onClick={() => onNavigateToFloorPlan()}
                className="p-2.5 rounded-[3px] bg-[#273139] border border-[#394650] hover:border-[#50626f] transition-colors cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Map className="w-4 h-4 text-[#8bd7d1]" />
                  <div>
                    <span className="font-bold text-white text-xs block font-sans">2.5D Room Floor Plan</span>
                    <span className="text-[10px] text-[#85a6b1] font-mono">
                      12 Cabinets with Live Heatmap &amp; Status
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#85a6b1] group-hover:text-white" />
              </div>

              <div
                onClick={onNavigateToDevices}
                className="p-2.5 rounded-[3px] bg-[#273139] border border-[#394650] hover:border-[#50626f] transition-colors cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Monitor className="w-4 h-4 text-[#8bd7d1]" />
                  <div>
                    <span className="font-bold text-white text-xs block font-sans">Device Matrix</span>
                    <span className="text-[10px] text-[#85a6b1] font-mono">
                      Filter &amp; Inspect 186 Hardware Units
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#85a6b1] group-hover:text-white" />
              </div>

              <div
                onClick={onNavigateToAlerts}
                className="p-2.5 rounded-[3px] bg-[#273139] border border-[#394650] hover:border-[#50626f] transition-colors cursor-pointer group flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="font-bold text-white text-xs block font-sans">Alerts Command Center</span>
                    <span className="text-[10px] text-[#85a6b1] font-mono">
                      Triage Active Problems &amp; Triggers
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#85a6b1] group-hover:text-white" />
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-[#394650] bg-[#20282f] text-[10px] text-[#85a6b1] font-mono text-center">
            POP DCIM • Real-time Zabbix 7.0 Engine
          </div>
        </div>
      </div>
    </div>
  )
}
