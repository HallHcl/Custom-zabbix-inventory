import React, { useState, useRef, useEffect } from "react";
import {
  Activity,
  BarChart3,
  Layers,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Search,
  ChevronRight,
  Home,
  Box,
  Inbox,
  ChevronDown,
  Command,
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
    wsConnecting,
    connectWebSocket,
    openSpotlight,
  } = useTwinStore();

  const { theme, setTheme, themeMeta } = useTheme();

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
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

  // Derived Telemetry Values with Graceful Fallbacks
  const itLoadKw = facilityTelemetry?.total_it_load_kw ?? 142.5;
  const problemCount = activeAlarms.filter((a) => a.event_status === "PROBLEM").length;

  const themeList = Object.values(NEXUS_THEMES);

  return (
    <header className="relative h-14 shrink-0 px-4 flex items-center justify-between z-30 select-none glass-panel border-b border-[var(--border-subtle)] text-[var(--text-primary)] transition-all duration-200">
      {/* =====================================================================
          LEFT: BRAND & SPATIAL BREADCRUMB NAVIGATOR
          ===================================================================== */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Nexus Twin Core Logo */}
        <div
          onClick={resetSpatialSelection}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
          title="NexusTwin DCIM Digital Twin - Reset to Bangkok DC-1"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-base)] flex items-center justify-center relative overflow-hidden group-hover:border-[var(--accent-primary)] transition-all shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent-primary)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <Box className="w-4 h-4 text-[var(--accent-primary)] relative z-10 transition-transform group-hover:scale-110" />
          </div>
          <div className="hidden sm:flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-xs tracking-wider text-[var(--text-bright)] uppercase">
                Nexus<span className="text-[var(--accent-primary)]">Twin</span>
              </span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                v2.4
              </span>
            </div>
            <span className="text-[9px] text-[var(--text-muted)] tracking-tight font-mono mt-0.5">
              Digital Twin Engine
            </span>
          </div>
        </div>

        {/* Vertical Hairline Divider */}
        <div className="hidden md:block h-6 w-[1px] bg-[var(--border-subtle)] shrink-0" />

        {/* Spatial Breadcrumb Navigator */}
        <nav
          aria-label="Spatial Breadcrumbs"
          className="flex items-center gap-1 text-xs overflow-x-auto no-scrollbar py-1"
        >
          {/* Site Level */}
          <button
            type="button"
            onClick={resetSpatialSelection}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer shrink-0 font-medium"
            title="Return to Site Overview"
          >
            <Home className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>{spatialBreadcrumb.siteName}</span>
          </button>

          {/* Building Level */}
          {spatialBreadcrumb.buildingName && (
            <div className="flex items-center gap-1 shrink-0">
              <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
              <button
                type="button"
                onClick={() => setSpatialLevel("building", null, spatialBreadcrumb.buildingName)}
                className="px-1.5 py-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                {spatialBreadcrumb.buildingName}
              </button>
            </div>
          )}

          {/* Room / Data Hall Level */}
          {spatialBreadcrumb.roomName && (
            <div className="flex items-center gap-1 shrink-0">
              <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
              <button
                type="button"
                onClick={() => setSpatialLevel("room", null, spatialBreadcrumb.roomName)}
                className="px-1.5 py-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                {spatialBreadcrumb.roomName}
              </button>
            </div>
          )}

          {/* Row Level */}
          {spatialBreadcrumb.rowName && (
            <div className="flex items-center gap-1 shrink-0">
              <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
              <button
                type="button"
                onClick={() => setSpatialLevel("row", null, spatialBreadcrumb.rowName)}
                className="px-1.5 py-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                {spatialBreadcrumb.rowName}
              </button>
            </div>
          )}

          {/* Rack Level */}
          {spatialBreadcrumb.rackName && (
            <div className="flex items-center gap-1 shrink-0">
              <ChevronRight className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="px-2 py-0.5 rounded bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] font-mono font-semibold text-[11px]">
                {spatialBreadcrumb.rackName}
              </span>
            </div>
          )}
        </nav>
      </div>

      {/* =====================================================================
          CENTER: THREE PERSONA MODE SWITCHER (Apple / Tesla Capsule Pills)
          ===================================================================== */}
      <div className="hidden lg:flex items-center justify-center">
        <div className="flex items-center p-1 rounded-xl bg-[var(--bg-base)]/80 border border-[var(--border-subtle)] shadow-inner">
          {/* NOC Persona Pill */}
          <button
            type="button"
            onClick={() => setPersona("NOC")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              persona === "NOC"
                ? "bg-[var(--bg-elevated)] text-[var(--text-bright)] shadow-sm border border-[var(--border-base)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
            }`}
            title="NOC Mode: 24/7 Tactical Operations, Real-Time Video Wall, Heatmaps & Alarms"
          >
            <Activity
              className={`w-3.5 h-3.5 ${
                persona === "NOC" ? "text-[var(--accent-primary)] animate-pulse" : ""
              }`}
            />
            <span>NOC Twin</span>
          </button>

          {/* Supervisor Persona Pill */}
          <button
            type="button"
            onClick={() => setPersona("Supervisor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              persona === "Supervisor"
                ? "bg-[var(--bg-elevated)] text-[var(--text-bright)] shadow-sm border border-[var(--border-base)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
            }`}
            title="Supervisor Mode: Capacity Finder, Floor Layout Builder, Unracked Discovery Inbox"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supervisor</span>
          </button>

          {/* Manager Persona Pill */}
          <button
            type="button"
            onClick={() => setPersona("Manager")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              persona === "Manager"
                ? "bg-[var(--bg-elevated)] text-[var(--text-bright)] shadow-sm border border-[var(--border-base)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
            }`}
            title="Manager Mode: Executive Health, Stranded Capacity, PUE Efficiency, Cost Allocation"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Executive</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          RIGHT: TELEMETRY HUD PILLS, VIEW TOGGLES, SPOTLIGHT & THEME
          ===================================================================== */}
      <div className="flex items-center gap-2.5">
        {/* 1. Live Facility Telemetry HUD Pills */}
        <div className="hidden xl:flex items-center gap-2">
          {/* IT Power Load Pill */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)]/80 border border-[var(--border-subtle)] text-xs font-mono"
            title="Total Real-Time IT Facility Load (Zabbix Aggregation)"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[var(--text-secondary)]">IT:</span>
            <span className="font-bold text-[var(--text-bright)]">
              {itLoadKw.toFixed(1)} kW
            </span>
          </div>

          {/* Active Alarms Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
              problemCount > 0
                ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}
            title={
              problemCount > 0
                ? `${problemCount} active problems detected in live twin`
                : "All systems healthy in Bangkok DC-1"
            }
          >
            {problemCount > 0 ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="font-bold">{problemCount} Alarms</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Normal</span>
              </>
            )}
          </div>
        </div>

        {/* 2. Live WebSocket Heartbeat */}
        <button
          type="button"
          onClick={() => {
            if (!wsConnected && !wsConnecting) connectWebSocket();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono cursor-pointer transition-all ${
            wsConnected
              ? "bg-[var(--bg-elevated)]/60 border-[var(--border-subtle)] text-[var(--text-secondary)]"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
          }`}
          title={
            wsConnected
              ? "Live WebSocket: Connected to FastAPI & Zabbix 7.0 (Redis Pub/Sub)"
              : "WebSocket Disconnected. Click to reconnect."
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                : wsConnecting
                ? "bg-amber-400 animate-pulse"
                : "bg-rose-500"
            }`}
          />
          <span className="hidden sm:inline">
            {wsConnected ? "LIVE" : wsConnecting ? "SYNCING" : "RECONNECT"}
          </span>
        </button>

        {/* 3. Unassigned Hosts Ingestion Drawer Button */}
        {onOpenUnassigned && (
          <button
            type="button"
            onClick={onOpenUnassigned}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-bright)] transition-colors cursor-pointer relative"
            title="Open Zabbix Auto-Discovery Unassigned Hosts Inbox"
          >
            <Inbox className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span className="hidden xl:inline font-mono">Inbox</span>
            {unassignedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold font-mono">
                {unassignedCount}
              </span>
            )}
          </button>
        )}

        {/* 5. Spotlight Search Button (Cmd/Ctrl + K Trigger) */}
        <button
          type="button"
          onClick={openSpotlight}
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-bright)] transition-colors cursor-pointer"
          title="Open Global Spotlight Search & Command Palette (Ctrl+K or ⌘K)"
        >
          <Search className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="hidden md:inline text-[var(--text-muted)] font-mono">
            Search...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-base)]/80 border border-[var(--border-subtle)] rounded shadow-inner">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </kbd>
        </button>

        {/* 6. Multi-Theme Engine Selector Dropdown */}
        <div className="relative" ref={themeMenuRef}>
          <button
            type="button"
            onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-bright)] transition-colors cursor-pointer"
            title={`Active Theme: ${themeMeta.name}. Click to change theme.`}
          >
            <div
              className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
              style={{ backgroundColor: themeMeta.accentHex }}
            />
            <span className="hidden md:inline font-mono text-[11px]">
              {themeMeta.name.split(" ")[0]}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {isThemeMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl glass-panel-elevated p-1.5 shadow-2xl z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Select HMI Theme
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
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                        isActive
                          ? "bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--text-bright)]"
                          : "hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-bright)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: t.accentHex }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-xs truncate">
                            {t.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] truncate">
                            {t.inspiration}
                          </span>
                        </div>
                      </div>
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shrink-0" />
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
