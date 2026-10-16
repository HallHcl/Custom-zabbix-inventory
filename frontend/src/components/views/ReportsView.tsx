import {
  Zap,
  Thermometer,
  Layers,
  Server,
  Download,
} from 'lucide-react'
import type { RoomOverview } from '../../types'

interface ReportsViewProps {
  overview: RoomOverview | null
}

export function ReportsView({ overview }: ReportsViewProps) {
  if (!overview) return null

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
    a.download = `DC_Vision_Report_${overview.room_name.replace(' ', '_')}.csv`
    a.click()
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Data Center Analytics</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Capacity, Thermal, and Power Utilization Report for {overview.site_name} /{' '}
            {overview.room_name}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-zinc-300" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Rack Space Utilization */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Total U Capacity</span>
            <div className="p-2 rounded-xl bg-zinc-900 text-zinc-300">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {totalUsedU} / {totalCapacityU} U
          </div>
          <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden mb-1">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${capacityPercent}%` }}
            />
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">
            {capacityPercent}% Total Allocated
          </span>
        </div>

        {/* Total Power Draw */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Total Power Load</span>
            <div className="p-2 rounded-xl bg-zinc-900 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {totalPowerKW.toFixed(1)} kW
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">
            Threshold: 96.0 kW (26% Used)
          </span>
        </div>

        {/* Average Temperature */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Avg Inlet Temp</span>
            <div className="p-2 rounded-xl bg-zinc-900 text-teal-400">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{avgTemp} °C</div>
          <span className="text-[11px] text-zinc-500 font-medium">
            Target Ambient: {overview.room_temp_c}°C
          </span>
        </div>

        {/* Monitored Assets */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Active Assets</span>
            <div className="p-2 rounded-xl bg-zinc-900 text-zinc-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {overview.total_devices} Devices
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">
            Across 12 Server Cabinets
          </span>
        </div>
      </div>

      {/* Rack Usage Distribution Table */}
      <div className="rounded-2xl bg-[#0f0f0f] border border-zinc-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Rack Space & Power Distribution</h3>
          <span className="text-xs text-zinc-400">Room A Overview</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-[#141414] border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-5">Rack</th>
              <th className="py-3 px-4">Row / Position</th>
              <th className="py-3 px-4">Space Used</th>
              <th className="py-3 px-4">Power</th>
              <th className="py-3 px-4">Inlet Temp</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {overview.racks.map((r) => (
              <tr key={r.id} className="hover:bg-zinc-900/60 transition-colors">
                <td className="py-3 px-5 font-bold text-white">{r.name}</td>
                <td className="py-3 px-4 text-zinc-400">{r.row} • Col {r.col}</td>
                <td className="py-3 px-4 font-mono text-zinc-300">
                  {r.used_u} / {r.total_u} U ({r.usage_percent}%)
                </td>
                <td className="py-3 px-4 font-mono text-zinc-300">{r.power_kw} kW</td>
                <td className="py-3 px-4 font-mono text-zinc-300">{r.inlet_temp_c} °C</td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      r.status === 'critical'
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                        : r.status === 'warning'
                        ? 'bg-amber-950/50 text-amber-400 border border-amber-800'
                        : 'bg-emerald-950/50 text-emerald-400 border border-emerald-800'
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
