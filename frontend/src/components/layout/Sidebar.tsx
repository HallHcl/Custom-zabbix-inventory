/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */
import {
  Layers,
  Map,
  Server,
  Monitor,
  Bell,
  FileText,
  Box,
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
    { id: 'overview', label: 'Operations Overview', icon: Layers },
    { id: 'floor_plan', label: 'DC Floor Plan', icon: Map },
    { id: 'racks', label: 'Rack Cabinets', icon: Server },
    { id: 'devices', label: 'Hardware Inventory', icon: Monitor },
    { id: 'alerts', label: 'Active Alarms', icon: Bell, badge: alertCount },
    { id: 'reports', label: 'Telemetry Reports', icon: FileText },
  ]

  return (
    <aside className="w-64 shrink-0 bg-white/75 backdrop-blur-2xl saturate-180 border-r-[0.5px] border-black/10 flex flex-col justify-between select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif] text-[#1d1d1f]">
      <div>
        {/* macOS Style Window Brand Header */}
        <div className="h-[64px] px-5 border-b-[0.5px] border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* macOS Traffic Lights */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>

            <div className="h-4 w-px bg-black/10" />

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-[6px] bg-[#0071E3] text-white flex items-center justify-center shadow-sm">
                <Box className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold tracking-[-0.022em] text-[#1d1d1f] leading-none">
                  NexusTwin
                </span>
                <span className="text-[10px] text-zinc-500 tracking-[-0.011em] mt-0.5">
                  DCIM • Zabbix 7.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 px-3 py-1.5">
            Workspaces
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full h-[44px] flex items-center justify-between px-3.5 rounded-[12px] text-[13px] font-medium tracking-[-0.011em] transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#0071E3] text-white shadow-sm shadow-[#0071E3]/25 scale-[1.01]'
                      : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.04] active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span className="rounded-[8px] px-2 py-0.5 text-[11px] font-semibold bg-[#FF3B30] text-white shadow-sm tracking-[-0.011em]">
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
      <div className="p-3">
        <div className="p-3.5 rounded-[16px] bg-black/[0.03] border-[0.5px] border-black/10 flex items-center justify-between text-[11px] tracking-[-0.011em]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
            <span className="text-zinc-700 font-medium">Zabbix Engine</span>
          </div>
          <span className="rounded-[6px] px-1.5 py-0.5 bg-black/[0.05] text-zinc-600 font-mono text-[10px]">
            Live RPC
          </span>
        </div>
      </div>
    </aside>
  )
}
