/* Apple UI & Tesla UI Dual-System Design – Verified: 8pt Grid, Telemetry Typography, Pure OLED Black / Cupertino Frost */
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
import { useTheme } from '../../lib/theme'

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
  const { isTeslaDark } = useTheme()

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Operations Overview', icon: Layers },
    { id: 'floor_plan', label: 'DC Floor Plan', icon: Map },
    { id: 'racks', label: 'Rack Cabinets', icon: Server },
    { id: 'devices', label: 'Hardware Inventory', icon: Monitor },
    { id: 'alerts', label: 'Active Alarms', icon: Bell, badge: alertCount },
    { id: 'reports', label: 'Telemetry Reports', icon: FileText },
  ]

  return (
    <aside
      className={`w-64 shrink-0 flex flex-col justify-between select-none transition-colors duration-200 ${
        isTeslaDark
          ? 'bg-[#000000] border-r border-[#1F1F1F] text-[#F5F5F7] font-sans'
          : 'bg-white/75 backdrop-blur-2xl saturate-180 border-r-[0.5px] border-black/10 text-[#1d1d1f] font-[-apple-system,BlinkMacSystemFont,\'SF_Pro_Display\',\'SF_Pro_Text\',sans-serif]'
      }`}
    >
      <div>
        {/* Brand Header */}
        <div
          className={`h-[64px] px-5 flex items-center justify-between border-b ${
            isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
          }`}
        >
          <div className="flex items-center gap-3">
            {/* macOS Traffic Lights */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
            </div>

            <div className={`h-4 w-px ${isTeslaDark ? 'bg-[#1F1F1F]' : 'bg-black/10'}`} />

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-[6px] text-white flex items-center justify-center ${
                  isTeslaDark
                    ? 'bg-[#111111] border border-[#3E6AE1]/60 text-[#3E6AE1]'
                    : 'bg-[#0071E3] shadow-sm'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-[13px] font-semibold tracking-[-0.022em] leading-none ${
                    isTeslaDark ? 'text-[#F5F5F7]' : 'text-[#1d1d1f]'
                  }`}
                >
                  NexusTwin
                </span>
                <span
                  className={`text-[10px] tracking-[-0.011em] mt-0.5 font-mono ${
                    isTeslaDark ? 'text-[#636366]' : 'text-zinc-500'
                  }`}
                >
                  DCIM • Zabbix 7.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-1">
          <p
            className={`text-[10px] font-bold uppercase tracking-[1.5px] px-3 py-1.5 ${
              isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-400'
            }`}
          >
            Workspaces
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              let buttonClasses = ''
              if (isTeslaDark) {
                buttonClasses = isActive
                  ? 'bg-[#3E6AE1] text-white rounded-[6px]'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F7] hover:bg-[#111111] rounded-[6px]'
              } else {
                buttonClasses = isActive
                  ? 'bg-[#0071E3] text-white shadow-sm shadow-[#0071E3]/25 scale-[1.01] rounded-[12px]'
                  : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.04] active:scale-[0.98] rounded-[12px]'
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full h-[44px] flex items-center justify-between px-3.5 text-[13px] font-medium tracking-[-0.011em] transition-all duration-150 cursor-pointer ${buttonClasses}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive
                          ? 'text-white'
                          : isTeslaDark
                          ? 'text-[#636366]'
                          : 'text-zinc-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span
                      className={`rounded-[4px] px-2 py-0.5 text-[11px] font-semibold text-white font-mono ${
                        isTeslaDark ? 'bg-[#E82127]' : 'bg-[#FF3B30] shadow-sm'
                      }`}
                    >
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
        <div
          className={`p-3.5 rounded-[10px] flex items-center justify-between text-[11px] border ${
            isTeslaDark
              ? 'bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]'
              : 'bg-black/[0.03] border-black/10 text-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isTeslaDark
                  ? 'bg-[#00C853]'
                  : 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
              }`}
            />
            <span className={isTeslaDark ? 'text-[#F5F5F7] font-mono' : 'text-zinc-700 font-medium'}>
              Zabbix Engine
            </span>
          </div>
          <span
            className={`px-1.5 py-0.5 rounded-[4px] font-mono text-[10px] ${
              isTeslaDark
                ? 'bg-[#1C1C1E] text-[#00C853] border border-[#1F1F1F]'
                : 'bg-black/[0.05] text-zinc-600'
            }`}
          >
            Live RPC
          </span>
        </div>
      </div>
    </aside>
  )
}
