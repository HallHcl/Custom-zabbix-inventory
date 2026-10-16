import { Search, User, Home, ChevronRight } from 'lucide-react'

interface HeaderProps {
  breadcrumbs: { label: string; onClick?: () => void }[]
  searchQuery: string
  onSearchChange: (query: string) => void
  isLive?: boolean
}

export function Header({
  breadcrumbs,
  searchQuery,
  onSearchChange,
  isLive = true,
}: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#1f1f1f] bg-[#090909]/95 backdrop-blur px-6 flex items-center justify-between z-10 select-none">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-zinc-400">
        <Home className="w-3.5 h-3.5 text-zinc-500" />
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.label} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight className="w-3 h-3 text-zinc-600" />}
            {crumb.onClick ? (
              <button
                type="button"
                onClick={crumb.onClick}
                className="hover:text-white transition-colors text-zinc-400 font-medium cursor-pointer"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-white font-semibold">{crumb.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Center Search & Right Controls */}
      <div className="flex items-center gap-5">
        {/* Search Bar */}
        <div className="relative w-72 sm:w-80">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search racks, devices, or alerts..."
            className="w-full bg-[#121212] text-xs text-white placeholder:text-zinc-500 pl-9 pr-4 py-2 rounded-xl border border-[#262626] focus:outline-none focus:border-zinc-500 transition-all font-sans"
          />
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141414] border border-[#262626] text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-zinc-600'
            }`}
          />
          <span className="text-zinc-300 font-medium text-[11px] font-mono">
            {isLive ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* User Profile */}
        <button
          type="button"
          className="w-8 h-8 rounded-full bg-[#181818] border border-[#2c2c2c] flex items-center justify-center text-zinc-300 hover:text-white hover:border-zinc-500 transition-all cursor-pointer"
        >
          <User className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
