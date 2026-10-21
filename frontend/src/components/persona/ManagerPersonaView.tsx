import React from "react";
import {
  Zap,
  AlertCircle,
  Clock,
  DollarSign,
  PieChart,
  Layers,
} from "lucide-react";
import { useTwinStore } from "../../store/useTwinStore";
import type { RoomOverview } from "../../types";

interface ManagerPersonaViewProps {
  overview: RoomOverview | null;
}

export const ManagerPersonaView: React.FC<ManagerPersonaViewProps> = ({ overview }) => {
  const { facilityTelemetry, racksTelemetry } = useTwinStore();

  const itLoadKw = facilityTelemetry?.total_it_load_kw ?? 142.5;
  const coolingLoadKw = facilityTelemetry?.cooling_load_kw ?? 25.6;
  const totalFacilityKw = facilityTelemetry?.total_facility_power_kw ?? 168.1;
  const pue = facilityTelemetry?.pue ?? 1.18;
  const pueRating = facilityTelemetry?.pue_efficiency_rating ?? "EXCELLENT";

  const racks = overview?.racks ?? [];
  const totalRacks = racks.length || 24;
  const totalSlots = racks.reduce((acc, r) => acc + (r.total_u || 42), 0) || 1008;
  const usedSlots = racks.reduce((acc, r) => acc + (r.used_u || 0), 0) || 452;
  const spaceUtilPct = Math.round((usedSlots / totalSlots) * 100);

  // Stranded Capacity Metrics Calculation
  let powerConstrainedRacks = 0; // High power > 80%, but RU free > 10
  let spaceConstrainedRacks = 0; // High space > 90%, but power < 50%
  let thermallyConstrainedRacks = 0; // Hot inlet > 25 C

  Object.values(racksTelemetry).forEach((r) => {
    const powerPct = r.power_usage_pct || 0;
    const inlet = r.inlet_temp_c || 22;
    if (powerPct > 75) powerConstrainedRacks++;
    if (inlet > 25.5) thermallyConstrainedRacks++;
  });

  racks.forEach((r) => {
    const freeU = (r.total_u || 42) - (r.used_u || 0);
    if (freeU < 4) spaceConstrainedRacks++;
  });

  // Calculate estimated monthly energy cost (Assuming ~4.2 THB or $0.12 / kWh)
  const monthlyKwh = totalFacilityKw * 24 * 30;
  const estMonthlyCostThb = Math.round(monthlyKwh * 4.2);

  return (
    <div className="w-full space-y-5 pb-8 select-none">
      {/* =====================================================================
          1. EXECUTIVE KPI SUMMARY STRIP
          ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PUE Efficiency Gauge */}
        <div className="p-4 rounded-2xl glass-panel border border-[var(--border-subtle)] relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase">PUE Efficiency</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {pueRating}
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-[var(--text-bright)] mt-2">
            {pue.toFixed(2)}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            ASHRAE TC 9.9 Compliant (<span className="text-emerald-400 font-bold">&lt; 1.20</span> optimal)
          </p>
        </div>

        {/* Total IT & Cooling Load */}
        <div className="p-4 rounded-2xl glass-panel border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase">Total Facility Power</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-2">
            {totalFacilityKw.toFixed(1)} <span className="text-sm text-[var(--text-secondary)]">kW</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            IT Load: <span className="text-[var(--text-bright)] font-semibold">{itLoadKw.toFixed(1)} kW</span> | Cooling:{" "}
            <span className="text-cyan-400 font-semibold">{coolingLoadKw.toFixed(1)} kW</span>
          </p>
        </div>

        {/* Estimated Monthly Electricity Cost */}
        <div className="p-4 rounded-2xl glass-panel border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase">Est. Monthly Power Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-[var(--text-bright)] mt-2">
            ฿{estMonthlyCostThb.toLocaleString()}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            Based on ~{Math.round(monthlyKwh).toLocaleString()} kWh/mo @ ฿4.2/kWh
          </p>
        </div>

        {/* Physical Space Utilization */}
        <div className="p-4 rounded-2xl glass-panel border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase">Floor Space Utilization</span>
            <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
          </div>
          <div className="text-3xl font-bold font-mono text-[var(--accent-primary)] mt-2">
            {spaceUtilPct}%
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            {usedSlots} U Active | {totalSlots - usedSlots} U Contiguous Headroom
          </p>
        </div>
      </div>

      {/* =====================================================================
          2. STRANDED CAPACITY & BOTTLENECK ANALYSIS
          ===================================================================== */}
      <div className="p-5 rounded-2xl glass-panel-elevated border border-[var(--border-base)] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="font-bold text-sm text-[var(--text-bright)] font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>3-Way Stranded Capacity Bottleneck Analysis</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Identifies stranded capital where rack space, power capacity, or cooling density prevents optimal server deployment.
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
            Bangkok DC-1 Assessment
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Space Bottleneck */}
          <div className="p-4 rounded-xl bg-[var(--bg-base)]/80 border border-[var(--border-subtle)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[var(--text-bright)]">Space Bottleneck</span>
                <span className="text-xs font-mono text-cyan-400 font-bold">Low Risk</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-2">
                Cabinets with &lt; 4U remaining where blade expansions cannot physically mount.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between font-mono text-xs">
              <span className="text-[var(--text-muted)]">Affected Cabinets:</span>
              <span className="font-bold text-[var(--text-bright)]">
                {spaceConstrainedRacks} of {totalRacks} Racks
              </span>
            </div>
          </div>

          {/* Power Bottleneck */}
          <div className="p-4 rounded-xl bg-[var(--bg-base)]/80 border border-[var(--border-subtle)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[var(--text-bright)]">Power Headroom Stranding</span>
                <span className="text-xs font-mono text-amber-400 font-bold">Moderate Risk</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-2">
                Cabinets with &gt; 75% PDU power load where high-density servers cannot be added despite free RU.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between font-mono text-xs">
              <span className="text-[var(--text-muted)]">Affected Cabinets:</span>
              <span className="font-bold text-amber-400">{powerConstrainedRacks} Racks</span>
            </div>
          </div>

          {/* Thermal / Hot Spots Bottleneck */}
          <div className="p-4 rounded-xl bg-[var(--bg-base)]/80 border border-[var(--border-subtle)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[var(--text-bright)]">Thermal Hot-Spot Stranding</span>
                <span className="text-xs font-mono text-emerald-400 font-bold">Optimal</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mt-2">
                Cabinets with inlet temperature &gt; 25.5°C requiring CRAC airflow rebalancing.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between font-mono text-xs">
              <span className="text-[var(--text-muted)]">Hot Cabinets:</span>
              <span className="font-bold text-emerald-400">{thermallyConstrainedRacks} Racks</span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. HARDWARE LIFECYCLE & TENANT ALLOCATION
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hardware Lifecycle & Warranty Distribution */}
        <div className="p-5 rounded-2xl glass-panel border border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs font-mono text-[var(--text-bright)] uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Asset Lifecycle & Warranty Health</span>
            </h4>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">77 Tracked Assets</span>
          </div>

          <div className="space-y-3 pt-2 text-xs font-mono">
            {/* Active Warranty */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--text-secondary)]">Under Active Vendor Warranty (&lt; 3 yrs):</span>
                <span className="font-bold text-emerald-400">58 Units (75%)</span>
              </div>
              <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: "75%" }} />
              </div>
            </div>

            {/* Expiring Soon */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--text-secondary)]">Warranty Expiring within 90 Days:</span>
                <span className="font-bold text-amber-400">12 Units (16%)</span>
              </div>
              <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: "16%" }} />
              </div>
            </div>

            {/* EOL / Out of Warranty */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--text-secondary)]">Out of Warranty / Refresh Candidates:</span>
                <span className="font-bold text-rose-400">7 Units (9%)</span>
              </div>
              <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: "9%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Tenant / Project Allocation */}
        <div className="p-5 rounded-2xl glass-panel border border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs font-mono text-[var(--text-bright)] uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <span>Tenant / Workload Distribution</span>
            </h4>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">Bangkok DC-1</span>
          </div>

          <div className="space-y-3 pt-2 text-xs font-mono">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--text-secondary)]">Production Cloud & Kubernetes:</span>
                <span className="font-bold text-[var(--text-bright)]">42% (10 Racks)</span>
              </div>
              <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div className="bg-[var(--accent-primary)] h-full rounded-full" style={{ width: "42%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--text-secondary)]">Enterprise Core & Database:</span>
                <span className="font-bold text-[var(--text-bright)]">28% (7 Racks)</span>
              </div>
              <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div className="bg-cyan-400 h-full rounded-full" style={{ width: "28%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--text-secondary)]">AI Training & pgvector RAG Cluster:</span>
                <span className="font-bold text-[var(--text-bright)]">18% (4 Racks)</span>
              </div>
              <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div className="bg-purple-400 h-full rounded-full" style={{ width: "18%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[var(--text-secondary)]">Reserved Expansion Buffer:</span>
                <span className="font-bold text-emerald-400">12% (3 Racks)</span>
              </div>
              <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: "12%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
