import { ChevronRight, AlertOctagon, AlertTriangle } from 'lucide-react'
import type { RecentAlert } from '../../types'
import { useTheme } from '../../lib/theme'

interface RecentAlertsProps {
  alerts: RecentAlert[]
  onViewAll?: () => void
  onSelectAlert?: (alert: RecentAlert) => void
}

export function RecentAlerts({ alerts, onViewAll, onSelectAlert }: RecentAlertsProps) {
  const { isTeslaDark } = useTheme()

  return (
    <div className={`select-none overflow-hidden transition-colors border ${
      isTeslaDark
        ? 'bg-[#111111] border-[#1F1F1F] text-[#F5F5F7] rounded-[8px]'
        : 'bg-white/75 backdrop-blur-2xl border-black/10 text-[#1d1d1f] rounded-[20px] shadow-sm'
    }`}>
      <div className={`px-4 py-3 flex items-center justify-between border-b ${
        isTeslaDark
          ? 'bg-[#161616] border-[#1F1F1F]'
          : 'bg-black/[0.02] border-black/10'
      }`}>
        <span className={`uppercase tracking-wider text-[11px] font-semibold ${
          isTeslaDark ? 'text-[#A1A1A6] font-mono' : 'text-zinc-600'
        }`}>
          Recent Zabbix Alerts
        </span>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className={`text-[11px] font-medium hover:underline cursor-pointer ${
              isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'
            }`}
          >
            All Alerts ({alerts.length}) →
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        {alerts.length === 0 ? (
          <div className={`text-center py-6 text-xs font-medium ${
            isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'
          }`}>
            No active triggers at this time
          </div>
        ) : (
          alerts.slice(0, 4).map((alert) => {
            const isCritical = alert.priority >= 3
            return (
              <div
                key={alert.triggerid}
                onClick={() => onSelectAlert && onSelectAlert(alert)}
                className={`p-3 flex items-center justify-between transition-colors cursor-pointer group border ${
                  isTeslaDark
                    ? 'rounded-[6px] bg-[#161616] hover:bg-[#1a1a1a] border-[#222222]'
                    : 'rounded-[12px] bg-black/[0.03] hover:bg-black/[0.06] border-black/10'
                }`}
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
                    <div className={`text-xs font-semibold transition-colors line-clamp-1 ${
                      isTeslaDark
                        ? 'text-[#F5F5F7] group-hover:text-[#3E6AE1]'
                        : 'text-[#1d1d1f] group-hover:text-[#0071E3]'
                    }`}>
                      {alert.host_name}: {alert.description}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${
                      isTeslaDark ? 'text-[#8E8E93] font-mono' : 'text-zinc-500'
                    }`}>
                      Trigger #{alert.triggerid}
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 transition-colors shrink-0 ml-2 ${
                  isTeslaDark
                    ? 'text-[#8E8E93] group-hover:text-[#3E6AE1]'
                    : 'text-zinc-400 group-hover:text-[#0071E3]'
                }`} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
