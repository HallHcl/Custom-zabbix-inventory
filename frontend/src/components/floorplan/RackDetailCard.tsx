import {
  Server,
  Zap,
  Thermometer,
  Database,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react'
import type { RackSummary } from '../../types'

interface RackDetailCardProps {
  rack: RackSummary | null
  onViewRackElevation: (rack: RackSummary) => void
}

export function RackDetailCard({ rack, onViewRackElevation }: RackDetailCardProps) {
  if (!rack) {
    return (
      <div className="p-6 rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm flex flex-col items-center justify-center text-center text-zinc-500 h-full min-h-[340px] select-none">
        <Server className="w-10 h-10 mb-2 text-zinc-400" />
        <span className="text-xs font-medium">Select a cabinet on the 2.5D floor plan</span>
      </div>
    )
  }

  const getStatusBadge = () => {
    switch (rack.status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[10px] font-bold bg-[#ff3b30]/15 text-[#ff3b30] border-[0.5px] border-[#ff3b30]/30">
            <AlertOctagon className="w-3 h-3" />
            CRITICAL
          </span>
        )
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[10px] font-bold bg-[#ff9500]/15 text-[#ff9500] border-[0.5px] border-[#ff9500]/30">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        )
      case 'healthy':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[10px] font-bold bg-[#34c759]/15 text-[#34c759] border-[0.5px] border-[#34c759]/30">
            <CheckCircle2 className="w-3 h-3 text-[#34c759]" />
            NOMINAL
          </span>
        )
    }
  }

  return (
    <div className="p-5 rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm flex flex-col justify-between select-none text-[#1d1d1f]">
      <div>
        {/* Header Title & Status */}
        <div className="flex items-center justify-between mb-1 pb-3 border-b border-black/10">
          <div>
            <h2 className="text-base font-bold text-[#1d1d1f] tracking-tight">{rack.name}</h2>
            <span className="text-[11px] text-zinc-500 font-medium">ROW {rack.row} / COL {rack.col}</span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Space Usage Progress */}
        <div className="my-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-zinc-600 font-medium">
              <Server className="w-3.5 h-3.5 text-zinc-500" />
              <span>Space Occupancy</span>
            </div>
            <span className="text-[#1d1d1f] font-semibold">{rack.used_u}/{rack.total_u} U ({rack.usage_percent}%)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/[0.06] overflow-hidden">
            <div
              className="h-full bg-[#0071E3] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(rack.usage_percent, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric Details List */}
        <div className="space-y-2 my-3 text-xs">
          {/* Power */}
          <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-black/[0.03] border-[0.5px] border-black/10">
            <div className="flex items-center gap-2 text-zinc-600 font-medium">
              <Zap className="w-3.5 h-3.5 text-[#ff9500]" />
              <span>Power Circuit Draw</span>
            </div>
            <span className="font-bold text-[#ff9500]">{rack.power_kw} kW</span>
          </div>

          {/* Inlet Temperature */}
          <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-black/[0.03] border-[0.5px] border-black/10">
            <div className="flex items-center gap-2 text-zinc-600 font-medium">
              <Thermometer className="w-3.5 h-3.5 text-[#0071E3]" />
              <span>Inlet Sensor</span>
            </div>
            <span className="font-bold text-[#0071E3]">{rack.inlet_temp_c}°C</span>
          </div>

          {/* Devices Count */}
          <div className="flex items-center justify-between p-2.5 rounded-[12px] bg-black/[0.03] border-[0.5px] border-black/10">
            <div className="flex items-center gap-2 text-zinc-600 font-medium">
              <Database className="w-3.5 h-3.5 text-zinc-500" />
              <span>Mounted Hardware</span>
            </div>
            <span className="font-bold text-[#1d1d1f]">{rack.device_count} Units</span>
          </div>
        </div>
      </div>

      {/* Action Button: View Rack Elevation */}
      <button
        type="button"
        onClick={() => onViewRackElevation(rack)}
        className="w-full py-2.5 px-4 rounded-[12px] font-semibold text-xs bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center justify-center gap-1.5 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] cursor-pointer shadow-sm"
      >
        <span>Inspect 42U Elevation</span>
        <ChevronRight className="w-3.5 h-3.5 text-white/80" />
      </button>
    </div>
  )
}
