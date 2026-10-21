import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Command,
  Activity,
  Layers,
  BarChart3,
  Maximize2,
  Palette,
  ShieldAlert,
  Flame,
  Zap,
  Inbox,
  Server,
  Globe,
  FileText,
  CornerDownLeft,
  ArrowUpDown,
} from "lucide-react";
import { useTwinStore } from "../../store/useTwinStore";
import { useTheme, NEXUS_THEMES } from "../../lib/theme";
import type { NexusTheme, ThemeMetadata } from "../../lib/theme";
import type { RackSummary } from "../../types";

interface CommandItem {
  id: string;
  category: "Navigation" | "Theme" | "Cabinet" | "Heatmap" | "Tools";
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  badge?: string;
  action: () => void;
}

interface SpotlightCommandBarProps {
  racks?: RackSummary[];
  onNavigateToRackElevation?: (rack: RackSummary) => void;
  onOpenUnassigned?: () => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenBlastRadius?: () => void;
}

export const SpotlightCommandBar: React.FC<SpotlightCommandBarProps> = ({
  racks = [],
  onNavigateToRackElevation,
  onOpenUnassigned,
  onNavigateToTab,
  onOpenBlastRadius,
}) => {
  const {
    isSpotlightOpen,
    closeSpotlight,
    setPersona,
    setViewportMode,
    setActiveOverlay,
    setSpatialLevel,
  } = useTwinStore();

  const { setTheme } = useTheme();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isSpotlightOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isSpotlightOpen]);

  // Global ESC & Arrow Key Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSpotlightOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeSpotlight();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSpotlightOpen, closeSpotlight]);

  // Static Navigation Commands
  const commands: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      // 1. Personas
      {
        id: "persona-noc",
        category: "Navigation",
        title: "Switch to NOC Twin",
        subtitle: "24/7 Tactical Operations, Real-Time Video Wall, Heatmaps & Alarms",
        icon: Activity,
        badge: "Persona",
        action: () => {
          setPersona("NOC");
          closeSpotlight();
        },
      },
      {
        id: "persona-supervisor",
        category: "Navigation",
        title: "Switch to Supervisor Mode",
        subtitle: "Contiguous Space Finder, Floor Layout Builder & Discovery Ingestion",
        icon: Layers,
        badge: "Persona",
        action: () => {
          setPersona("Supervisor");
          closeSpotlight();
        },
      },
      {
        id: "persona-manager",
        category: "Navigation",
        title: "Switch to Executive Mode",
        subtitle: "Executive Twin, PUE Benchmarks, Stranded Capacity & Cost Allocation",
        icon: BarChart3,
        badge: "Persona",
        action: () => {
          setPersona("Manager");
          closeSpotlight();
        },
      },
      // 2. Viewports
      {
        id: "view-3d",
        category: "Navigation",
        title: "3D Spatial Twin View",
        subtitle: "WebGL Three.js spatial datacenter with orbital camera",
        icon: Maximize2,
        badge: "3D Canvas",
        action: () => {
          setPersona("NOC");
          setViewportMode("3D");
          closeSpotlight();
        },
      },
      {
        id: "view-2d",
        category: "Navigation",
        title: "2.5D Isometric Floor Plan",
        subtitle: "Interactive spatial tile grid of Room Hall A & B",
        icon: Layers,
        badge: "2D Canvas",
        action: () => {
          setPersona("NOC");
          setViewportMode("2D");
          closeSpotlight();
        },
      },
      // 3. Heatmap Overlays
      {
        id: "overlay-status",
        category: "Heatmap",
        title: "Overlay: Status & Active Alarms",
        subtitle: "Color-code cabinets by Zabbix alarm severity and health",
        icon: ShieldAlert,
        badge: "Overlay",
        action: () => {
          setPersona("NOC");
          setActiveOverlay("STATUS");
          closeSpotlight();
        },
      },
      {
        id: "overlay-thermal",
        category: "Heatmap",
        title: "Overlay: ASHRAE Thermal Map",
        subtitle: "Cold/Hot aisle airflow compliance, inlet temperature gradients",
        icon: Flame,
        badge: "Thermal",
        action: () => {
          setPersona("NOC");
          setActiveOverlay("THERMAL");
          closeSpotlight();
        },
      },
      {
        id: "overlay-power",
        category: "Heatmap",
        title: "Overlay: Power Load & Watts",
        subtitle: "PDU A/B watts, power headroom, and failover risk",
        icon: Zap,
        badge: "Power",
        action: () => {
          setPersona("NOC");
          setActiveOverlay("POWER");
          closeSpotlight();
        },
      },
      {
        id: "overlay-space",
        category: "Heatmap",
        title: "Overlay: Space (RU) Utilization",
        subtitle: "Rack unit density and free contiguous slot availability",
        icon: Layers,
        badge: "Space",
        action: () => {
          setPersona("NOC");
          setActiveOverlay("SPACE");
          closeSpotlight();
        },
      },
      // 4. Tools & Sidebars
      {
        id: "tool-inbox",
        category: "Tools",
        title: "Zabbix Auto-Discovery Inbox",
        subtitle: "Review newly discovered unassigned hosts waiting to be mounted",
        icon: Inbox,
        badge: "Discovery",
        action: () => {
          closeSpotlight();
          if (onOpenUnassigned) onOpenUnassigned();
        },
      },
      {
        id: "tool-ipam",
        category: "Tools",
        title: "IPAM Subnets & IP Grid",
        subtitle: "IPv4 subnet allocations, gateway tracking, and IP availability",
        icon: Globe,
        badge: "IPAM",
        action: () => {
          closeSpotlight();
          if (onNavigateToTab) onNavigateToTab("ipam");
        },
      },
      {
        id: "tool-reports",
        category: "Tools",
        title: "Datacenter Analytics Reports",
        subtitle: "PUE trends, SLA uptime, and executive report exports",
        icon: FileText,
        badge: "Reports",
        action: () => {
          closeSpotlight();
          if (onNavigateToTab) onNavigateToTab("reports");
        },
      },
      {
        id: "tool-blast-radius",
        category: "Tools",
        title: "Incident Blast-Radius Simulator",
        subtitle: "Interactive 3-tier cascade failure graph & post-mortem exporter",
        icon: ShieldAlert,
        badge: "Simulator",
        action: () => {
          closeSpotlight();
          if (onOpenBlastRadius) onOpenBlastRadius();
        },
      },
    ];

    // 5. Theme Switching Commands
    Object.values(NEXUS_THEMES).forEach((t: ThemeMetadata) => {
      list.push({
        id: `theme-${t.id}`,
        category: "Theme",
        title: `Theme: ${t.name}`,
        subtitle: t.inspiration,
        icon: Palette,
        badge: "Theme",
        action: () => {
          setTheme(t.id as NexusTheme);
          closeSpotlight();
        },
      });
    });

    // 6. Dynamic Rack Commands
    racks.forEach((rack) => {
      list.push({
        id: `rack-${rack.id}`,
        category: "Cabinet",
        title: `Cabinet ${rack.name}`,
        subtitle: `Row ${rack.row} • ${rack.used_u}/${rack.total_u} U (${rack.power_kw.toFixed(1)} kW)`,
        icon: Server,
        badge: rack.status.toUpperCase(),
        action: () => {
          setSpatialLevel("rack", String(rack.id), rack.name);
          closeSpotlight();
          if (onNavigateToRackElevation) {
            onNavigateToRackElevation(rack);
          }
        },
      });
    });

    return list;
  }, [
    racks,
    setPersona,
    setViewportMode,
    setActiveOverlay,
    setTheme,
    setSpatialLevel,
    closeSpotlight,
    onOpenUnassigned,
    onNavigateToRackElevation,
    onNavigateToTab,
  ]);

  // Fuzzy filter results
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return commands.slice(0, 15);
    }
    const q = query.toLowerCase();
    return commands
      .filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.subtitle?.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [commands, query]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard Navigation inside input
  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  if (!isSpotlightOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Spotlight Command Bar"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 backdrop-blur-md bg-black/60 select-none animate-in fade-in duration-150"
      onClick={closeSpotlight}
    >
      <div
        className="w-full max-w-2xl rounded-2xl glass-panel-elevated border border-[var(--border-strong)] shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60">
          <Search className="w-5 h-5 text-[var(--accent-primary)] shrink-0 mr-3 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDownInput}
            placeholder="Type a command or search cabinets, servers, themes..."
            className="w-full bg-transparent text-sm text-[var(--text-bright)] placeholder:text-[var(--text-muted)] focus:outline-none font-mono"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-base)] border border-[var(--border-subtle)] shrink-0 ml-2 shadow-inner">
            <span>ESC</span>
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[55vh] no-scrollbar"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-[var(--text-muted)]">
              No matching twin commands or cabinets for &quot;{query}&quot;.
            </div>
          ) : (
            filteredCommands.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--text-bright)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-bright)] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-[var(--accent-primary)] text-white shadow-sm"
                          : "bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs font-mono truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[var(--bg-base)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <span className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-[var(--accent-primary)] shrink-0 ml-2">
                      <span>Select</span>
                      <CornerDownLeft className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="w-3 h-3" /> Select
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>NexusTwin Spotlight</span>
          </div>
        </div>
      </div>
    </div>
  );
};
