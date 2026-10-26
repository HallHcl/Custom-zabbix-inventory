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
import { useTheme } from '../../lib/theme'

interface RackDetailCardProps {
  rack: RackSummary | null
  onViewRackElevation: (rack: RackSummary) => void
}

export function RackDetailCard({ rack, onViewRackElevation }: RackDetailCardProps) {
  const { isTeslaDark } = useTheme()

  if (!rack) {
    return (
      <div className={`p-6 border flex flex-col items-center justify-center text-center h-full min-h-[340px] select-none ${
        isTeslaDark
          ? 'bg-[#111111] border-[#1F1F1F] text-[#8E8E93] rounded-[8px]'
          : 'bg-white/75 backdrop-blur-2xl border-black/10 text-zinc-500 rounded-[20px] shadow-sm'
      }`}>
        <Server className={`w-10 h-10 mb-2 ${isTeslaDark ? 'text-[#3E6AE1]/60' : 'text-zinc-400'}`} />
        <span className="text-xs font-medium">Select a cabinet on the 2.5D floor plan</span>
      </div>
    )
  }

  const getStatusBadge = () => {
    switch (rack.status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[10px] font-bold bg-[#ff3b30]/15 text-[#ff3b30] border border-[#ff3b30]/30 font-mono">
            <AlertOctagon className="w-3 h-3" />
            CRITICAL
          </span>
        )
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[10px] font-bold bg-[#ff9500]/15 text-[#ff9500] border border-[#ff9500]/30 font-mono">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        )
      case 'healthy':
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] text-[10px] font-bold font-mono ${
            isTeslaDark
              ? 'bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30'
              : 'bg-[#34c759]/15 text-[#34c759] border border-[#34c759]/30'
          }`}>
            <CheckCircle2 className="w-3 h-3" />
            NOMINAL
          </span>
        )
    }
  }

  return (
    <div className={`p-5 border flex flex-col justify-between select-none transition-colors ${
      isTeslaDark
        ? 'bg-[#111111] border-[#1F1F1F] text-[#F5F5F7] rounded-[8px]'
        : 'bg-white/75 backdrop-blur-2xl border-black/10 text-[#1d1d1f] rounded-[20px] shadow-sm'
    }`}>
      <div>
        {/* Header Title & Status */}
        <div className={`flex items-center justify-between mb-1 pb-3 border-b ${
          isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
        }`}>
          <div>
            <h2 className={`text-base font-bold tracking-tight ${
              isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-[#1d1d1f]'
            }`}>{rack.name}</h2>
            <span className={`text-[11px] font-medium ${
              isTeslaDark ? 'text-[#8E8E93] font-mono' : 'text-zinc-500'
            }`}>ROW {rack.row} / COL {rack.col}</span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Space Usage Progress */}
        <div className="my-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className={`flex items-center gap-1.5 font-medium ${
              isTeslaDark ? 'text-[#A1A1A6]' : 'text-zinc-600'
            }`}>
              <Server className="w-3.5 h-3.5 text-zinc-500" />
              <span>Space Occupancy</span>
            </div>
            <span className={`font-semibold ${
              isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-[#1d1d1f]'
            }`}>{rack.used_u}/{rack.total_u} U ({rack.usage_percent}%)</span>
          </div>
          <div className={`w-full h-2 rounded-full overflow-hidden ${
            isTeslaDark ? 'bg-[#1F1F1F]' : 'bg-black/[0.06]'
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isTeslaDark ? 'bg-[#3E6AE1]' : 'bg-[#0071E3]'
              }`}
              style={{ width: `${Math.min(rack.usage_percent, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric Details List */}
        <div className="space-y-2 my-3 text-xs">
          {/* Power */}
          <div className={`flex items-center justify-between p-2.5 border ${
            isTeslaDark
              ? 'rounded-[6px] bg-[#161616] border-[#222222]'
              : 'rounded-[12px] bg-black/[0.03] border-black/10'
          }`}>
            <div className={`flex items-center gap-2 font-medium ${
              isTeslaDark ? 'text-[#A1A1A6]' : 'text-zinc-600'
            }`}>
              <Zap className="w-3.5 h-3.5 text-[#ff9500]" />
              <span>Power Circuit Draw</span>
            </div>
            <span className={`font-bold text-[#ff9500] ${isTeslaDark ? 'font-mono' : ''}`}>{rack.power_kw} kW</span>
          </div>

          {/* Inlet Temperature */}
          <div className={`flex items-center justify-between p-2.5 border ${
            isTeslaDark
              ? 'rounded-[6px] bg-[#161616] border-[#222222]'
              : 'rounded-[12px] bg-black/[0.03] border-black/10'
          }`}>
            <div className={`flex items-center gap-2 font-medium ${
              isTeslaDark ? 'text-[#A1A1A6]' : 'text-zinc-600'
            }`}>
              <Thermometer className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
              <span>Inlet Sensor</span>
            </div>
            <span className={`font-bold ${isTeslaDark ? 'text-[#3E6AE1] font-mono' : 'text-[#0071E3]'}`}>{rack.inlet_temp_c}°C</span>
          </div>

          {/* Devices Count */}
          <div className={`flex items-center justify-between p-2.5 border ${
            isTeslaDark
              ? 'rounded-[6px] bg-[#161616] border-[#222222]'
              : 'rounded-[12px] bg-black/[0.03] border-black/10'
          }`}>
            <div className={`flex items-center gap-2 font-medium ${
              isTeslaDark ? 'text-[#A1A1A6]' : 'text-zinc-600'
            }`}>
              <Database className="w-3.5 h-3.5 text-zinc-500" />
              <span>Mounted Hardware</span>
            </div>
            <span className={`font-bold ${isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-[#1d1d1f]'}`}>{rack.device_count} Units</span>
          </div>
        </div>
      </div>

      {/* Action Button: View Rack Elevation */}
      <button
        type="button"
        onClick={() => onViewRackElevation(rack)}
        className={`w-full py-2.5 px-4 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${
          isTeslaDark
            ? 'rounded-[6px] bg-[#3E6AE1] hover:bg-[#3459c5] text-white font-mono tracking-wide shadow-[0_0_12px_rgba(62,106,225,0.3)]'
            : 'rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm'
        }`}
      >
        <span>Inspect 42U Elevation</span>
        <ChevronRight className="w-3.5 h-3.5 text-white/80" />
      </button>
    </div>
  )
}
