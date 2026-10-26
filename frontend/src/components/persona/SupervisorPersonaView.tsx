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
        <div className="p-4 rounded-[20px] bg-white/80 backdrop-blur-xl saturate-180 border-[0.5px] border-[#007AFF]/30 bg-gradient-to-r from-[#007AFF]/5 via-white/80 to-[#007AFF]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[12px] bg-[#007AFF]/10 border-[0.5px] border-[#007AFF]/25 flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5 text-[#007AFF] animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-[#1D1D1F]">
                  Zabbix Auto-Discovery Ingestion Queue
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#007AFF] text-white text-[11px] font-bold">
                  {unassignedCount} Discovered
                </span>
              </div>
              <p className="text-xs text-[#86868B] mt-0.5">
                New hardware hosts discovered via Zabbix 7.0 network rules are ready to be mounted into physical rack units.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenUnassigned}
            className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
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
        <div className="p-4 rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#86868B] uppercase font-semibold">Total Cabinets</span>
            <Server className="w-4 h-4 text-[#007AFF]" />
          </div>
          <div className="text-2xl font-bold text-[#1D1D1F] mt-1">
            {racks.length}
          </div>
          <span className="text-[10px] text-[#86868B]">Bangkok DC-1 (Halls A & B)</span>
        </div>

        <div className="p-4 rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#86868B] uppercase font-semibold">Available Space</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {totalFreeSlots} <span className="text-xs text-[#86868B] font-normal">/ {totalSlots} U</span>
          </div>
          <span className="text-[10px] text-[#86868B]">({100 - overallUsagePct}% Free RU)</span>
        </div>

        <div className="p-4 rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#86868B] uppercase font-semibold">Space Utilization</span>
            <SlidersHorizontal className="w-4 h-4 text-[#ff9500]" />
          </div>
          <div className="text-2xl font-bold text-[#1D1D1F] mt-1">
            {overallUsagePct}%
          </div>
          <div className="w-full bg-black/5 h-2 rounded-full mt-2 overflow-hidden border-[0.5px] border-black/5">
            <div
              className="bg-[#007AFF] h-full rounded-full transition-all duration-500"
              style={{ width: `${overallUsagePct}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#86868B] uppercase font-semibold">Matching Racks</span>
            <CheckCircle2 className="w-4 h-4 text-[#007AFF]" />
          </div>
          <div className="text-2xl font-bold text-[#007AFF] mt-1">
            {filteredRacks.length} <span className="text-xs text-[#86868B] font-normal">/ {racks.length}</span>
          </div>
          <span className="text-[10px] text-[#86868B]">Ready for Provisioning</span>
        </div>
      </div>

      {/* =====================================================================
          3. CONTIGUOUS SPACE FINDER FILTER BAR
          ===================================================================== */}
      <div className="p-4 rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rack name, row..."
              className="w-full bg-black/5 text-xs text-[#1D1D1F] placeholder:text-black/30 pl-9 pr-3 py-2 rounded-[10px] border-[0.5px] border-black/10 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 transition-colors"
            />
          </div>

          {/* Row Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#86868B] mr-1 font-medium">Row:</span>
            {availableRows.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRowFilter(r)}
                className={`px-3 py-1 rounded-[8px] transition-colors cursor-pointer text-xs font-semibold ${
                  rowFilter === r
                    ? "bg-[#007AFF] text-white shadow-xs"
                    : "bg-black/5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/10 border-[0.5px] border-black/10"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Space & Power Sliders/Pill Selectors */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-black/10 text-xs">
          {/* Required Contiguous U */}
          <div className="flex items-center gap-2">
            <span className="text-[#86868B] font-medium">Min Free Space:</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 4, 8].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setRequiredU(u)}
                  className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors cursor-pointer ${
                    requiredU === u
                      ? "bg-[#007AFF] text-white shadow-xs"
                      : "bg-black/5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/10 border-[0.5px] border-black/10"
                  }`}
                >
                  {u === 0 ? "Any" : `≥ ${u}U`}
                </button>
              ))}
            </div>
          </div>

          {/* Min Power Headroom */}
          <div className="flex items-center gap-2">
            <span className="text-[#86868B] font-medium">Power Headroom:</span>
            <div className="flex items-center gap-1">
              {[0, 1.0, 2.0, 3.0].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setMinPowerHeadroomKw(kw)}
                  className={`px-2.5 py-1 rounded-[6px] text-[11px] font-semibold transition-colors cursor-pointer ${
                    minPowerHeadroomKw === kw
                      ? "bg-[#ff9500] text-white shadow-xs"
                      : "bg-black/5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/10 border-[0.5px] border-black/10"
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
              className="p-4 rounded-[20px] bg-white/70 hover:bg-white backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 hover:border-[#007AFF]/40 transition-all group shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Rack Header */}
                <div className="flex items-center justify-between pb-2 border-b border-black/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#007AFF] group-hover:scale-125 transition-transform" />
                    <h4 className="font-semibold text-sm text-[#1D1D1F]">
                      {rack.name}
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px] bg-black/5 border-[0.5px] border-black/10 text-[#86868B]">
                    Row {rack.row}
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-3 my-3 text-xs">
                  {/* Space Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#86868B]">Space:</span>
                      <span className="font-bold text-[#1D1D1F]">
                        {rack.used_u} / {rack.total_u} U ({freeU}U Free)
                      </span>
                    </div>
                    <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden border-[0.5px] border-black/5">
                      <div
                        className={`h-full rounded-full ${
                          usagePct > 90 ? "bg-rose-500" : usagePct > 70 ? "bg-[#ff9500]" : "bg-[#007AFF]"
                        }`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Power Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#86868B]">Power:</span>
                      <span className="font-bold text-[#ff9500]">
                        {currentKw.toFixed(2)} / {maxKw.toFixed(1)} kW ({powerPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-black/5 h-2 rounded-full overflow-hidden border-[0.5px] border-black/5">
                      <div
                        className={`h-full rounded-full ${
                          powerPct > 85 ? "bg-rose-500" : powerPct > 65 ? "bg-[#ff9500]" : "bg-emerald-500"
                        }`}
                        style={{ width: `${powerPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Thermal & Redundancy Pills */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[11px] text-[#007AFF] font-medium">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{inletTemp.toFixed(1)}°C Inlet</span>
                    </div>

                    {hasFailoverRisk ? (
                      <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                        Single PDU Risk
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        2N Redundant
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-black/10 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onViewRackElevation(rack)}
                  className="flex-1 py-1.5 px-2.5 rounded-[10px] bg-black/5 hover:bg-black/10 border-[0.5px] border-black/10 text-xs font-semibold text-[#1D1D1F] transition-colors cursor-pointer text-center"
                >
                  Elevation
                </button>
                {onMountDevice && (
                  <button
                    type="button"
                    onClick={() => onMountDevice(rack.id)}
                    className="flex-1 py-1.5 px-2.5 rounded-[10px] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 border-[0.5px] border-[#007AFF]/30 text-xs text-[#007AFF] font-semibold transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
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
