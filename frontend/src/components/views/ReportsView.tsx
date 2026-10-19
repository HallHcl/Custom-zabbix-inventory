import {
  Zap,
  Thermometer,
  Layers,
  Server,
  Download,
  Activity,
} from 'lucide-react'
import type { RoomOverview } from '../../types'

interface ReportsViewProps {
  overview: RoomOverview | null
}

export function ReportsView({ overview }: ReportsViewProps) {
  if (!overview) {
    return (
      <div className="max-w-[1600px] mx-auto p-12 text-center text-[#85a6b1] noc-panel select-none">
        <Activity className="w-8 h-8 mx-auto mb-3 text-[#8bd7d1] animate-pulse" />
        <p className="text-xs font-mono">Loading Data Center analytics...</p>
      </div>
    )
  }

  const totalCapacityU = overview.total_racks * 42
  const totalUsedU = overview.racks.reduce((acc, r) => acc + r.used_u, 0)
  const totalPowerKW = overview.racks.reduce((acc, r) => acc + r.power_kw, 0)
  const avgTemp = (
    overview.racks.reduce((acc, r) => acc + r.inlet_temp_c, 0) / (overview.racks.length || 1)
  ).toFixed(1)
  const capacityPercent = totalCapacityU > 0 ? Math.round((totalUsedU / totalCapacityU) * 100) : 0

  const handleExportCSV = () => {
    let csv = 'Rack,Row,Col,Used_U,Total_U,Usage_Percent,Power_kW,Inlet_Temp_C,Status\n'
    overview.racks.forEach((r) => {
      csv += `"${r.name}","${r.row}",${r.col},${r.used_u},${r.total_u},${r.usage_percent},${r.power_kw},${r.inlet_temp_c},"${r.status}"\n`
    })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `POP_Report_${overview.room_name.replace(' ', '_')}.csv`
    a.click()
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-3 select-none">
      {/* Sub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#394650]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white font-sans">
              TELEMETRY &amp; CAPACITY ANALYTICS
            </h2>
            <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] font-mono text-[#8bd7d1]">
              AUDIT REPORT
            </span>
          </div>
          <p className="text-xs text-[#85a6b1] font-mono mt-0.5">
            Space, Power, and Thermal utilization report for {overview.site_name} / {overview.room_name}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-3 py-1.5 rounded-[2px] bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] text-[#caedde] text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#8bd7d1]" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Rack Space Utilization */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs mb-1.5">
            <span className="font-mono text-[10px] uppercase">Space Capacity</span>
            <Server className="w-3.5 h-3.5 text-[#85a6b1]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mb-1.5">
            {totalUsedU} / {totalCapacityU} U
          </div>
          <div className="w-full h-1.5 rounded-[1px] bg-[#273139] overflow-hidden mb-1">
            <div
              className="h-full bg-[#8bd7d1] transition-all"
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-[#85a6b1] font-mono">
            {capacityPercent}% Total Allocated
          </span>
        </div>

        {/* Total Power Draw */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs mb-1.5">
            <span className="font-mono text-[10px] uppercase">Facility Power</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mb-1">
            {totalPowerKW.toFixed(1)} kW
          </div>
          <span className="text-[10px] text-[#85a6b1] font-mono">
            Breaker: 40.0 kW ({( (totalPowerKW / 40.0) * 100 ).toFixed(0)}% Load)
          </span>
        </div>

        {/* Average Temperature */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs mb-1.5">
            <span className="font-mono text-[10px] uppercase">Avg Inlet Temp</span>
            <Thermometer className="w-3.5 h-3.5 text-[#8bd7d1]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mb-1">{avgTemp} °C</div>
          <span className="text-[10px] text-[#85a6b1] font-mono">
            Target Ambient: {overview.room_temp_c}°C
          </span>
        </div>

        {/* Monitored Assets */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs mb-1.5">
            <span className="font-mono text-[10px] uppercase">Active Assets</span>
            <Layers className="w-3.5 h-3.5 text-[#85a6b1]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mb-1">
            {overview.total_devices} Units
          </div>
          <span className="text-[10px] text-[#85a6b1] font-mono">
            Across 12 Enclosures
          </span>
        </div>
      </div>

      {/* Rack Usage Distribution Table */}
      <div className="noc-panel overflow-hidden">
        <div className="noc-panel-header">
          <span className="font-mono uppercase tracking-wider text-[11px] text-[#caedde]">
            Enclosure Distribution Matrix
          </span>
          <span className="text-[10px] text-[#85a6b1] font-mono">Room A Overview</span>
        </div>
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#273139] border-b border-[#394650] text-[#85a6b1] uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Cabinet</th>
              <th className="py-2.5 px-3">Row / Position</th>
              <th className="py-2.5 px-3">Space Allocated</th>
              <th className="py-2.5 px-3">Power Draw</th>
              <th className="py-2.5 px-3">Inlet Temp</th>
              <th className="py-2.5 px-3">Posture Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#394650]">
            {overview.racks.map((r) => (
              <tr key={r.id} className="hover:bg-[#252f36] transition-colors">
                <td className="py-2 px-3 font-bold text-white">{r.name}</td>
                <td className="py-2 px-3 text-[#85a6b1]">ROW {r.row} / COL {r.col}</td>
                <td className="py-2 px-3 text-[#caedde]">
                  {r.used_u} / {r.total_u} U ({r.usage_percent}%)
                </td>
                <td className="py-2 px-3 text-amber-400">{r.power_kw} kW</td>
                <td className="py-2 px-3 text-[#8bd7d1]">{r.inlet_temp_c} °C</td>
                <td className="py-2 px-3">
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold uppercase ${
                      r.status === 'critical'
                        ? 'bg-rose-950 text-rose-300 border border-rose-700'
                        : r.status === 'warning'
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : 'bg-[#1a3835] text-[#8bd7d1] border border-[#2b5d58]'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
