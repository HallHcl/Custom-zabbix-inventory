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
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
            <AlertOctagon className="w-3 h-3" />
            CRIT
          </span>
        )
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
            <AlertTriangle className="w-3 h-3" />
            WARN
          </span>
        )
      case 'healthy':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold bg-[#1a3835] text-[#8bd7d1] border border-[#2b5d58]">
            <CheckCircle2 className="w-3 h-3" />
            NOMINAL
          </span>
        )
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-3 select-none">
      <div className="flex items-center justify-between pb-3 border-b border-[#394650]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white font-sans">
              CABINET ENCLOSURE MATRIX
            </h2>
            <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] font-mono text-[#8bd7d1]">
              {racks.length} ENCLOSURES
            </span>
          </div>
          <p className="text-xs text-[#85a6b1] font-mono mt-0.5">
            Room A Facility Grid • Select any cabinet to inspect 42U rack elevation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {racks.map((rack) => (
          <div
            key={rack.id}
            onClick={() => onSelectRack(rack)}
            className="noc-panel p-3.5 hover:border-[#50626f] transition-colors cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[#8bd7d1]">
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-white text-xs font-mono group-hover:text-[#8bd7d1] transition-colors">
                    {rack.name}
                  </h3>
                </div>
                {getStatusBadge(rack.status)}
              </div>

              <div className="text-[10px] text-[#85a6b1] font-mono mb-3">
                ROW {rack.row} / COL {rack.col}
              </div>

              {/* Progress bar */}
              <div className="mb-3 space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-[#85a6b1]">
                  <span>Occupancy</span>
                  <span className="font-bold text-[#caedde]">
                    {rack.used_u}/{rack.total_u} U ({rack.usage_percent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-[1px] bg-[#273139] overflow-hidden">
                  <div
                    className="h-full bg-[#8bd7d1] transition-all duration-300"
                    style={{ width: `${Math.min(rack.usage_percent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-1.5 text-xs font-mono py-2 border-t border-[#394650]">
                <div className="text-center p-1.5 rounded-[2px] bg-[#273139] border border-[#394650]">
                  <div className="text-[#85a6b1] text-[9px] flex items-center justify-center gap-1 mb-0.5">
                    <Database className="w-2.5 h-2.5" />
                    UNITS
                  </div>
                  <div className="font-bold text-[#caedde] text-[11px]">{rack.device_count}</div>
                </div>
                <div className="text-center p-1.5 rounded-[2px] bg-[#273139] border border-[#394650]">
                  <div className="text-[#85a6b1] text-[9px] flex items-center justify-center gap-1 mb-0.5">
                    <Zap className="w-2.5 h-2.5" />
                    POWER
                  </div>
                  <div className="font-bold text-amber-400 text-[11px]">{rack.power_kw} kW</div>
                </div>
                <div className="text-center p-1.5 rounded-[2px] bg-[#273139] border border-[#394650]">
                  <div className="text-[#85a6b1] text-[9px] flex items-center justify-center gap-1 mb-0.5">
                    <Thermometer className="w-2.5 h-2.5" />
                    INLET
                  </div>
                  <div className="font-bold text-[#8bd7d1] text-[11px]">{rack.inlet_temp_c}°C</div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-[#394650] flex items-center justify-between text-xs font-mono text-[#85a6b1] group-hover:text-[#caedde] transition-colors">
              <span className="text-[11px]">Inspect 42U Elevation</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#8bd7d1] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
