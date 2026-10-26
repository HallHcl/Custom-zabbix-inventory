import { ChevronRight, AlertOctagon, AlertTriangle } from 'lucide-react'
import type { RecentAlert } from '../../types'

interface RecentAlertsProps {
  alerts: RecentAlert[]
  onViewAll?: () => void
  onSelectAlert?: (alert: RecentAlert) => void
}

export function RecentAlerts({ alerts, onViewAll, onSelectAlert }: RecentAlertsProps) {
  return (
    <div className="rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm select-none text-[#1d1d1f] overflow-hidden">
      <div className="px-4 py-3 bg-black/[0.02] border-b-[0.5px] border-black/10 flex items-center justify-between">
        <span className="uppercase tracking-wider text-[11px] font-semibold text-zinc-600">
          Recent Zabbix Alerts
        </span>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[11px] font-medium text-[#0071E3] hover:underline cursor-pointer"
          >
            All Alerts ({alerts.length}) →
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-500 font-medium">
            No active triggers at this time
          </div>
        ) : (
          alerts.slice(0, 4).map((alert) => {
            const isCritical = alert.priority >= 3
            return (
              <div
                key={alert.triggerid}
                onClick={() => onSelectAlert && onSelectAlert(alert)}
                className="p-3 rounded-[12px] bg-black/[0.03] border-[0.5px] border-black/10 flex items-center justify-between hover:bg-black/[0.06] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-[#ff3b30]/15 text-[#ff3b30] border border-[#ff3b30]/30'
                        : 'bg-[#ff9500]/15 text-[#ff9500] border border-[#ff9500]/30'
                    }`}
                  >
                    {isCritical ? (
                      <AlertOctagon className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#1d1d1f] group-hover:text-[#0071E3] transition-colors line-clamp-1">
                      {alert.host_name}: {alert.description}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      Trigger #{alert.triggerid}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#0071E3] transition-colors shrink-0 ml-2" />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
