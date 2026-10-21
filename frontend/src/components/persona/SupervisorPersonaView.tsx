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
        <div className="p-4 rounded-2xl glass-panel-elevated border border-[var(--accent-primary)]/40 bg-gradient-to-r from-[var(--accent-primary)]/10 via-transparent to-[var(--accent-primary)]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/40 flex items-center justify-center shrink-0">
              <Inbox className="w-5 h-5 text-[var(--accent-primary)] animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-[var(--text-bright)]">
                  Zabbix Auto-Discovery Ingestion Queue
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)] text-white text-[11px] font-mono font-bold">
                  {unassignedCount} Discovered
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                New hardware hosts discovered via Zabbix 7.0 network rules are ready to be mounted into physical rack units.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenUnassigned}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs font-semibold shadow-lg shadow-[var(--accent-glow)] transition-all cursor-pointer shrink-0"
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
        <div className="p-3.5 rounded-xl glass-panel border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Total Cabinets</span>
            <Server className="w-4 h-4 text-[var(--accent-primary)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-bright)] mt-1">
            {racks.length}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">Bangkok DC-1 (Halls A & B)</span>
        </div>

        <div className="p-3.5 rounded-xl glass-panel border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Available Space</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {totalFreeSlots} <span className="text-xs text-[var(--text-secondary)]">/ {totalSlots} U</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">({100 - overallUsagePct}% Free RU)</span>
        </div>

        <div className="p-3.5 rounded-xl glass-panel border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Space Utilization</span>
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-bright)] mt-1">
            {overallUsagePct}%
          </div>
          <div className="w-full bg-[var(--bg-base)] h-1.5 rounded-full mt-2 overflow-hidden border border-[var(--border-subtle)]">
            <div
              className="bg-[var(--accent-primary)] h-full rounded-full transition-all duration-500"
              style={{ width: `${overallUsagePct}%` }}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl glass-panel border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">Matching Racks</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {filteredRacks.length} <span className="text-xs text-[var(--text-secondary)]">/ {racks.length}</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">Ready for Provisioning</span>
        </div>
      </div>

      {/* =====================================================================
          3. CONTIGUOUS SPACE FINDER FILTER BAR
          ===================================================================== */}
      <div className="p-4 rounded-2xl glass-panel-elevated border border-[var(--border-base)] space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rack name, row..."
              className="w-full bg-[var(--bg-base)] text-xs text-[var(--text-bright)] placeholder:text-[var(--text-muted)] pl-9 pr-3 py-2 rounded-xl border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent-primary)] font-mono transition-colors"
            />
          </div>

          {/* Row Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-[var(--text-muted)] mr-1">Row:</span>
            {availableRows.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRowFilter(r)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  rowFilter === r
                    ? "bg-[var(--accent-primary)] text-white font-bold"
                    : "bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Space & Power Sliders/Pill Selectors */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[var(--border-subtle)] text-xs font-mono">
          {/* Required Contiguous U */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)]">Min Free Space:</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 4, 8].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setRequiredU(u)}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                    requiredU === u
                      ? "bg-[var(--accent-primary)] text-white font-bold"
                      : "bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)]"
                  }`}
                >
                  {u === 0 ? "Any" : `≥ ${u}U`}
                </button>
              ))}
            </div>
          </div>

          {/* Min Power Headroom */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)]">Power Headroom:</span>
            <div className="flex items-center gap-1">
              {[0, 1.0, 2.0, 3.0].map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setMinPowerHeadroomKw(kw)}
                  className={`px-2 py-0.5 rounded-md text-[11px] transition-colors cursor-pointer ${
                    minPowerHeadroomKw === kw
                      ? "bg-amber-500 text-black font-bold"
                      : "bg-[var(--bg-base)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)]"
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
              className="p-4 rounded-2xl glass-panel hover:glass-panel-elevated border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-all group shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Rack Header */}
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)] group-hover:scale-125 transition-transform" />
                    <h4 className="font-bold text-sm font-mono text-[var(--text-bright)]">
                      {rack.name}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                    Row {rack.row}
                  </span>
                </div>

                {/* Metrics */}
                <div className="space-y-3 my-3 text-xs font-mono">
                  {/* Space Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[var(--text-secondary)]">Space:</span>
                      <span className="font-bold text-[var(--text-bright)]">
                        {rack.used_u} / {rack.total_u} U ({freeU}U Free)
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-base)] h-1.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                      <div
                        className={`h-full rounded-full ${
                          usagePct > 90 ? "bg-rose-500" : usagePct > 70 ? "bg-amber-400" : "bg-[var(--accent-primary)]"
                        }`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Power Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[var(--text-secondary)]">Power:</span>
                      <span className="font-bold text-amber-400">
                        {currentKw.toFixed(2)} / {maxKw.toFixed(1)} kW ({powerPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-base)] h-1.5 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                      <div
                        className={`h-full rounded-full ${
                          powerPct > 85 ? "bg-rose-500" : powerPct > 65 ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                        style={{ width: `${powerPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Thermal & Redundancy Pills */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 text-[11px] text-cyan-400">
                      <Flame className="w-3.5 h-3.5" />
                      <span>{inletTemp.toFixed(1)}°C Inlet</span>
                    </div>

                    {hasFailoverRisk ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                        Single PDU Risk
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        2N Redundant
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onViewRackElevation(rack)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-xs font-mono text-[var(--text-bright)] transition-colors cursor-pointer text-center"
                >
                  Elevation
                </button>
                {onMountDevice && (
                  <button
                    type="button"
                    onClick={() => onMountDevice(rack.id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[var(--accent-primary)]/15 hover:bg-[var(--accent-primary)]/25 border border-[var(--accent-primary)]/30 text-xs font-mono text-[var(--accent-primary)] font-semibold transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
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
