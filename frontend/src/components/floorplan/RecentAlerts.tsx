import { ChevronRight, AlertOctagon, AlertTriangle } from 'lucide-react'
import type { RecentAlert } from '../../types'

interface RecentAlertsProps {
  alerts: RecentAlert[]
  onViewAll?: () => void
  onSelectAlert?: (alert: RecentAlert) => void
}

export function RecentAlerts({ alerts, onViewAll, onSelectAlert }: RecentAlertsProps) {
  return (
    <div className="p-6 rounded-2xl bg-[#0f0f0f] border border-[#222222] shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-sm tracking-wide">Recent Alerts</h3>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            View All ({alerts.length})
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-500">
            No active alerts at this time
          </div>
        ) : (
          alerts.slice(0, 4).map((alert) => {
            const isCritical = alert.priority >= 3
            return (
              <div
                key={alert.triggerid}
                onClick={() => onSelectAlert && onSelectAlert(alert)}
                className="p-3 rounded-xl bg-[#141414] border border-[#242424] flex items-center justify-between hover:border-[#3b3b3b] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                        : 'bg-amber-950/50 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {isCritical ? (
                      <AlertOctagon className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-zinc-200 transition-colors line-clamp-1">
                      {alert.host_name}: {alert.description}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Trigger #{alert.triggerid}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
