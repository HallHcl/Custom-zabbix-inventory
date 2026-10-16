import {
  Layers,
  Map,
  Server,
  Monitor,
  Bell,
  FileText,
  Boxes,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'

export type NavTab = 'overview' | 'floor_plan' | 'racks' | 'devices' | 'alerts' | 'reports'

interface NavItem {
  id: NavTab
  label: string
  icon: LucideIcon
  badge?: number
}

interface SidebarProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  alertCount?: number
}

export function Sidebar({ activeTab, onSelectTab, alertCount = 0 }: SidebarProps) {
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'floor_plan', label: 'Floor Plan', icon: Map },
    { id: 'racks', label: 'Racks', icon: Server },
    { id: 'devices', label: 'Devices', icon: Monitor },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: alertCount },
    { id: 'reports', label: 'Reports', icon: FileText },
  ]

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0b1322] flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800/80">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-cyan-400 rounded-xl text-white shadow-lg shadow-cyan-500/25 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold tracking-wider text-white text-lg flex items-center gap-1.5">
              <span>DC VISION</span>
            </h1>
            <p className="text-xs text-slate-400">Data Center Management</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/60 text-xs text-slate-500 text-center">
        <span>DC Vision v0.1 • Zabbix 7.0 Linked</span>
      </div>
    </aside>
  )
}
