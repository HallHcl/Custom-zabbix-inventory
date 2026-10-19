import { ChevronRight, AlertOctagon, AlertTriangle } from 'lucide-react'
import type { RecentAlert } from '../../types'

interface RecentAlertsProps {
  alerts: RecentAlert[]
  onViewAll?: () => void
  onSelectAlert?: (alert: RecentAlert) => void
}

export function RecentAlerts({ alerts, onViewAll, onSelectAlert }: RecentAlertsProps) {
  return (
    <div className="noc-panel select-none">
      <div className="noc-panel-header">
        <span className="font-mono uppercase tracking-wider text-[11px] text-[#caedde]">
          Recent Zabbix Alerts
        </span>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[10px] font-mono text-[#8bd7d1] hover:underline cursor-pointer"
          >
            All Alerts ({alerts.length}) →
          </button>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#85a6b1] font-mono">
            No active triggers at this time
          </div>
        ) : (
          alerts.slice(0, 4).map((alert) => {
            const isCritical = alert.priority >= 3
            return (
              <div
                key={alert.triggerid}
                onClick={() => onSelectAlert && onSelectAlert(alert)}
                className="p-2 rounded-[2px] bg-[#273139] border border-[#394650] flex items-center justify-between hover:border-[#50626f] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-[2px] flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-700'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-700'
                    }`}
                  >
                    {isCritical ? (
                      <AlertOctagon className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-[#caedde] group-hover:text-white transition-colors line-clamp-1">
                      {alert.host_name}: {alert.description}
                    </div>
                    <div className="text-[9px] text-[#85a6b1] font-mono">
                      Trigger #{alert.triggerid}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#85a6b1] group-hover:text-[#8bd7d1] transition-colors shrink-0 ml-1.5" />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
