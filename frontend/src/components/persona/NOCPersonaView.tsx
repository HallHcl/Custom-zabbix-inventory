import React, { useState } from "react";
import {
  AlertTriangle,
  Flame,
  Zap,
  Layers,
  ShieldAlert,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { useTwinStore } from "../../store/useTwinStore";
import { IsometricRoom } from "../floorplan/IsometricRoom";
import { DataCenter3DView, type ColorMode } from "../floorplan/DataCenter3DView";
import type { RoomOverview, RackSummary } from "../../types";
import type { HeatmapOverlay } from "../../types/twin";
import { useTheme } from "../../lib/theme";

interface NOCPersonaViewProps {
  overview: RoomOverview | null;
  onSelectRack: (rack: RackSummary) => void;
  onViewRackElevation: (rack: RackSummary) => void;
  onNavigateToAlerts?: () => void;
  onLayoutUpdated?: () => void;
}

export const NOCPersonaView: React.FC<NOCPersonaViewProps> = ({
  overview,
  onSelectRack,
  onViewRackElevation,
  onNavigateToAlerts,
  onLayoutUpdated,
}) => {
  const { isTeslaDark } = useTheme();
  const {
    viewportMode,
    activeOverlay,
    setActiveOverlay,
    activeAlarms,
    racksTelemetry,
  } = useTwinStore();

  const [selectedRack, setSelectedRack] = useState<RackSummary | null>(null);
  const [showSuppressed, setShowSuppressed] = useState(false);

  const handleRackClick = (rack: RackSummary | null) => {
    setSelectedRack(rack);
    if (rack) {
      onSelectRack(rack);
    }
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

  const handleModeChange3D = (newMode: ColorMode) => {
    const map: Record<ColorMode, HeatmapOverlay> = {
      status: "STATUS",
      temp: "THERMAL",
      power: "POWER",
      "3d": "SPACE",
    };
    setActiveOverlay(map[newMode] || "STATUS");
  };

  // Deferred 3D spatial twin toggle hidden as part of DC Vision scope
  const viewportControlElement = null;

  const telemetryElement = (
    <div className={`px-3.5 py-1.5 border text-xs flex items-center gap-2 transition-colors ${
      isTeslaDark
        ? 'rounded-[6px] bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]'
        : 'rounded-[12px] bg-white/80 backdrop-blur-xl saturate-180 border-black/10 shadow-xs text-zinc-800'
    }`}>
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <span className={isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}>Live Racks:</span>
      <span className={`font-bold ${isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-[#1D1D1F]'}`}>{racks.length}</span>
      <span className={isTeslaDark ? 'text-white/15' : 'text-black/15'}>|</span>
      <span className={isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}>Target Temp:</span>
      <span className={`font-bold ${isTeslaDark ? 'text-[#3E6AE1] font-mono' : 'text-[#007AFF]'}`}>{roomTempTarget.toFixed(1)}°C</span>
    </div>
  );

  return (
    <div className={`relative w-full h-[calc(100vh-8.5rem)] flex flex-col overflow-hidden border select-none transition-colors ${
      isTeslaDark
        ? 'rounded-[8px] border-[#1F1F1F] bg-[#000000]'
        : 'rounded-[20px] border-black/10 bg-white/70 backdrop-blur-xl saturate-180 shadow-sm'
    }`}>
      {/* In 2D Isometric mode, render floating HUD ribbon above canvas. In 3D mode, DataCenter3DView renders the unified ribbon */}
      {viewportMode === "2D" && (
        <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {viewportControlElement}
            <div className={`hidden sm:flex items-center p-1 border text-xs transition-colors ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#111111] border-[#1F1F1F]'
                : 'rounded-[12px] bg-white/80 backdrop-blur-xl saturate-180 border-black/10 shadow-xs'
            }`}>
              <button
                type="button"
                onClick={() => setActiveOverlay("STATUS")}
                className={`px-3 py-1 rounded-[8px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeOverlay === "STATUS"
                    ? isTeslaDark ? "bg-[#3E6AE1] text-white font-semibold" : "bg-[#007AFF] text-white font-semibold shadow-xs"
                    : isTeslaDark ? "text-[#8E8E93] hover:text-[#F5F5F7]" : "text-[#86868B] hover:text-[#1D1D1F]"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Status</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveOverlay("THERMAL")}
                className={`px-3 py-1 rounded-[8px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeOverlay === "THERMAL"
                    ? "bg-[#ff3b30] text-white font-semibold shadow-xs"
                    : isTeslaDark ? "text-[#8E8E93] hover:text-[#F5F5F7]" : "text-[#86868B] hover:text-[#1D1D1F]"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Thermal</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveOverlay("POWER")}
                className={`px-3 py-1 rounded-[8px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeOverlay === "POWER"
                    ? "bg-[#ff9500] text-white font-semibold shadow-xs"
                    : isTeslaDark ? "text-[#8E8E93] hover:text-[#F5F5F7]" : "text-[#86868B] hover:text-[#1D1D1F]"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Power</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveOverlay("SPACE")}
                className={`px-3 py-1 rounded-[8px] transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeOverlay === "SPACE"
                    ? "bg-[#5856d6] text-white font-semibold shadow-xs"
                    : isTeslaDark ? "text-[#8E8E93] hover:text-[#F5F5F7]" : "text-[#86868B] hover:text-[#1D1D1F]"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Space</span>
              </button>
            </div>
          </div>

          <div className="pointer-events-auto">
            {telemetryElement}
          </div>
        </div>
      )}

      {/* =====================================================================
          MAIN DIGITAL TWIN CANVAS (3D OR 2.5D)
          ===================================================================== */}
      <div className={`relative flex-1 w-full h-full overflow-hidden transition-colors ${
        isTeslaDark ? 'bg-[#000000]' : 'bg-[#f5f5f7]'
      }`}>
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
            onModeChange={handleModeChange3D}
            viewportControl={viewportControlElement}
            telemetrySlot={telemetryElement}
            roomId={overview?.room_id || 1}
            onLayoutUpdated={onLayoutUpdated}
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
            roomId={overview?.room_id || 1}
            gridRows={overview?.grid_rows || 5}
            gridCols={overview?.grid_cols || 6}
            mode={activeColorMode}
            hideViewModeControls={true}
            hideRotationControls={true}
          />
        )}

        {/* =====================================================================
            FLOATING SELECTED RACK QUICK-HUD PEEK
            ===================================================================== */}
        {selectedRack && (
          <div className={`absolute top-16 right-4 z-20 w-80 p-4 border animate-in fade-in slide-in-from-right-4 duration-200 ${
            isTeslaDark
              ? 'rounded-[8px] bg-[#111111] border-[#1F1F1F] text-[#F5F5F7] shadow-[0_0_24px_rgba(0,0,0,0.8)]'
              : 'rounded-[20px] bg-white/90 backdrop-blur-2xl border-black/10 shadow-2xl text-[#1D1D1F]'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${
              isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
            }`}>
              <div>
                <div className={`text-[10px] uppercase font-bold tracking-wider ${
                  isTeslaDark ? 'text-[#3E6AE1] font-mono' : 'text-[#007AFF]'
                }`}>
                  Selected Cabinet
                </div>
                <h3 className={`text-base font-bold ${
                  isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-[#1D1D1F]'
                }`}>
                  {selectedRack.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRack(null)}
                className={`w-6 h-6 rounded-[8px] flex items-center justify-center text-xs transition-colors ${
                  isTeslaDark ? 'text-[#8E8E93] hover:text-white hover:bg-[#1a1a1a]' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 my-3 text-xs">
              <div className={`p-2.5 border ${
                isTeslaDark ? 'rounded-[6px] bg-[#161616] border-[#222222]' : 'rounded-[12px] bg-black/[0.03] border-black/10'
              }`}>
                <span className={`text-[10px] block uppercase font-medium ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Slot Space</span>
                <span className={`font-bold ${isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-[#1D1D1F]'}`}>
                  {selectedRack.used_u} / {selectedRack.total_u} U
                </span>
                <span className={`text-[10px] ml-1 ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>
                  ({Math.round((selectedRack.used_u / (selectedRack.total_u || 42)) * 100)}%)
                </span>
              </div>

              <div className={`p-2.5 border ${
                isTeslaDark ? 'rounded-[6px] bg-[#161616] border-[#222222]' : 'rounded-[12px] bg-black/[0.03] border-black/10'
              }`}>
                <span className={`text-[10px] block uppercase font-medium ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Power Load</span>
                <span className={`font-bold text-[#ff9500] ${isTeslaDark ? 'font-mono' : ''}`}>
                  {selectedRackTelem
                    ? (selectedRackTelem.total_power_watts / 1000).toFixed(2)
                    : selectedRack.power_kw.toFixed(2)}{" "}
                  kW
                </span>
              </div>

              <div className={`p-2.5 border ${
                isTeslaDark ? 'rounded-[6px] bg-[#161616] border-[#222222]' : 'rounded-[12px] bg-black/[0.03] border-black/10'
              }`}>
                <span className={`text-[10px] block uppercase font-medium ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>Inlet Temp</span>
                <span className={`font-bold ${isTeslaDark ? 'text-[#3E6AE1] font-mono' : 'text-[#007AFF]'}`}>
                  {selectedRackTelem
                    ? selectedRackTelem.inlet_temp_c.toFixed(1)
                    : selectedRack.inlet_temp_c.toFixed(1)}{" "}
                  °C
                </span>
              </div>

              <div className={`p-2.5 border ${
                isTeslaDark ? 'rounded-[6px] bg-[#161616] border-[#222222]' : 'rounded-[12px] bg-black/[0.03] border-black/10'
              }`}>
                <span className={`text-[10px] block uppercase font-medium ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>PDU Failover</span>
                <span
                  className={`font-bold ${
                    selectedRackTelem?.redundancy_failover_risk
                      ? "text-rose-600 animate-pulse"
                      : isTeslaDark ? "text-[#00C853]" : "text-emerald-600"
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
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold transition-all cursor-pointer ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#3E6AE1] hover:bg-[#3459c5] text-white font-mono tracking-wide shadow-[0_0_12px_rgba(62,106,225,0.3)]'
                  : 'rounded-[12px] bg-[#007AFF] hover:bg-[#0071E3] text-white shadow-sm'
              }`}
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
      <div className={`h-16 shrink-0 border-t px-4 flex items-center justify-between z-20 text-xs transition-colors ${
        isTeslaDark
          ? 'border-[#1F1F1F] bg-[#0c0c0e] text-[#F5F5F7]'
          : 'border-black/10 bg-white/80 backdrop-blur-xl text-zinc-800'
      }`}>
        {/* Left: Ticker Label & Root-Cause vs Suppressed Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                rootAlarms.length > 0 ? "bg-rose-500 animate-pulse" : isTeslaDark ? "bg-[#00C853]" : "bg-emerald-500"
              }`}
            />
            <span className={`font-semibold text-xs tracking-wider uppercase ${
              isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-[#1D1D1F]'
            }`}>
              Live Alarm Stream
            </span>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full border text-[11px] ${
            isTeslaDark
              ? 'bg-[#161616] border-[#222222] text-[#8E8E93] font-mono'
              : 'bg-black/5 border-black/10 text-[#86868B]'
          }`}>
            <span className="font-bold text-rose-500">{rootAlarms.length}</span> Root Problems
          </span>

          {childAlarms.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSuppressed(!showSuppressed)}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] transition-colors cursor-pointer ${
                isTeslaDark
                  ? 'bg-[#161616] hover:bg-[#202020] border-[#222222] text-[#A1A1A6]'
                  : 'bg-black/5 hover:bg-black/10 border-black/10 text-[#1D1D1F]'
              }`}
              title="Click to toggle blast-radius suppressed child alarms"
            >
              <span>{childAlarms.length} Suppressed by Blast Radius</span>
              <span className={`underline ml-1 font-semibold ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#007AFF]'}`}>
                {showSuppressed ? "Hide" : "Show"}
              </span>
            </button>
          )}
        </div>

        {/* Center: Live Alarm Ticker Cards */}
        <div className="flex-1 mx-4 overflow-x-auto no-scrollbar flex items-center gap-2">
          {displayedAlarms.length === 0 ? (
            <div className={`text-[11px] flex items-center gap-1.5 ${
              isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'
            }`}>
              <span>All 24 cabinets operating within ASHRAE thermal and power thresholds.</span>
            </div>
          ) : (
            displayedAlarms.slice(0, 4).map((alarm, idx) => {
              const isRoot = alarm.correlation?.correlation_status === "ROOT_CAUSE";
              const isSuppressed = alarm.correlation?.correlation_status === "SUPPRESSED_CHILD";
              return (
                <div
                  key={alarm.event_id || idx}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] border shrink-0 transition-all ${
                    isRoot
                      ? isTeslaDark ? "bg-[#250d11] border-rose-900/60 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800"
                      : isSuppressed
                      ? isTeslaDark ? "bg-[#18181b] border-zinc-800 text-zinc-400 opacity-80" : "bg-zinc-100 border-zinc-200 text-zinc-600 opacity-80"
                      : isTeslaDark ? "bg-[#161616] border-[#222222] text-[#F5F5F7]" : "bg-white border-black/10 text-[#1D1D1F]"
                  }`}
                >
                  <AlertTriangle
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isRoot ? "text-rose-500 animate-pulse" : "text-amber-500"
                    }`}
                  />
                  <div className="flex flex-col leading-tight max-w-[200px] truncate">
                    <span className="font-bold text-[11px] truncate">
                      {alarm.trigger_name}
                    </span>
                    <span className={`text-[9px] truncate ${isTeslaDark ? 'text-[#8E8E93]' : 'text-[#86868B]'}`}>
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
            className={`flex items-center gap-1 px-3 py-1.5 border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#161616] hover:bg-[#202020] border-[#222222] text-[#F5F5F7]'
                : 'rounded-[10px] bg-black/5 hover:bg-black/10 border-black/10 text-[#1D1D1F]'
            }`}
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
