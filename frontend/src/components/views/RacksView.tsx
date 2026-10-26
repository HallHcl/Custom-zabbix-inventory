/* Apple UI & Tesla UI Dual-System Design – Verified: 8pt Grid, Telemetry Typography, Pure OLED Black / Cupertino Frost */

import { Server, Zap, Thermometer, Database, ChevronRight, AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react'
import type { RackSummary } from '../../types'
import { useTheme } from '../../lib/theme'

interface RacksViewProps {
  racks: RackSummary[]
  onSelectRack: (rack: RackSummary) => void
}

export function RacksView({ racks, onSelectRack }: RacksViewProps) {
  const { isTeslaDark } = useTheme()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border ${
              isTeslaDark
                ? 'rounded-[4px] bg-rose-950/40 text-rose-300 border-rose-800 font-mono'
                : 'rounded-[8px] bg-rose-50 text-rose-700 border-[0.5px] border-rose-200'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            CRITICAL
          </span>
        )
      case 'warning':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border ${
              isTeslaDark
                ? 'rounded-[4px] bg-amber-950/40 text-amber-300 border-amber-800 font-mono'
                : 'rounded-[8px] bg-amber-50 text-amber-700 border-[0.5px] border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            WARNING
          </span>
        )
      case 'healthy':
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold border ${
              isTeslaDark
                ? 'rounded-[4px] bg-[#00C853]/15 text-[#00C853] border-[#00C853]/30 font-mono'
                : 'rounded-[8px] bg-emerald-50 text-emerald-700 border-[0.5px] border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            NOMINAL
          </span>
        )
    }
  }

  return (
    <div
      className={`max-w-[1600px] mx-auto space-y-6 select-none pb-12 ${
        isTeslaDark ? 'font-mono text-[#F5F5F7]' : 'font-sans text-[#1d1d1f]'
      }`}
    >
      {/* Executive Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border ${
          isTeslaDark
            ? 'rounded-[10px] bg-[#111111] border-[#1F1F1F]'
            : 'rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1
              className={`text-2xl font-bold ${
                isTeslaDark ? 'font-mono text-white tracking-tight' : 'tracking-[-0.022em] text-[#1d1d1f]'
              }`}
            >
              Cabinet Enclosures
            </h1>
            <span
              className={`px-2.5 py-1 text-xs font-semibold border ${
                isTeslaDark
                  ? 'rounded-[4px] bg-[#161616] border-[#1F1F1F] text-[#A1A1A6] font-mono'
                  : 'rounded-[8px] bg-black/[0.04] text-zinc-700 border-[0.5px] border-black/10'
              }`}
            >
              {racks.length} ENCLOSURES
            </span>
          </div>
          <p className={`text-xs ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 tracking-[-0.011em]'}`}>
            Facility Grid • Select any enclosure to inspect its vertical 42U chassis elevation &amp; cabling
          </p>
        </div>
      </div>

      {/* Grid of Cabinet Enclosures */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {racks.map((rack) => (
          <div
            key={rack.id}
            onClick={() => onSelectRack(rack)}
            className={`p-5 transition-all duration-200 cursor-pointer group flex flex-col justify-between space-y-4 border ${
              isTeslaDark
                ? 'rounded-[10px] bg-[#111111] border-[#1F1F1F] hover:border-[#3E6AE1] shadow-none'
                : 'rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 shadow-sm hover:border-black/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 flex items-center justify-center transition-transform ${
                      isTeslaDark
                        ? 'rounded-[6px] bg-[#3E6AE1]/15 text-[#3E6AE1] border border-[#3E6AE1]/30'
                        : 'rounded-[10px] bg-[#0071E3]/10 text-[#0071E3] group-hover:scale-105'
                    }`}
                  >
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3
                      className={`font-semibold text-base transition-colors ${
                        isTeslaDark
                          ? 'text-white font-mono group-hover:text-[#3E6AE1]'
                          : 'text-[#1d1d1f] tracking-[-0.022em] group-hover:text-[#0071E3]'
                      }`}
                    >
                      {rack.name}
                    </h3>
                    <div className={`text-[11px] ${isTeslaDark ? 'text-zinc-500 font-mono' : 'text-zinc-500'}`}>
                      Row {rack.row} • Col {rack.col}
                    </div>
                  </div>
                </div>
                {getStatusBadge(rack.status)}
              </div>

              {/* Progress bar */}
              <div
                className={`space-y-1.5 p-3 border ${
                  isTeslaDark
                    ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F]'
                    : 'rounded-[12px] bg-black/[0.02] border-[0.5px] border-black/8'
                }`}
              >
                <div className="flex justify-between text-xs">
                  <span className={isTeslaDark ? 'text-zinc-400 font-mono' : 'text-zinc-500 font-medium'}>
                    Occupancy
                  </span>
                  <span className={`font-semibold ${isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'}`}>
                    {rack.used_u}/{rack.total_u} U ({rack.usage_percent}%)
                  </span>
                </div>
                <div
                  className={`w-full h-1.5 overflow-hidden ${
                    isTeslaDark ? 'rounded-[2px] bg-[#222222]' : 'rounded-full bg-black/[0.06]'
                  }`}
                >
                  <div
                    className={`h-full transition-all duration-500 ${
                      isTeslaDark ? 'bg-[#3E6AE1] rounded-[2px]' : 'bg-[#0071E3] rounded-full'
                    }`}
                    style={{ width: `${Math.min(rack.usage_percent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div
                  className={`p-2 border ${
                    isTeslaDark
                      ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F]'
                      : 'rounded-[10px] bg-white border-[0.5px] border-black/10 shadow-2xs'
                  }`}
                >
                  <div className="text-zinc-500 text-[10px] font-medium flex items-center justify-center gap-1 mb-0.5 uppercase">
                    <Database className={`w-3 h-3 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
                    Units
                  </div>
                  <div className={`font-semibold text-sm ${isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'}`}>
                    {rack.device_count}
                  </div>
                </div>
                <div
                  className={`p-2 border ${
                    isTeslaDark
                      ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F]'
                      : 'rounded-[10px] bg-white border-[0.5px] border-black/10 shadow-2xs'
                  }`}
                >
                  <div className="text-zinc-500 text-[10px] font-medium flex items-center justify-center gap-1 mb-0.5 uppercase">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Power
                  </div>
                  <div className={`font-semibold text-sm text-amber-500 ${isTeslaDark ? 'font-mono' : ''}`}>
                    {rack.power_kw} <span className="text-[10px] font-normal">kW</span>
                  </div>
                </div>
                <div
                  className={`p-2 border ${
                    isTeslaDark
                      ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F]'
                      : 'rounded-[10px] bg-white border-[0.5px] border-black/10 shadow-2xs'
                  }`}
                >
                  <div className="text-zinc-500 text-[10px] font-medium flex items-center justify-center gap-1 mb-0.5 uppercase">
                    <Thermometer className={`w-3 h-3 ${isTeslaDark ? 'text-[#00C853]' : 'text-emerald-500'}`} />
                    Inlet
                  </div>
                  <div
                    className={`font-semibold text-sm ${
                      isTeslaDark ? 'text-[#00C853] font-mono' : 'text-emerald-600'
                    }`}
                  >
                    {rack.inlet_temp_c} <span className="text-[10px] font-normal">°C</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`pt-2 border-t flex items-center justify-between text-xs font-medium transition-colors ${
                isTeslaDark
                  ? 'border-[#1F1F1F] text-[#8E8E93] group-hover:text-white'
                  : 'border-black/10 text-zinc-500 group-hover:text-[#1d1d1f]'
              }`}
            >
              <span className={`font-semibold ${isTeslaDark ? 'text-[#3E6AE1] font-mono' : 'text-[#0071E3]'}`}>
                Inspect 42U Elevation
              </span>
              <ChevronRight
                className={`w-4 h-4 group-hover:translate-x-0.5 transition-transform ${
                  isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

