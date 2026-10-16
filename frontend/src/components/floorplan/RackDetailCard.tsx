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
      <div className="p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-md backdrop-blur flex flex-col items-center justify-center text-center text-slate-500 h-full min-h-[340px]">
        <Server className="w-12 h-12 mb-3 text-slate-600" />
        <p className="text-sm">Click a rack in the floor plan to view details</p>
      </div>
    )
  }

  const getStatusBadge = () => {
    switch (rack.status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertOctagon className="w-3.5 h-3.5" />
            Critical
          </span>
        )
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warning
          </span>
        )
      case 'healthy':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Healthy
          </span>
        )
    }
  }

  return (
    <div className="p-6 rounded-2xl bg-[#0f172a]/80 border border-slate-800/80 shadow-xl backdrop-blur flex flex-col justify-between">
      <div>
        {/* Header Title & Status */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-bold tracking-tight text-white">{rack.name}</h2>
          {getStatusBadge()}
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Room A • {rack.row}
        </p>

        {/* Space Usage Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>
                {rack.used_u} / {rack.total_u} U used
              </span>
            </div>
            <span className="text-cyan-400 font-bold">{rack.usage_percent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(rack.usage_percent, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric Details List */}
        <div className="space-y-4 mb-6">
          {/* Power */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Zap className="w-4 h-4" />
              </div>
              <span>Power</span>
            </div>
            <span className="font-semibold text-white">{rack.power_kw} kW</span>
          </div>

          {/* Inlet Temperature */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                <Thermometer className="w-4 h-4" />
              </div>
              <span>Inlet Temperature</span>
            </div>
            <span className="font-semibold text-white">{rack.inlet_temp_c}°C</span>
          </div>

          {/* Devices Count */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Database className="w-4 h-4" />
              </div>
              <span>Devices</span>
            </div>
            <span className="font-semibold text-white">{rack.device_count} Devices</span>
          </div>
        </div>
      </div>

      {/* Action Button: View Rack Elevation */}
      <button
        type="button"
        onClick={() => onViewRackElevation(rack)}
        className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all duration-200 cursor-pointer active:scale-[0.98]"
      >
        <span>View Rack</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
