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
    <aside className="w-64 border-r border-[#1f1f1f] bg-[#090909] flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-[#1a1a1a]">
          <div className="p-2.5 bg-[#171717] border border-[#2a2a2a] rounded-xl text-white shadow-lg flex items-center justify-center">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold tracking-widest text-white text-base flex items-center gap-1.5 uppercase">
              <span>POP</span>
            </h1>
            <p className="text-[11px] text-zinc-500 font-mono tracking-wider">TESLA INVENTORY</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 relative cursor-pointer ${
                  isActive
                    ? 'bg-[#1a1a1a] text-white border border-[#2e2e2e] shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141414]'
                }`}
              >
                {/* Tesla Red Left Pip for Active Tab */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#e82127] rounded-r-full" />
                )}

                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  <span className="tracking-wide">{item.label}</span>
                </div>

                {item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-950/60 text-rose-400 border border-rose-800">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#1a1a1a] text-[11px] text-zinc-500 text-center font-mono">
        <span>POP • Zabbix 7.0 Active</span>
      </div>
    </aside>
  )
}
