import { ChevronRight, AlertOctagon, AlertTriangle } from 'lucide-react'
import type { RecentAlert } from '../../types'

interface RecentAlertsProps {
  alerts: RecentAlert[]
}

export function RecentAlerts({ alerts }: RecentAlertsProps) {
  return (
    <div className="p-6 rounded-2xl bg-[#0f172a]/80 border border-slate-800/80 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white text-base">Recent Alerts</h3>
        <button
          type="button"
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">
            No active alerts at this time
          </div>
        ) : (
          alerts.slice(0, 4).map((alert) => {
            const isCritical = alert.priority >= 3
            return (
              <div
                key={alert.triggerid}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isCritical ? (
                      <AlertOctagon className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                      {alert.host_name}: {alert.description}
                    </div>
                    <div className="text-xs text-slate-400">
                      Zabbix Trigger #{alert.triggerid}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
