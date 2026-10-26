/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import React, { useState, useRef, useEffect } from "react";
import {
  Activity,
  BarChart3,
  Layers,
  Search,
  ChevronRight,
  Inbox,
  ChevronDown,
  Command,
  ShieldAlert,
} from "lucide-react";
import { useTwinStore } from "../../store/useTwinStore";
import { useTheme, NEXUS_THEMES } from "../../lib/theme";
import type { ThemeMetadata } from "../../lib/theme";

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

  const { theme, setTheme, themeMeta } = useTheme();
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        themeMenuRef.current &&
        !themeMenuRef.current.contains(event.target as Node)
      ) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  const themeList = Object.values(NEXUS_THEMES);

  return (
    <header className="relative h-14 shrink-0 px-5 flex items-center justify-between z-30 select-none bg-white/75 backdrop-blur-2xl border-b border-black/10 text-[#1d1d1f] font-sans tracking-[-0.011em]">
      {/* =====================================================================
          LEFT: CLEAN SPATIAL BREADCRUMB
          ===================================================================== */}
      <div className="flex items-center gap-1.5 min-w-0 text-xs">
        {/* Site Level */}
        <button
          type="button"
          onClick={resetSpatialSelection}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-zinc-700 hover:text-black hover:bg-black/[0.04] transition-colors cursor-pointer font-medium"
          title="Return to Site Overview"
        >
          <span className="w-2 h-2 rounded-full bg-[#0071E3]" />
          <span>{spatialBreadcrumb.siteName || "Bangkok DC-1"}</span>
        </button>

        {/* Dynamic Spatial Path */}
        {spatialBreadcrumb.buildingName && (
          <div className="flex items-center gap-1 shrink-0 text-zinc-400">
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            <button
              type="button"
              onClick={() => setSpatialLevel("building", null, spatialBreadcrumb.buildingName)}
              className="px-2 py-1 rounded-[8px] text-zinc-600 hover:text-black hover:bg-black/[0.04] transition-colors cursor-pointer"
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
              className="px-2 py-1 rounded-[8px] text-zinc-600 hover:text-black hover:bg-black/[0.04] transition-colors cursor-pointer"
            >
              {spatialBreadcrumb.roomName}
            </button>
          </div>
        )}

        {spatialBreadcrumb.rackName && (
          <div className="flex items-center gap-1 shrink-0">
            <ChevronRight className="w-3.5 h-3.5 opacity-60 text-zinc-400" />
            <span className="px-2.5 py-0.5 rounded-[8px] bg-[#0071E3]/10 border-[0.5px] border-[#0071E3]/30 text-[#0071E3] font-semibold text-xs">
              {spatialBreadcrumb.rackName}
            </span>
          </div>
        )}
      </div>

      {/* =====================================================================
          CENTER: APPLE SEGMENTED PERSONA PILLS
          ===================================================================== */}
      <div className="hidden md:flex items-center justify-center">
        <div className="flex items-center p-1 rounded-[10px] bg-black/[0.04] border-[0.5px] border-black/10">
          <button
            type="button"
            onClick={() => setPersona("NOC")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold tracking-[-0.011em] transition-all cursor-pointer ${
              persona === "NOC"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-zinc-500 hover:text-black"
            }`}
            title="NOC Mode: 24/7 Operations, Video Wall, Heatmaps & Alarms"
          >
            <Activity className={`w-3.5 h-3.5 ${persona === "NOC" ? "text-[#0071E3]" : ""}`} />
            <span>NOC Twin</span>
          </button>

          <button
            type="button"
            onClick={() => setPersona("Supervisor")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold tracking-[-0.011em] transition-all cursor-pointer ${
              persona === "Supervisor"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-zinc-500 hover:text-black"
            }`}
            title="Supervisor Mode: Floor Layout Builder, Space & Discovery"
          >
            <Layers className={`w-3.5 h-3.5 ${persona === "Supervisor" ? "text-emerald-600" : ""}`} />
            <span>Supervisor</span>
          </button>

          <button
            type="button"
            onClick={() => setPersona("Manager")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold tracking-[-0.011em] transition-all cursor-pointer ${
              persona === "Manager"
                ? "bg-white text-[#1d1d1f] shadow-sm"
                : "text-zinc-500 hover:text-black"
            }`}
            title="Executive Mode: Capacity, PUE Benchmarks & Cost"
          >
            <BarChart3 className={`w-3.5 h-3.5 ${persona === "Manager" ? "text-amber-600" : ""}`} />
            <span>Executive</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          RIGHT: MINIMALIST CONSOLIDATED ACTIONS & STATUS
          ===================================================================== */}
      <div className="flex items-center gap-3">
        {/* Consolidated Apple Live Status Pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-medium border-[0.5px] transition-all cursor-default ${
            problemCount > 0
              ? "bg-[#ff3b30]/10 border-[#ff3b30]/30 text-[#ff3b30]"
              : "bg-black/[0.03] border-black/10 text-zinc-700"
          }`}
          title={`Zabbix Engine: ${zabbixStatus?.status || "CONNECTED"} • Total IT Load: ${itLoadKw.toFixed(1)} kW • WebSocket: ${wsConnected ? "Connected" : "Disconnected"}`}
        >
          {problemCount > 0 ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-[#ff3b30] animate-pulse" />
              <span className="font-semibold">{problemCount} Alarms</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
              <div className="flex items-center gap-1.5">
                <span className="text-[#1d1d1f] font-semibold">{itLoadKw.toFixed(1)} kW</span>
                <span className="text-zinc-300">•</span>
                <span className="text-zinc-500 text-[11px]">Nominal</span>
              </div>
            </>
          )}
        </div>

        {/* Global Spotlight Search Trigger */}
        <button
          type="button"
          onClick={openSpotlight}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-black/[0.03] hover:bg-black/[0.06] border-[0.5px] border-black/10 text-xs text-zinc-700 hover:text-black transition-all cursor-pointer shadow-sm"
          title="Open Spotlight Search (⌘K / Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-zinc-500" />
          <span className="hidden sm:inline text-zinc-600 text-xs">Search</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 bg-black/[0.05] rounded-[6px]">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </kbd>
        </button>

        {/* Unassigned Inbox Button */}
        {onOpenUnassigned && (
          <button
            type="button"
            onClick={onOpenUnassigned}
            className="relative p-2 rounded-[10px] bg-black/[0.03] hover:bg-black/[0.06] border-[0.5px] border-black/10 text-zinc-700 hover:text-black transition-all cursor-pointer"
            title="Discovery Inbox"
          >
            <Inbox className="w-4 h-4 text-zinc-600" />
            {unassignedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0071E3] text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                {unassignedCount}
              </span>
            )}
          </button>
        )}

        {/* Theme Selector Pill */}
        <div className="relative" ref={themeMenuRef}>
          <button
            type="button"
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-black/[0.03] hover:bg-black/[0.06] border-[0.5px] border-black/10 text-xs text-zinc-700 hover:text-black transition-all cursor-pointer"
            title={`Active Theme: ${themeMeta.name}`}
          >
            <div
              className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-sm"
              style={{ backgroundColor: themeMeta.accentHex }}
            />
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-[16px] bg-white/95 backdrop-blur-2xl border-[0.5px] border-black/10 p-2 shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Display Theme
              </div>
              <div className="space-y-1 mt-1">
                {themeList.map((t: ThemeMetadata) => {
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTheme(t.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-left transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[#0071E3] text-white"
                          : "text-zinc-700 hover:bg-black/[0.04] hover:text-black"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: t.accentHex }}
                        />
                        <span className="font-medium text-xs truncate">
                          {t.name}
                        </span>
                      </div>
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
