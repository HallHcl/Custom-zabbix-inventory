import React, { useState } from "react";
import {
  AlertTriangle,
  Flame,
  Zap,
  Layers,
  ShieldAlert,
  ChevronRight,
  Maximize2,
  ArrowRight,
} from "lucide-react";
import { useTwinStore } from "../../store/useTwinStore";
import { IsometricRoom } from "../floorplan/IsometricRoom";
import { DataCenter3DView } from "../floorplan/DataCenter3DView";
import type { RoomOverview, RackSummary } from "../../types";

interface NOCPersonaViewProps {
  overview: RoomOverview | null;
  onSelectRack: (rack: RackSummary) => void;
  onViewRackElevation: (rack: RackSummary) => void;
  onNavigateToAlerts?: () => void;
}

export const NOCPersonaView: React.FC<NOCPersonaViewProps> = ({
  overview,
  onSelectRack,
  onViewRackElevation,
  onNavigateToAlerts,
}) => {
  const {
    viewportMode,
    activeOverlay,
    setActiveOverlay,
    toggleViewportMode,
    activeAlarms,
    racksTelemetry,
  } = useTwinStore();

  const [selectedRack, setSelectedRack] = useState<RackSummary | null>(null);
  const [showSuppressed, setShowSuppressed] = useState(false);

  const handleRackClick = (rack: RackSummary) => {
    setSelectedRack(rack);
    onSelectRack(rack);
  };

  const racks = overview?.racks ?? [];
  const roomTempTarget = overview?.room_temp_c ?? 22.0;

  // Filter alarms based on root cause vs child
  const rootAlarms = activeAlarms.filter(
    (a) => a.correlation?.correlation_status === "ROOT_CAUSE" || !a.correlation?.correlation_status
  );
  const childAlarms = activeAlarms.filter(
    (a) => a.correlation?.correlation_status === "SUPPRESSED_CHILD"
  );

  const displayedAlarms = showSuppressed ? activeAlarms : rootAlarms;

  // Map twin overlay to 3D color mode
  const colorModeMap: Record<string, "status" | "temp" | "power" | "3d"> = {
    STATUS: "status",
    THERMAL: "temp",
    POWER: "power",
    SPACE: "3d",
  };
  const activeColorMode = colorModeMap[activeOverlay] || "status";

  // Telemetry for selected rack if present
  const selectedRackTelem = selectedRack
    ? racksTelemetry[selectedRack.id.toString()] ||
      Object.values(racksTelemetry).find(
        (t) => t.rack_name.toLowerCase() === selectedRack.name.toLowerCase()
      )
    : null;

  return (
    <div className="relative w-full h-[calc(100vh-8.5rem)] flex flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] glass-panel select-none">
      {/* =====================================================================
          TOP FLOATING NOC HUD CONTROLS
          ===================================================================== */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Viewport Mode & Room Health Indicators */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center p-1 rounded-xl glass-panel-elevated shadow-lg">
            <button
              type="button"
              onClick={toggleViewportMode}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                viewportMode === "3D"
                  ? "bg-[var(--accent-primary)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>3D Spatial Twin</span>
            </button>
            <button
              type="button"
              onClick={toggleViewportMode}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                viewportMode === "2D"
                  ? "bg-[var(--accent-primary)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2.5D Isometric</span>
            </button>
          </div>

          {/* Quick Heatmap Overlay Toggle Bar */}
          <div className="hidden sm:flex items-center p-1 rounded-xl glass-panel-elevated shadow-lg text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveOverlay("STATUS")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeOverlay === "STATUS"
                  ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-bold border border-[var(--accent-primary)]/40"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Status</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveOverlay("THERMAL")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeOverlay === "THERMAL"
                  ? "bg-rose-500/20 text-rose-400 font-bold border border-rose-500/40"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Thermal</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveOverlay("POWER")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeOverlay === "POWER"
                  ? "bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Power</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveOverlay("SPACE")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeOverlay === "SPACE"
                  ? "bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/40"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Space</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Telemetry Stream Counter */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-3 py-1.5 rounded-xl glass-panel-elevated shadow-lg text-xs font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[var(--text-secondary)]">Live Racks:</span>
            <span className="font-bold text-[var(--text-bright)]">{racks.length}</span>
            <span className="text-[var(--border-strong)]">|</span>
            <span className="text-[var(--text-secondary)]">Target Temp:</span>
            <span className="font-bold text-[var(--accent-primary)]">{roomTempTarget.toFixed(1)}°C</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MAIN DIGITAL TWIN CANVAS (3D OR 2.5D)
          ===================================================================== */}
      <div className="relative flex-1 w-full h-full bg-[var(--bg-base)] overflow-hidden">
        {viewportMode === "3D" ? (
          <DataCenter3DView
            racks={racks}
            selectedRackId={selectedRack?.id ?? null}
            onSelectRack={handleRackClick}
            onViewRackElevation={onViewRackElevation}
            gridRows={6}
            gridCols={8}
            roomTempTarget={roomTempTarget}
            mode={activeColorMode}
          />
        ) : (
          <IsometricRoom
            racks={racks}
            selectedRackId={selectedRack?.id ?? null}
            onSelectRack={handleRackClick}
            onViewRackElevation={onViewRackElevation}
            statusCounts={
              overview?.status_counts || {
                healthy: 10,
                warning: 1,
                critical: 1,
                offline: 0,
              }
            }
            mode={activeColorMode}
          />
        )}

        {/* =====================================================================
            FLOATING SELECTED RACK QUICK-HUD PEEK
            ===================================================================== */}
        {selectedRack && (
          <div className="absolute top-16 right-4 z-20 w-80 rounded-2xl glass-panel-elevated p-4 shadow-2xl border border-[var(--border-strong)] animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div>
                <div className="text-[10px] font-mono uppercase text-[var(--accent-primary)] font-bold tracking-wider">
                  Selected Cabinet
                </div>
                <h3 className="text-base font-bold text-[var(--text-bright)] font-mono">
                  {selectedRack.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRack(null)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-white/10 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
              <div className="p-2 rounded-xl bg-[var(--bg-base)]/80 border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Slot Space</span>
                <span className="font-bold text-[var(--text-bright)]">
                  {selectedRack.used_u} / {selectedRack.total_u} U
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] ml-1">
                  ({Math.round((selectedRack.used_u / (selectedRack.total_u || 42)) * 100)}%)
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--bg-base)]/80 border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Power Load</span>
                <span className="font-bold text-amber-400">
                  {selectedRackTelem
                    ? (selectedRackTelem.total_power_watts / 1000).toFixed(2)
                    : selectedRack.power_kw.toFixed(2)}{" "}
                  kW
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--bg-base)]/80 border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Inlet Temp</span>
                <span className="font-bold text-cyan-400">
                  {selectedRackTelem
                    ? selectedRackTelem.inlet_temp_c.toFixed(1)
                    : selectedRack.inlet_temp_c.toFixed(1)}{" "}
                  °C
                </span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--bg-base)]/80 border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">PDU Failover</span>
                <span
                  className={`font-bold ${
                    selectedRackTelem?.redundancy_failover_risk
                      ? "text-rose-400 animate-pulse"
                      : "text-emerald-400"
                  }`}
                >
                  {selectedRackTelem?.redundancy_failover_risk ? "RISK (Single)" : "Redundant"}
                </span>
              </div>
            </div>

            {/* Open Full 42U Elevation Button */}
            <button
              type="button"
              onClick={() => onViewRackElevation(selectedRack)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-mono text-xs font-semibold shadow-lg shadow-[var(--accent-glow)] transition-all cursor-pointer"
            >
              <span>View 42U Interactive Rack Elevation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* =====================================================================
          BOTTOM LIVE ALARM STREAM & VIDEO WALL TICKER
          ===================================================================== */}
      <div className="h-16 shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/90 px-4 flex items-center justify-between z-20 font-mono text-xs">
        {/* Left: Ticker Label & Root-Cause vs Suppressed Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                rootAlarms.length > 0 ? "bg-rose-500 animate-pulse-ring" : "bg-emerald-400"
              }`}
            />
            <span className="font-bold text-[var(--text-bright)] text-xs tracking-wider uppercase">
              Live Alarm Stream
            </span>
          </div>

          <span className="px-2 py-0.5 rounded-full bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
            <span className="font-bold text-rose-400">{rootAlarms.length}</span> Root Problems
          </span>

          {childAlarms.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSuppressed(!showSuppressed)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Click to toggle blast-radius suppressed child alarms"
            >
              <span>{childAlarms.length} Suppressed by Blast Radius</span>
              <span className="underline ml-1">
                {showSuppressed ? "Hide" : "Show"}
              </span>
            </button>
          )}
        </div>

        {/* Center: Live Alarm Ticker Cards */}
        <div className="flex-1 mx-4 overflow-x-auto no-scrollbar flex items-center gap-2">
          {displayedAlarms.length === 0 ? (
            <div className="text-[var(--text-muted)] text-[11px] flex items-center gap-1.5">
              <span>All 24 cabinets operating within ASHRAE thermal and power thresholds.</span>
            </div>
          ) : (
            displayedAlarms.slice(0, 4).map((alarm, idx) => {
              const isRoot = alarm.correlation?.correlation_status === "ROOT_CAUSE";
              const isSuppressed = alarm.correlation?.correlation_status === "SUPPRESSED_CHILD";
              return (
                <div
                  key={alarm.event_id || idx}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0 transition-all ${
                    isRoot
                      ? "bg-rose-950/40 border-rose-500/40 text-rose-200"
                      : isSuppressed
                      ? "bg-slate-900/60 border-slate-700/60 text-slate-300 opacity-70"
                      : "bg-[var(--bg-base)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  }`}
                >
                  <AlertTriangle
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isRoot ? "text-rose-400 animate-pulse" : "text-amber-400"
                    }`}
                  />
                  <div className="flex flex-col leading-tight max-w-[200px] truncate">
                    <span className="font-bold text-[11px] truncate">
                      {alarm.trigger_name}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] truncate">
                      {isRoot
                        ? `[ROOT CAUSE] +${alarm.correlation?.suppressed_children_count || 0} downstream`
                        : isSuppressed
                        ? `[SUPPRESSED] Parent: ${alarm.correlation?.suppressed_children?.[0]?.root_cause_parent || "Core"}`
                        : alarm.item_name || "Telemetry Trigger"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Navigate to Dedicated Alerts View */}
        {onNavigateToAlerts && (
          <button
            type="button"
            onClick={onNavigateToAlerts}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] hover:bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-bright)] transition-colors cursor-pointer shrink-0"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
