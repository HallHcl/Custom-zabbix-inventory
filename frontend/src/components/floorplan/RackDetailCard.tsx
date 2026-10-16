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
      <div className="p-6 rounded-2xl bg-[#0f0f0f] border border-[#222222] shadow-md flex flex-col items-center justify-center text-center text-zinc-500 h-full min-h-[340px]">
        <Server className="w-12 h-12 mb-3 text-zinc-600" />
        <p className="text-xs">Click a rack in the floor plan to view details</p>
      </div>
    )
  }

  const getStatusBadge = () => {
    switch (rack.status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-800">
            <AlertOctagon className="w-3.5 h-3.5" />
            Critical
          </span>
        )
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/50 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warning
          </span>
        )
      case 'healthy':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/50 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Healthy
          </span>
        )
    }
  }

  return (
    <div className="p-6 rounded-2xl bg-[#0f0f0f] border border-[#222222] shadow-xl flex flex-col justify-between">
      <div>
        {/* Header Title & Status */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-bold tracking-tight text-white">{rack.name}</h2>
          {getStatusBadge()}
        </div>
        <p className="text-xs text-zinc-400 mb-6">
          Room A • {rack.row}
        </p>

        {/* Space Usage Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2 text-zinc-300 font-medium">
              <Server className="w-4 h-4 text-zinc-400" />
              <span>
                {rack.used_u} / {rack.total_u} U used
              </span>
            </div>
            <span className="text-white font-bold">{rack.usage_percent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#1c1c1c] overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${Math.min(rack.usage_percent, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric Details List */}
        <div className="space-y-3 mb-6">
          {/* Power */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#141414] border border-[#242424]">
            <div className="flex items-center gap-3 text-zinc-400 text-xs">
              <div className="p-2 rounded-lg bg-[#1f1f1f] text-zinc-200">
                <Zap className="w-4 h-4" />
              </div>
              <span>Power Draw</span>
            </div>
            <span className="font-semibold text-white text-xs">{rack.power_kw} kW</span>
          </div>

          {/* Inlet Temperature */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#141414] border border-[#242424]">
            <div className="flex items-center gap-3 text-zinc-400 text-xs">
              <div className="p-2 rounded-lg bg-[#1f1f1f] text-zinc-200">
                <Thermometer className="w-4 h-4" />
              </div>
              <span>Inlet Temperature</span>
            </div>
            <span className="font-semibold text-white text-xs">{rack.inlet_temp_c}°C</span>
          </div>

          {/* Devices Count */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#141414] border border-[#242424]">
            <div className="flex items-center gap-3 text-zinc-400 text-xs">
              <div className="p-2 rounded-lg bg-[#1f1f1f] text-zinc-200">
                <Database className="w-4 h-4" />
              </div>
              <span>Installed Devices</span>
            </div>
            <span className="font-semibold text-white text-xs">{rack.device_count} Units</span>
          </div>
        </div>
      </div>

      {/* Action Button: View Rack Elevation */}
      <button
        type="button"
        onClick={() => onViewRackElevation(rack)}
        className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-white hover:bg-zinc-200 text-black flex items-center justify-center gap-2 shadow-lg transition-all duration-150 cursor-pointer active:scale-[0.98]"
      >
        <span>View Rack Elevation</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
