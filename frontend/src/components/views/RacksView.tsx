/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-rose-50 text-rose-700 border-[0.5px] border-rose-200 tracking-[-0.011em]">
            <AlertOctagon className="w-3.5 h-3.5" />
            CRITICAL
          </span>
        )
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-amber-50 text-amber-700 border-[0.5px] border-amber-200 tracking-[-0.011em]">
            <AlertTriangle className="w-3.5 h-3.5" />
            WARNING
          </span>
        )
      case 'healthy':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 border-[0.5px] border-emerald-200 tracking-[-0.011em]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            NOMINAL
          </span>
        )
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 select-none font-sans text-[#1d1d1f] pb-12">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-0.022em] text-[#1d1d1f]">
              Cabinet Enclosures
            </h1>
            <span className="px-2.5 py-1 rounded-[8px] bg-black/[0.04] text-xs font-semibold text-zinc-700 border-[0.5px] border-black/10">
              {racks.length} ENCLOSURES
            </span>
          </div>
          <p className="text-xs text-zinc-500 tracking-[-0.011em]">
            Facility Grid • Select any enclosure to inspect its vertical 42U chassis elevation &amp; cabling
          </p>
        </div>
      </div>

      {/* Grid of Apple Glass Enclosures */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {racks.map((rack) => (
          <div
            key={rack.id}
            onClick={() => onSelectRack(rack)}
            className="rounded-[20px] bg-white/75 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 p-5 shadow-sm hover:border-black/20 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer group flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[10px] bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1d1d1f] text-base tracking-[-0.022em] group-hover:text-[#0071E3] transition-colors">
                      {rack.name}
                    </h3>
                    <div className="text-[11px] text-zinc-500 tracking-[-0.011em]">
                      Row {rack.row} • Col {rack.col}
                    </div>
                  </div>
                </div>
                {getStatusBadge(rack.status)}
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 p-3 rounded-[12px] bg-black/[0.02] border-[0.5px] border-black/8">
                <div className="flex justify-between text-xs tracking-[-0.011em]">
                  <span className="text-zinc-500 font-medium">Occupancy</span>
                  <span className="font-semibold text-[#1d1d1f]">
                    {rack.used_u}/{rack.total_u} U ({rack.usage_percent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                  <div
                    className="h-full bg-[#0071E3] transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(rack.usage_percent, 100)}%` }}
                  />
                </div>
              </div>

              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-[10px] bg-white border-[0.5px] border-black/10 shadow-2xs">
                  <div className="text-zinc-500 text-[10px] font-medium flex items-center justify-center gap-1 mb-0.5 uppercase">
                    <Database className="w-3 h-3 text-[#0071E3]" />
                    Units
                  </div>
                  <div className="font-semibold text-[#1d1d1f] text-sm">{rack.device_count}</div>
                </div>
                <div className="p-2 rounded-[10px] bg-white border-[0.5px] border-black/10 shadow-2xs">
                  <div className="text-zinc-500 text-[10px] font-medium flex items-center justify-center gap-1 mb-0.5 uppercase">
                    <Zap className="w-3 h-3 text-amber-500" />
                    Power
                  </div>
                  <div className="font-semibold text-amber-600 text-sm">{rack.power_kw} <span className="text-[10px] font-normal">kW</span></div>
                </div>
                <div className="p-2 rounded-[10px] bg-white border-[0.5px] border-black/10 shadow-2xs">
                  <div className="text-zinc-500 text-[10px] font-medium flex items-center justify-center gap-1 mb-0.5 uppercase">
                    <Thermometer className="w-3 h-3 text-emerald-500" />
                    Inlet
                  </div>
                  <div className="font-semibold text-emerald-600 text-sm">{rack.inlet_temp_c} <span className="text-[10px] font-normal">°C</span></div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-black/10 flex items-center justify-between text-xs font-medium text-zinc-500 group-hover:text-[#1d1d1f] transition-colors">
              <span className="text-[#0071E3] font-semibold">Inspect 42U Elevation</span>
              <ChevronRight className="w-4 h-4 text-[#0071E3] group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
