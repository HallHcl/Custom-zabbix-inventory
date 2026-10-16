import { Server, Zap, Thermometer, Database, ChevronRight, AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react'
import type { RackSummary } from '../../types'

interface RacksViewProps {
  racks: RackSummary[]
  onSelectRack: (rack: RackSummary) => void
}

export function RacksView({ racks, onSelectRack }: RacksViewProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/40 text-rose-400 border border-rose-800/60">
            <AlertOctagon className="w-3.5 h-3.5" />
            Critical
          </span>
        )
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/40 text-amber-400 border border-amber-800/60">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warning
          </span>
        )
      case 'healthy':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Healthy
          </span>
        )
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Rack Cabinets</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Total 12 Racks in Room A • Click any rack to view 42U Elevation & Server Slots
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {racks.map((rack) => (
          <div
            key={rack.id}
            onClick={() => onSelectRack(rack)}
            className="p-5 rounded-2xl bg-[#111111] border border-zinc-800/80 hover:border-zinc-600 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-2xl group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:text-white transition-colors">
                    <Server className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-white text-base group-hover:text-zinc-200">
                    {rack.name}
                  </h3>
                </div>
                {getStatusBadge(rack.status)}
              </div>

              <div className="text-xs text-zinc-400 mb-4">{rack.row} • Position Col {rack.col}</div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5 text-zinc-400">
                  <span>Capacity</span>
                  <span className="font-semibold text-white">
                    {rack.used_u} / {rack.total_u} U ({rack.usage_percent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full bg-zinc-300 group-hover:bg-white rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(rack.usage_percent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-2 text-xs py-2 border-t border-zinc-800/80">
                <div className="text-center p-2 rounded-lg bg-zinc-900/60">
                  <div className="text-zinc-500 text-[10px] flex items-center justify-center gap-1 mb-0.5">
                    <Database className="w-3 h-3" />
                    Devices
                  </div>
                  <div className="font-semibold text-white">{rack.device_count}</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-zinc-900/60">
                  <div className="text-zinc-500 text-[10px] flex items-center justify-center gap-1 mb-0.5">
                    <Zap className="w-3 h-3" />
                    Power
                  </div>
                  <div className="font-semibold text-white">{rack.power_kw} kW</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-zinc-900/60">
                  <div className="text-zinc-500 text-[10px] flex items-center justify-center gap-1 mb-0.5">
                    <Thermometer className="w-3 h-3" />
                    Temp
                  </div>
                  <div className="font-semibold text-white">{rack.inlet_temp_c}°C</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400 group-hover:text-white transition-colors">
              <span className="font-medium">Open 42U Elevation</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
