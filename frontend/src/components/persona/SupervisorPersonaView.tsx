import React, { useState, useMemo } from "react";
import {
  Layers,
  Search,
  PlusCircle,
  Inbox,
  Flame,
  CheckCircle2,
  ArrowRight,
  Server,
  SlidersHorizontal,
} from "lucide-react";
import { useTwinStore } from "../../store/useTwinStore";
import type { RoomOverview, RackSummary } from "../../types";
import { useTheme } from "../../lib/theme";

interface SupervisorPersonaViewProps {
  overview: RoomOverview | null;
  onViewRackElevation: (rack: RackSummary) => void;
  onOpenUnassigned?: () => void;
  unassignedCount?: number;
  onMountDevice?: (rackId: number) => void;
}

export const SupervisorPersonaView: React.FC<SupervisorPersonaViewProps> = ({
  overview,
  onViewRackElevation,
  onOpenUnassigned,
  unassignedCount = 0,
  onMountDevice,
}) => {
  const { isTeslaDark } = useTheme();
  const { racksTelemetry } = useTwinStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [requiredU, setRequiredU] = useState<number>(0); // 0 = all, 1, 2, 4, 8
  const [minPowerHeadroomKw, setMinPowerHeadroomKw] = useState<number>(0); // 0, 1.0, 2.0
  const [rowFilter, setRowFilter] = useState<string>("ALL");

  const racks = overview?.racks ?? [];

  // Extract unique rows
  const availableRows = useMemo(() => {
    const rows = new Set(racks.map((r) => r.row));
    return ["ALL", ...Array.from(rows).sort()];
  }, [racks]);

  // Filter Racks based on contiguous space, power headroom, search, and row
  const filteredRacks = useMemo(() => {
    return racks.filter((rack) => {
      // 1. Search Query
      if (
        searchQuery &&
        !rack.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !rack.row.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // 2. Row Filter
      if (rowFilter !== "ALL" && rack.row !== rowFilter) {
        return false;
      }

      // 3. Space Headroom
      const freeU = (rack.total_u || 42) - (rack.used_u || 0);
      if (requiredU > 0 && freeU < requiredU) {
        return false;
      }

      // 4. Power Headroom
      const telem = racksTelemetry[rack.id.toString()] ||
        Object.values(racksTelemetry).find(
          (t) => t.rack_name.toLowerCase() === rack.name.toLowerCase()
        );
      const currentKw = telem ? telem.total_power_watts / 1000 : rack.power_kw;
      const maxKw = telem ? telem.max_power_watts / 1000 : 8.0;
      const powerHeadroom = Math.max(0, maxKw - currentKw);

      if (minPowerHeadroomKw > 0 && powerHeadroom < minPowerHeadroomKw) {
        return false;
      }

      return true;
    });
  }, [racks, searchQuery, rowFilter, requiredU, minPowerHeadroomKw, racksTelemetry]);

  // Total Capacity Stats
  const totalSlots = racks.reduce((acc, r) => acc + (r.total_u || 42), 0);
  const totalUsedSlots = racks.reduce((acc, r) => acc + (r.used_u || 0), 0);
  const totalFreeSlots = totalSlots - totalUsedSlots;
  const overallUsagePct = totalSlots > 0 ? Math.round((totalUsedSlots / totalSlots) * 100) : 0;

  return (
    <div className="w-full space-y-4 pb-8 select-none">
      {/* =====================================================================
          1. ZABBIX AUTO-DISCOVERY UNRACKED INBOX BANNER
          ===================================================================== */}
      {unassignedCount > 0 && onOpenUnassigned && (
        <div className={`p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm transition-colors ${
          isTeslaDark
            ? 'rounded-[8px] bg-[#111111] border-[#3E6AE1]/40 text-[#F5F5F7]'
            : 'rounded-[20px] bg-white/80 backdrop-blur-xl saturate-180 border-[#007AFF]/30 bg-gradient-to-r from-[#007AFF]/5 via-white/80 to-[#007AFF]/5 text-[#1D1D1F]'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 border flex items-center justify-center shrink-0 ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#3E6AE1]/15 border-[#3E6AE1]/30 text-[#3E6AE1]'
                : 'rounded-[12px] bg-[#007AFF]/10 border-[#007AFF]/25 text-[#007AFF]'
            }`}>
              <Inbox className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold text-sm ${isTeslaDark ? 'text-[#F5F5F7]' : 'text-[#1D1D1F]'}`}>
                  Zabbix Auto-Discovery Ingestion Queue
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-white text-[11px] font-bold ${
                  isTeslaDark ? 'bg-[#3E6AE1]' : 'bg-[#007AFF]'
                }`}>
                  {unassignedCount} Discovered
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>
                New hardware hosts discovered via Zabbix 7.0 network rules are ready to be mounted into physical rack units.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenUnassigned}
            className={`flex items-center gap-2 px-4 py-2 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0 ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#3E6AE1] hover:bg-[#3459c5] font-mono'
                : 'rounded-[12px] bg-[#007AFF] hover:bg-[#0071E3]'
            }`}
          >
            <span>Open Ingestion Queue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          2. CAPACITY OVERVIEW STAT STRIP
          ===================================================================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`p-4 border shadow-sm transition-colors ${
          isTeslaDark
            ? 'rounded-[8px] bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]'
            : 'rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-black/10 text-[#1D1D1F]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] uppercase font-semibold ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Total Cabinets</span>
            <Server className={`w-4 h-4 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#007AFF]'}`} />
          </div>
          <div className={`text-2xl font-bold mt-1 ${isTeslaDark ? 'font-mono text-[#F5F5F7]' : 'text-[#1D1D1F]'}`}>
            {racks.length}
          </div>
          <span className={`text-[10px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Bangkok DC-1 (Halls A & B)</span>
        </div>

        <div className={`p-4 border shadow-sm transition-colors ${
          isTeslaDark
            ? 'rounded-[8px] bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]'
            : 'rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-black/10 text-[#1D1D1F]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] uppercase font-semibold ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Available Space</span>
            <Layers className={`w-4 h-4 ${isTeslaDark ? 'text-[#00C853]' : 'text-emerald-600'}`} />
          </div>
          <div className={`text-2xl font-bold mt-1 ${isTeslaDark ? 'text-[#00C853] font-mono' : 'text-emerald-600'}`}>
            {totalFreeSlots} <span className={`text-xs font-normal ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>/ {totalSlots} U</span>
          </div>
          <span className={`text-[10px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>({100 - overallUsagePct}% Free RU)</span>
        </div>

        <div className={`p-4 border shadow-sm transition-colors ${
          isTeslaDark
            ? 'rounded-[8px] bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]'
            : 'rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-black/10 text-[#1D1D1F]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] uppercase font-semibold ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Space Utilization</span>
            <SlidersHorizontal className="w-4 h-4 text-[#ff9500]" />
          </div>
          <div className={`text-2xl font-bold mt-1 ${isTeslaDark ? 'font-mono text-[#F5F5F7]' : 'text-[#1D1D1F]'}`}>
            {overallUsagePct}%
          </div>
          <div className={`w-full h-2 rounded-full mt-2 overflow-hidden border ${
            isTeslaDark ? 'bg-[#1F1F1F] border-[#222222]' : 'bg-black/5 border-black/5'
          }`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isTeslaDark ? 'bg-[#3E6AE1]' : 'bg-[#007AFF]'
              }`}
              style={{ width: `${overallUsagePct}%` }}
            />
          </div>
        </div>

        <div className={`p-4 border shadow-sm transition-colors ${
          isTeslaDark
            ? 'rounded-[8px] bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]'
            : 'rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-black/10 text-[#1D1D1F]'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] uppercase font-semibold ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Matching Racks</span>
            <CheckCircle2 className={`w-4 h-4 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#007AFF]'}`} />
          </div>
          <div className={`text-2xl font-bold mt-1 ${isTeslaDark ? 'text-[#3E6AE1] font-mono' : 'text-[#007AFF]'}`}>
            {filteredRacks.length} <span className={`text-xs font-normal ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>/ {racks.length}</span>
          </div>
          <span className={`text-[10px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Ready for Provisioning</span>
        </div>
      </div>

      {/* =====================================================================
          3. CONTIGUOUS SPACE FINDER FILTER BAR
          ===================================================================== */}
      <div className={`p-4 border shadow-sm space-y-3 transition-colors ${
        isTeslaDark
          ? 'rounded-[8px] bg-[#111111] border-[#1F1F1F]'
          : 'rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-black/10'
      }`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
              isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rack name, row..."
              className={`w-full text-xs pl-9 pr-3 py-2 border transition-colors focus:outline-none ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] text-[#F5F5F7] placeholder-[#8E8E93] border-[#222222] focus:border-[#3E6AE1]'
                  : 'rounded-[10px] bg-black/5 text-[#1D1D1F] placeholder:text-black/30 border-black/10 focus:ring-2 focus:ring-[#007AFF]/50'
              }`}
            />
          </div>

          {/* Row Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`mr-1 font-medium ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Row:</span>
            {availableRows.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRowFilter(r)}
                className={`px-3 py-1 transition-colors cursor-pointer text-xs font-semibold border ${
                  isTeslaDark ? 'rounded-[4px] font-mono' : 'rounded-[8px]'
                } ${
                  rowFilter === r
                    ? isTeslaDark ? "bg-[#3E6AE1] text-white border-[#3E6AE1]" : "bg-[#007AFF] text-white shadow-xs border-[#007AFF]"
                    : isTeslaDark
                    ? "bg-[#161616] text-[#8E8E93] hover:text-[#F5F5F7] border-[#222222]"
                    : "bg-black/5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/10 border-black/10"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Space & Power Sliders/Pill Selectors */}
        <div className={`flex flex-wrap items-center gap-4 pt-2 border-t text-xs ${
          isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
        }`}>
          {/* Required Contiguous U */}
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Min Free Space:</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 4, 8].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setRequiredU(u)}
                  className={`px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer border ${
                    isTeslaDark ? 'rounded-[4px] font-mono' : 'rounded-[6px]'
                  } ${
                    requiredU === u
                      ? isTeslaDark ? "bg-[#3E6AE1] text-white border-[#3E6AE1]" : "bg-[#007AFF] text-white shadow-xs border-[#007AFF]"
                      : isTeslaDark
                      ? "bg-[#161616] text-[#8E8E93] hover:text-[#F5F5F7] border-[#222222]"
                      : "bg-black/5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/10 border-black/10"
                  }`}
                >
                  {u === 0 ? "Any" : `≥ ${u}U`}
                </button>
              ))}
            </div>
          </div>

          {/* Min Power Headroom */}
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Power Headroom:</span>
            <div className="flex items-center gap-1">
              {[0, 1.0, 2.0, 3.0].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setMinPowerHeadroomKw(kw)}
                  className={`px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer border ${
                    isTeslaDark ? 'rounded-[4px] font-mono' : 'rounded-[6px]'
                  } ${
                    minPowerHeadroomKw === kw
                      ? "bg-[#ff9500] text-white shadow-xs border-[#ff9500]"
                      : isTeslaDark
                      ? "bg-[#161616] text-[#8E8E93] hover:text-[#F5F5F7] border-[#222222]"
                      : "bg-black/5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/10 border-black/10"
                  }`}
                >
                  {kw === 0 ? "Any" : `≥ ${kw} kW`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          4. PROVISIONING RACK MATRIX GRID
          ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredRacks.map((rack) => {
          const telem = racksTelemetry[rack.id.toString()] ||
            Object.values(racksTelemetry).find(
              (t) => t.rack_name.toLowerCase() === rack.name.toLowerCase()
            );

          const freeU = (rack.total_u || 42) - (rack.used_u || 0);
          const usagePct = Math.round(((rack.used_u || 0) / (rack.total_u || 42)) * 100);
          const currentKw = telem ? telem.total_power_watts / 1000 : rack.power_kw;
          const maxKw = telem ? telem.max_power_watts / 1000 : 8.0;
          const powerPct = Math.round((currentKw / maxKw) * 100);
          const inletTemp = telem ? telem.inlet_temp_c : rack.inlet_temp_c;
          const hasFailoverRisk = telem?.redundancy_failover_risk ?? false;

          return (
            <div
              key={rack.id}
              className={`p-4 border transition-all group flex flex-col justify-between ${
                isTeslaDark
                  ? 'rounded-[8px] bg-[#111111] hover:bg-[#161616] border-[#1F1F1F] hover:border-[#3E6AE1]/50 shadow-sm'
                  : 'rounded-[20px] bg-white/70 hover:bg-white backdrop-blur-xl saturate-180 border-black/10 hover:border-[#007AFF]/40 shadow-sm hover:shadow-md'
              }`}
            >
              <div>
                {/* Rack Header */}
                <div className={`flex items-center justify-between pb-2 border-b ${
                  isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full group-hover:scale-125 transition-transform ${
                      isTeslaDark ? 'bg-[#3E6AE1]' : 'bg-[#007AFF]'
                    }`} />
                    <h4 className={`font-semibold text-sm ${isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-[#1D1D1F]'}`}>
                      {rack.name}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-[6px] border ${
                    isTeslaDark
                      ? 'bg-[#161616] border-[#222222] text-[#8E8E93] font-mono'
                      : 'bg-black/5 border-black/10 text-[#86868B]'
                  }`}>
                    Row {rack.row}
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-3 my-3 text-xs">
                  {/* Space Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}>Space:</span>
                      <span className={`font-bold ${isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-[#1D1D1F]'}`}>
                        {rack.used_u} / {rack.total_u} U ({freeU}U Free)
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden border ${
                      isTeslaDark ? 'bg-[#1F1F1F] border-[#222222]' : 'bg-black/5 border-black/5'
                    }`}>
                      <div
                        className={`h-full rounded-full ${
                          usagePct > 90 ? "bg-rose-500" : usagePct > 70 ? "bg-[#ff9500]" : isTeslaDark ? "bg-[#3E6AE1]" : "bg-[#007AFF]"
                        }`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Power Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}>Power:</span>
                      <span className={`font-bold text-[#ff9500] ${isTeslaDark ? 'font-mono' : ''}`}>
                        {currentKw.toFixed(2)} / {maxKw.toFixed(1)} kW ({powerPct}%)
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden border ${
                      isTeslaDark ? 'bg-[#1F1F1F] border-[#222222]' : 'bg-black/5 border-black/5'
                    }`}>
                      <div
                        className={`h-full rounded-full ${
                          powerPct > 85 ? "bg-rose-500" : powerPct > 65 ? "bg-[#ff9500]" : isTeslaDark ? "bg-[#00C853]" : "bg-emerald-500"
                        }`}
                        style={{ width: `${powerPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Thermal & Redundancy Pills */}
                  <div className="flex items-center justify-between pt-1">
                    <div className={`flex items-center gap-1 text-[11px] font-medium ${
                      isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#007AFF]'
                    }`}>
                      <Flame className="w-3.5 h-3.5" />
                      <span>{inletTemp.toFixed(1)}°C Inlet</span>
                    </div>

                    {hasFailoverRisk ? (
                      <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border animate-pulse ${
                        isTeslaDark ? 'bg-[#250d11] text-rose-300 border-rose-900/60' : 'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}>
                        Single PDU Risk
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-semibold border ${
                        isTeslaDark ? 'bg-[#0f241a] text-[#00C853] border-emerald-900/60' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}>
                        2N Redundant
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`pt-2 border-t flex items-center gap-2 ${
                isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
              }`}>
                <button
                  type="button"
                  onClick={() => onViewRackElevation(rack)}
                  className={`flex-1 py-1.5 px-2.5 border text-xs font-semibold transition-colors cursor-pointer text-center ${
                    isTeslaDark
                      ? 'rounded-[6px] bg-[#161616] hover:bg-[#202020] border-[#222222] text-[#F5F5F7] font-mono'
                      : 'rounded-[10px] bg-black/5 hover:bg-black/10 border-black/10 text-[#1D1D1F]'
                  }`}
                >
                  Elevation
                </button>
                {onMountDevice && (
                  <button
                    type="button"
                    onClick={() => onMountDevice(rack.id)}
                    className={`flex-1 py-1.5 px-2.5 border text-xs font-semibold transition-colors cursor-pointer text-center flex items-center justify-center gap-1 ${
                      isTeslaDark
                        ? 'rounded-[6px] bg-[#3E6AE1]/20 hover:bg-[#3E6AE1]/30 border-[#3E6AE1]/40 text-[#3E6AE1] font-mono'
                        : 'rounded-[10px] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 border-[#007AFF]/30 text-[#007AFF]'
                    }`}
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>Mount</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
