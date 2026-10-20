import { Search, Home, ChevronRight, Sun, Moon, Radio, Inbox } from 'lucide-react'

interface HeaderProps {
  breadcrumbs: { label: string; onClick?: () => void }[]
  searchQuery: string
  onSearchChange: (query: string) => void
  isLive?: boolean
  theme?: 'dark' | 'light'
  onToggleTheme?: () => void
  onOpenUnassigned?: () => void
  unassignedCount?: number
}

export function Header({
  breadcrumbs,
  searchQuery,
  onSearchChange,
  isLive = true,
  theme = 'dark',
  onToggleTheme,
  onOpenUnassigned,
  unassignedCount,
}: HeaderProps) {
  return (
    <header className="h-13 shrink-0 border-b border-[#394650] bg-[#20282f] px-4 flex items-center justify-between z-10 select-none">
      {/* Breadcrumbs Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-[#85a6b1]">
        <Home className="w-3.5 h-3.5 text-[#85a6b1]" />
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.label} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronRight className="w-3 h-3 text-[#85a6b1]" />}
            {crumb.onClick ? (
              <button
                type="button"
                onClick={crumb.onClick}
                className="hover:text-white transition-colors text-[#85a6b1] font-medium cursor-pointer"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-[#caedde] font-semibold">{crumb.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Center & Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Search */}
        <div className="relative w-64 sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#85a6b1] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search racks, hosts, IPs..."
            className="w-full bg-[#273139] text-xs text-[#caedde] placeholder:text-[#85a6b1] pl-8 pr-3 py-1.5 rounded-[3px] border border-[#394650] focus:outline-none focus:border-[#8bd7d1] transition-colors font-mono"
          />
        </div>

        {/* Live Telemetry Heartbeat */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#273139] border border-[#394650] text-[11px] font-mono">
          <Radio className={`w-3.5 h-3.5 ${isLive ? 'text-[#8bd7d1] animate-pulse' : 'text-[#85a6b1]'}`} />
          <span className="text-[#caedde]">
            {isLive ? 'TELEMETRY LIVE' : 'TELEMETRY PAUSED'}
          </span>
        </div>

        {/* Zabbix Unassigned Hosts Ingestion Drawer Trigger */}
        {onOpenUnassigned && (
          <button
            type="button"
            onClick={onOpenUnassigned}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] hover:border-[#8bd7d1] text-xs text-[#caedde] hover:text-white transition-colors cursor-pointer"
            title="Open Zabbix Unassigned Hosts Ingestion Queue"
          >
            <Inbox className="w-3.5 h-3.5 text-[#8bd7d1]" />
            <span className="text-[11px] font-mono hidden sm:inline">Unassigned</span>
            {typeof unassignedCount === 'number' && unassignedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-[2px] bg-cyan-950 border border-cyan-700 text-[10px] font-mono text-cyan-300 font-bold">
                {unassignedCount}
              </span>
            )}
          </button>
        )}

        {/* High-Contrast / Tactical Theme Switcher */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-xs text-[#caedde] hover:text-white transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Precision Light Blueprint' : 'Switch to Tactical Dark NOC'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-mono hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#8bd7d1]" />
                <span className="text-[11px] font-mono hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  )
}
