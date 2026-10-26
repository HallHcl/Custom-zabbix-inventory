import React, { useEffect } from "react";
import {
  Activity,
  BarChart3,
  Layers,
  Search,
  ChevronRight,
  Inbox,
  Command,
  ShieldAlert,
  Sun,
  Zap,
} from "lucide-react";
import { useTwinStore } from "../../store/useTwinStore";
import { useTheme } from "../../lib/theme";

interface TopGlassmorphicHUDProps {
  onOpenUnassigned?: () => void;
  unassignedCount?: number;
}

export const TopGlassmorphicHUD: React.FC<TopGlassmorphicHUDProps> = ({
  onOpenUnassigned,
  unassignedCount = 0,
}) => {
  const {
    persona,
    setPersona,
    spatialBreadcrumb,
    setSpatialLevel,
    resetSpatialSelection,
    facilityTelemetry,
    activeAlarms,
    wsConnected,
    openSpotlight,
    zabbixStatus,
  } = useTwinStore();

  const { toggleDualSystem, isTeslaDark } = useTheme();

  // Keyboard shortcut listener for Cmd/Ctrl + K (Spotlight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSpotlight();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSpotlight]);

  const itLoadKw = facilityTelemetry?.total_it_load_kw ?? 98.0;
  const problemCount = activeAlarms.filter((a) => a.event_status === "PROBLEM").length;

  return (
    <header
      className={`relative h-14 shrink-0 px-5 flex items-center justify-between z-30 select-none transition-colors duration-200 border-b ${
        isTeslaDark
          ? "bg-[#000000] border-[#1F1F1F] text-[#F5F5F7] font-sans"
          : "bg-white/75 backdrop-blur-2xl border-black/10 text-[#1d1d1f] font-sans tracking-[-0.011em]"
      }`}
    >
      {/* =====================================================================
          LEFT: CLEAN SPATIAL BREADCRUMB
          ===================================================================== */}
      <div className="flex items-center gap-1.5 min-w-0 text-xs">
        {/* Site Level */}
        <button
          type="button"
          onClick={resetSpatialSelection}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] transition-colors cursor-pointer font-medium ${
            isTeslaDark
              ? "text-[#A1A1A6] hover:text-[#F5F5F7] hover:bg-[#111111]"
              : "text-zinc-700 hover:text-black hover:bg-black/[0.04]"
          }`}
          title="Return to Site Overview"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isTeslaDark ? "bg-[#3E6AE1]" : "bg-[#0071E3]"
            }`}
          />
          <span className={isTeslaDark ? "font-mono" : ""}>
            {spatialBreadcrumb.siteName || "Bangkok DC-1"}
          </span>
        </button>

        {/* Dynamic Spatial Path */}
        {spatialBreadcrumb.buildingName && (
          <div className="flex items-center gap-1 shrink-0 text-zinc-400">
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <button
              type="button"
              onClick={() => setSpatialLevel("building", null, spatialBreadcrumb.buildingName)}
              className={`px-2 py-1 rounded-[6px] transition-colors cursor-pointer ${
                isTeslaDark
                  ? "text-[#A1A1A6] hover:text-[#F5F5F7] hover:bg-[#111111] font-mono"
                  : "text-zinc-600 hover:text-black hover:bg-black/[0.04]"
              }`}
            >
              {spatialBreadcrumb.buildingName}
            </button>
          </div>
        )}

        {spatialBreadcrumb.roomName && (
          <div className="flex items-center gap-1 shrink-0 text-zinc-400">
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <button
              type="button"
              onClick={() => setSpatialLevel("room", null, spatialBreadcrumb.roomName)}
              className={`px-2 py-1 rounded-[6px] transition-colors cursor-pointer ${
                isTeslaDark
                  ? "text-[#A1A1A6] hover:text-[#F5F5F7] hover:bg-[#111111] font-mono"
                  : "text-zinc-600 hover:text-black hover:bg-black/[0.04]"
              }`}
            >
              {spatialBreadcrumb.roomName}
            </button>
          </div>
        )}

        {spatialBreadcrumb.rackName && (
          <div className="flex items-center gap-1 shrink-0">
            <ChevronRight className="w-3.5 h-3.5 opacity-60 text-zinc-400" />
            <span
              className={`px-2.5 py-0.5 rounded-[4px] border font-semibold text-xs font-mono ${
                isTeslaDark
                  ? "bg-[#3E6AE1]/20 border-[#3E6AE1]/50 text-[#3E6AE1]"
                  : "bg-[#0071E3]/10 border-[#0071E3]/30 text-[#0071E3]"
              }`}
            >
              {spatialBreadcrumb.rackName}
            </span>
          </div>
        )}
      </div>

      {/* =====================================================================
          CENTER: PERSONA PILLS (Apple Rounded / Tesla Utilitarian)
          ===================================================================== */}
      <div className="hidden md:flex items-center justify-center">
        <div
          className={`flex items-center p-1 border ${
            isTeslaDark
              ? "bg-[#111111] border-[#1F1F1F] rounded-[6px]"
              : "bg-black/[0.04] border-black/10 rounded-[10px]"
          }`}
        >
          <button
            type="button"
            onClick={() => setPersona("NOC")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold tracking-[-0.011em] transition-all cursor-pointer ${
              persona === "NOC"
                ? isTeslaDark
                  ? "bg-[#1C1C1E] text-white border border-[#2E2E2E] rounded-[4px]"
                  : "bg-white text-[#1d1d1f] shadow-sm rounded-[8px]"
                : isTeslaDark
                ? "text-[#636366] hover:text-[#A1A1A6] rounded-[4px]"
                : "text-zinc-500 hover:text-black rounded-[8px]"
            }`}
            title="NOC Mode: 24/7 Operations, Video Wall, Heatmaps & Alarms"
          >
            <Activity
              className={`w-3.5 h-3.5 ${
                persona === "NOC"
                  ? isTeslaDark
                    ? "text-[#3E6AE1]"
                    : "text-[#0071E3]"
                  : ""
              }`}
            />
            <span>NOC Twin</span>
          </button>

          <button
            type="button"
            onClick={() => setPersona("Supervisor")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold tracking-[-0.011em] transition-all cursor-pointer ${
              persona === "Supervisor"
                ? isTeslaDark
                  ? "bg-[#1C1C1E] text-white border border-[#2E2E2E] rounded-[4px]"
                  : "bg-white text-[#1d1d1f] shadow-sm rounded-[8px]"
                : isTeslaDark
                ? "text-[#636366] hover:text-[#A1A1A6] rounded-[4px]"
                : "text-zinc-500 hover:text-black rounded-[8px]"
            }`}
            title="Supervisor Mode: Floor Layout Builder, Space & Discovery"
          >
            <Layers
              className={`w-3.5 h-3.5 ${
                persona === "Supervisor" ? "text-emerald-500" : ""
              }`}
            />
            <span>Supervisor</span>
          </button>

          <button
            type="button"
            onClick={() => setPersona("Manager")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold tracking-[-0.011em] transition-all cursor-pointer ${
              persona === "Manager"
                ? isTeslaDark
                  ? "bg-[#1C1C1E] text-white border border-[#2E2E2E] rounded-[4px]"
                  : "bg-white text-[#1d1d1f] shadow-sm rounded-[8px]"
                : isTeslaDark
                ? "text-[#636366] hover:text-[#A1A1A6] rounded-[4px]"
                : "text-zinc-500 hover:text-black rounded-[8px]"
            }`}
            title="Executive Mode: Capacity, PUE Benchmarks & Cost"
          >
            <BarChart3
              className={`w-3.5 h-3.5 ${
                persona === "Manager" ? "text-amber-500" : ""
              }`}
            />
            <span>Executive</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          RIGHT: CONSOLIDATED ACTIONS, DUAL-SYSTEM TOGGLE & STATUS
          ===================================================================== */}
      <div className="flex items-center gap-2.5">
        {/* Consolidated Live Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium border transition-all cursor-default ${
            problemCount > 0
              ? isTeslaDark
                ? "bg-[#E82127]/15 border-[#E82127]/40 text-[#E82127] rounded-[6px]"
                : "bg-[#ff3b30]/10 border-[#ff3b30]/30 text-[#ff3b30] rounded-[10px]"
              : isTeslaDark
              ? "bg-[#111111] border-[#1F1F1F] text-[#F5F5F7] rounded-[6px]"
              : "bg-black/[0.03] border-black/10 text-zinc-700 rounded-[10px]"
          }`}
          title={`Zabbix Engine: ${zabbixStatus?.status || "CONNECTED"} • Total IT Load: ${itLoadKw.toFixed(1)} kW • WebSocket: ${wsConnected ? "Connected" : "Disconnected"}`}
        >
          {problemCount > 0 ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-[#E82127] animate-pulse" />
              <span className="font-semibold font-mono">{problemCount} Alarms</span>
            </>
          ) : (
            <>
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isTeslaDark ? "bg-[#00C853]" : "bg-emerald-500 shadow-[0_0_6px_#10b981]"
                }`}
              />
              <div className="flex items-center gap-1.5 font-mono">
                <span className={isTeslaDark ? "text-white font-bold" : "text-[#1d1d1f] font-semibold"}>
                  {itLoadKw.toFixed(1)} kW
                </span>
                <span className={isTeslaDark ? "text-[#636366]" : "text-zinc-300"}>•</span>
                <span className={isTeslaDark ? "text-[#00C853] text-[11px]" : "text-zinc-500 text-[11px]"}>
                  Nominal
                </span>
              </div>
            </>
          )}
        </div>

        {/* Global Spotlight Search Trigger */}
        <button
          type="button"
          onClick={openSpotlight}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-all cursor-pointer border ${
            isTeslaDark
              ? "bg-[#111111] hover:bg-[#161616] border-[#1F1F1F] text-[#A1A1A6] hover:text-[#F5F5F7] rounded-[6px]"
              : "bg-black/[0.03] hover:bg-black/[0.06] border-black/10 text-zinc-700 hover:text-black rounded-[10px] shadow-sm"
          }`}
          title="Open Spotlight Search (⌘K / Ctrl+K)"
        >
          <Search className={`w-3.5 h-3.5 ${isTeslaDark ? "text-[#636366]" : "text-zinc-500"}`} />
          <span className="hidden sm:inline text-xs">Search</span>
          <kbd
            className={`hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded-[4px] ${
              isTeslaDark
                ? "bg-[#1C1C1E] text-[#636366] border border-[#1F1F1F]"
                : "bg-black/[0.05] text-zinc-500"
            }`}
          >
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </kbd>
        </button>

        {/* Unassigned Inbox Button */}
        {onOpenUnassigned && (
          <button
            type="button"
            onClick={onOpenUnassigned}
            className={`relative p-2 text-xs transition-all cursor-pointer border ${
              isTeslaDark
                ? "bg-[#111111] hover:bg-[#161616] border-[#1F1F1F] text-[#A1A1A6] hover:text-[#F5F5F7] rounded-[6px]"
                : "bg-black/[0.03] hover:bg-black/[0.06] border-black/10 text-zinc-700 hover:text-black rounded-[10px]"
            }`}
            title="Discovery Inbox"
          >
            <Inbox className={`w-4 h-4 ${isTeslaDark ? "text-[#A1A1A6]" : "text-zinc-600"}`} />
            {unassignedCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${
                  isTeslaDark ? "bg-[#3E6AE1]" : "bg-[#0071E3] shadow-sm"
                }`}
              >
                {unassignedCount}
              </span>
            )}
          </button>
        )}

        {/* Strictly 2 Modes Only: Apple Light <-> Tesla Dark */}
        <button
          type="button"
          onClick={toggleDualSystem}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono transition-all cursor-pointer border ${
            isTeslaDark
              ? "bg-[#111111] hover:bg-[#161616] border-[#3E6AE1]/60 text-[#3E6AE1] rounded-[6px] shadow-[0_0_12px_rgba(62,106,225,0.2)]"
              : "bg-white/80 hover:bg-white border-black/15 text-[#1d1d1f] hover:text-black rounded-[10px] shadow-sm"
          }`}
          title={isTeslaDark ? "Current: Tesla Dark (Click to switch to Apple Light)" : "Current: Apple Light (Click to switch to Tesla Dark)"}
        >
          {isTeslaDark ? (
            <>
              <Zap className="w-3.5 h-3.5 text-[#3E6AE1]" />
              <span className="font-bold tracking-[0.5px]">TESLA DARK</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
              <span className="font-semibold text-zinc-800">APPLE LIGHT</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
