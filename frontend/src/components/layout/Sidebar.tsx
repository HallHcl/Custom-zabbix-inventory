import {
  Layers,
  Map,
  Server,
  Monitor,
  Bell,
  FileText,
  Activity,
  Network,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavTab = 'overview' | 'floor_plan' | 'racks' | 'devices' | 'ipam' | 'alerts' | 'reports'

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
    { id: 'overview', label: 'Operations Overview', icon: Layers },
    { id: 'floor_plan', label: 'DC Floor Plan', icon: Map },
    { id: 'racks', label: 'Rack Cabinets', icon: Server },
    { id: 'devices', label: 'Device Inventory', icon: Monitor },
    { id: 'ipam', label: 'IPAM Subnets', icon: Network },
    { id: 'alerts', label: 'Active Alerts', icon: Bell, badge: alertCount },
    { id: 'reports', label: 'Telemetry Reports', icon: FileText },
  ]

  return (
    <aside className="w-60 shrink-0 border-r border-[#394650] bg-[#1a2127] flex flex-col justify-between select-none">
      <div>
        {/* Brand Console Header */}
        <div className="px-4 py-4 border-b border-[#394650] bg-[#20282f]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[3px] bg-[#34424b] border border-[#50626f] flex items-center justify-center text-[#8bd7d1]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-wider text-white text-sm font-sans">
                  DC VISION
                </span>
                <span className="px-1 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[9px] font-mono text-[#8bd7d1]">
                  NOC
                </span>
              </div>
              <p className="text-[10px] text-[#85a6b1] font-mono tracking-tight">
                Zabbix 7.0 • DCIM
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-2 py-3">
          <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-[#85a6b1]">
            Control Views
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-[3px] text-xs font-medium transition-colors cursor-pointer relative ${
                    isActive
                      ? 'bg-[#34424b] text-[#caedde] border border-[#50626f]'
                      : 'text-[#85a6b1] hover:text-[#caedde] hover:bg-[#252f36] border border-transparent'
                  }`}
                >
                  {/* Left Accent Pip */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-[#8bd7d1] rounded-r-xs" />
                  )}

                  <div className="flex items-center gap-2.5 ml-1">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#8bd7d1]' : 'text-[#85a6b1]'}`} />
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-[2px] bg-rose-950/80 text-rose-300 border border-rose-700/80">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Telemetry Footer Status */}
      <div className="p-3 border-t border-[#394650] bg-[#20282f]">
        <div className="flex items-center justify-between text-[11px] text-[#85a6b1] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8bd7d1] animate-pulse" />
            <span>Zabbix JSON-RPC</span>
          </div>
          <span className="text-[10px] text-[#85a6b1]">30s SYNC</span>
        </div>
      </div>
    </aside>
  )
}
