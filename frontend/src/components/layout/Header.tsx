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
    <header className="h-16 border-b border-slate-800 bg-[#0e1726]/80 backdrop-blur px-6 flex items-center justify-between z-10">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Home className="w-4 h-4 text-slate-500" />
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.label} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
            {crumb.onClick ? (
              <button
                type="button"
                onClick={crumb.onClick}
                className="hover:text-cyan-400 transition-colors text-slate-300 font-medium"
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
      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="relative w-72 sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search racks, devices, or alerts..."
            className="w-full bg-slate-900/90 text-sm text-slate-200 placeholder:text-slate-500 pl-10 pr-4 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="text-slate-300 font-medium">{isLive ? 'Live' : 'Paused'}</span>
        </div>

        {/* User Profile */}
        <button
          type="button"
          className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-600 transition-all"
        >
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
