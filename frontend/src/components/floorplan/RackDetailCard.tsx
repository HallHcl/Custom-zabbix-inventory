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
      <div className="p-6 noc-panel flex flex-col items-center justify-center text-center text-[#85a6b1] h-full min-h-[340px] select-none">
        <Server className="w-10 h-10 mb-2 text-[#85a6b1]" />
        <span className="text-xs font-mono">Select a cabinet on the 2.5D floor plan</span>
      </div>
    )
  }

  const getStatusBadge = () => {
    switch (rack.status) {
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
    <div className="p-4 noc-panel flex flex-col justify-between select-none">
      <div>
        {/* Header Title & Status */}
        <div className="flex items-center justify-between mb-1 pb-2 border-b border-[#394650]">
          <div>
            <h2 className="text-base font-bold text-white font-mono tracking-tight">{rack.name}</h2>
            <span className="text-[10px] text-[#85a6b1] font-mono">ROW {rack.row} / COL {rack.col}</span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Space Usage Progress */}
        <div className="my-3 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 text-[#85a6b1]">
              <Server className="w-3.5 h-3.5 text-[#85a6b1]" />
              <span>Space Occupancy</span>
            </div>
            <span className="text-[#caedde] font-bold">{rack.used_u}/{rack.total_u} U ({rack.usage_percent}%)</span>
          </div>
          <div className="w-full h-1.5 rounded-[1px] bg-[#273139] overflow-hidden">
            <div
              className="h-full bg-[#8bd7d1] transition-all duration-300"
              style={{ width: `${Math.min(rack.usage_percent, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric Details List */}
        <div className="space-y-1.5 my-3 font-mono text-xs">
          {/* Power */}
          <div className="flex items-center justify-between p-2 rounded-[2px] bg-[#273139] border border-[#394650]">
            <div className="flex items-center gap-2 text-[#85a6b1]">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Power Circuit Draw</span>
            </div>
            <span className="font-bold text-amber-400">{rack.power_kw} kW</span>
          </div>

          {/* Inlet Temperature */}
          <div className="flex items-center justify-between p-2 rounded-[2px] bg-[#273139] border border-[#394650]">
            <div className="flex items-center gap-2 text-[#85a6b1]">
              <Thermometer className="w-3.5 h-3.5 text-[#8bd7d1]" />
              <span>Inlet Sensor</span>
            </div>
            <span className="font-bold text-[#8bd7d1]">{rack.inlet_temp_c}°C</span>
          </div>

          {/* Devices Count */}
          <div className="flex items-center justify-between p-2 rounded-[2px] bg-[#273139] border border-[#394650]">
            <div className="flex items-center gap-2 text-[#85a6b1]">
              <Database className="w-3.5 h-3.5 text-[#85a6b1]" />
              <span>Mounted Hardware</span>
            </div>
            <span className="font-bold text-[#caedde]">{rack.device_count} Units</span>
          </div>
        </div>
      </div>

      {/* Action Button: View Rack Elevation */}
      <button
        type="button"
        onClick={() => onViewRackElevation(rack)}
        className="w-full py-2 px-3 rounded-[2px] font-mono font-bold text-xs bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] text-[#8bd7d1] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <span>Inspect 42U Elevation</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
