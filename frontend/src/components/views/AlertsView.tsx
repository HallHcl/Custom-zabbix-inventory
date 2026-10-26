/* Apple UI & Tesla UI Dual-System Design – Verified: 8pt Grid, Telemetry Typography, Pure OLED Black / Cupertino Frost */

import { useState } from 'react'
import {
  Search,
  AlertTriangle,
  AlertOctagon,
  Info,
  ExternalLink,
  Filter,
  Bell,
  ShieldAlert,
} from 'lucide-react'
import type { RecentAlert } from '../../types'
import { useTheme } from '../../lib/theme'

interface AlertsViewProps {
  alerts: RecentAlert[]
  onInspectBlastRadius?: (hostName: string) => void
}

export function AlertsView({ alerts, onInspectBlastRadius }: AlertsViewProps) {
  const { isTeslaDark } = useTheme()
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const getPriorityInfo = (p: number) => {
    switch (p) {
      case 5:
        return {
          label: 'Disaster',
          bgClass: isTeslaDark
            ? 'bg-rose-950/40 border-rose-800 text-rose-300'
            : 'bg-[#ff3b30]/15 border-[#ff3b30]/30 text-[#ff3b30]',
          iconBg: isTeslaDark
            ? 'bg-rose-950/50 text-rose-400 border border-rose-800/60'
            : 'bg-[#ff3b30]/10 text-[#ff3b30]',
          icon: AlertOctagon,
        }
      case 4:
        return {
          label: 'High',
          bgClass: isTeslaDark
            ? 'bg-amber-950/40 border-amber-800 text-amber-300'
            : 'bg-[#ff9500]/15 border-[#ff9500]/30 text-[#ff9500]',
          iconBg: isTeslaDark
            ? 'bg-amber-950/50 text-amber-400 border border-amber-800/60'
            : 'bg-[#ff9500]/10 text-[#ff9500]',
          icon: AlertOctagon,
        }
      case 3:
      case 2:
        return {
          label: p === 3 ? 'Average' : 'Warning',
          bgClass: isTeslaDark
            ? 'bg-amber-950/30 border-amber-800/70 text-amber-300'
            : 'bg-amber-500/15 border-amber-500/30 text-amber-700',
          iconBg: isTeslaDark
            ? 'bg-amber-950/40 text-amber-400 border border-amber-800/50'
            : 'bg-amber-500/10 text-amber-700',
          icon: AlertTriangle,
        }
      case 1:
        return {
          label: 'Information',
          bgClass: isTeslaDark
            ? 'bg-[#3E6AE1]/15 border-[#3E6AE1]/30 text-[#3E6AE1]'
            : 'bg-[#0071E3]/15 border-[#0071E3]/30 text-[#0071E3]',
          iconBg: isTeslaDark
            ? 'bg-[#3E6AE1]/10 text-[#3E6AE1] border border-[#3E6AE1]/30'
            : 'bg-[#0071E3]/10 text-[#0071E3]',
          icon: Info,
        }
      default:
        return {
          label: 'Unclassified',
          bgClass: isTeslaDark
            ? 'bg-[#161616] border-[#1F1F1F] text-zinc-400'
            : 'bg-black/[0.05] border-black/10 text-zinc-600',
          iconBg: isTeslaDark
            ? 'bg-[#161616] text-zinc-400 border border-[#1F1F1F]'
            : 'bg-black/[0.05] text-zinc-600',
          icon: Info,
        }
    }
  }

  const filteredAlerts = alerts.filter((a) => {
    if (priorityFilter !== 'all' && String(a.priority) !== priorityFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return a.description.toLowerCase().includes(q) || a.host_name.toLowerCase().includes(q)
  })

  return (
    <div
      className={`max-w-[1600px] mx-auto space-y-6 select-none pb-12 ${
        isTeslaDark ? 'font-mono text-[#F5F5F7]' : 'font-sans text-[#1d1d1f]'
      }`}
    >
      {/* Executive Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border ${
          isTeslaDark
            ? 'rounded-[10px] bg-[#111111] border-[#1F1F1F]'
            : 'rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm text-[#1d1d1f]'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1
              className={`text-2xl font-bold ${
                isTeslaDark ? 'font-mono text-white tracking-tight' : 'tracking-[-0.022em] text-[#1d1d1f]'
              }`}
            >
              Incident Command Center
            </h1>
            <span
              className={`px-2.5 py-1 text-xs font-semibold border ${
                isTeslaDark
                  ? 'rounded-[4px] bg-rose-950/40 border-rose-800 text-rose-300 font-mono'
                  : 'rounded-[8px] bg-[#ff3b30]/10 border-[0.5px] border-[#ff3b30]/30 text-[#ff3b30]'
              }`}
            >
              {alerts.length} ACTIVE PROBLEMS
            </span>
          </div>
          <p className={`text-xs ${isTeslaDark ? 'text-[#636366] font-mono' : 'text-zinc-500 tracking-[-0.011em]'}`}>
            Real-time trigger states synchronized via Zabbix 7.0 JSON-RPC Engine
          </p>
        </div>

        {/* Search & Severity Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64 sm:w-72">
            <Search
              className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                isTeslaDark ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problem or host..."
              className={`w-full h-[40px] pl-9 pr-3 text-xs focus:outline-none transition-all ${
                isTeslaDark
                  ? 'rounded-[6px] bg-[#161616] border border-[#1F1F1F] text-white placeholder-zinc-600 focus:border-[#3E6AE1]'
                  : 'rounded-[12px] bg-black/[0.04] border-[0.5px] border-black/10 text-[#1d1d1f] placeholder-zinc-400 focus:border-[#0071E3] focus:bg-white'
              }`}
            />
          </div>

          <div
            className={`flex items-center gap-2 h-[40px] px-3 border ${
              isTeslaDark
                ? 'rounded-[6px] bg-[#161616] border-[#1F1F1F]'
                : 'rounded-[12px] bg-black/[0.04] border-[0.5px] border-black/10'
            }`}
          >
            <Filter className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`bg-transparent text-xs focus:outline-none cursor-pointer ${
                isTeslaDark ? 'text-zinc-200 font-mono' : 'text-[#1d1d1f]'
              }`}
            >
              <option value="all" className={isTeslaDark ? 'bg-[#111111] text-white' : 'bg-white text-[#1d1d1f]'}>
                All Severities
              </option>
              <option value="5" className={isTeslaDark ? 'bg-[#111111] text-rose-400' : 'bg-white text-[#ff3b30]'}>
                Disaster (5)
              </option>
              <option value="4" className={isTeslaDark ? 'bg-[#111111] text-amber-400' : 'bg-white text-[#ff9500]'}>
                High (4)
              </option>
              <option value="3" className={isTeslaDark ? 'bg-[#111111] text-amber-300' : 'bg-white text-amber-700'}>
                Average (3)
              </option>
              <option value="2" className={isTeslaDark ? 'bg-[#111111] text-amber-300' : 'bg-white text-amber-700'}>
                Warning (2)
              </option>
              <option value="1" className={isTeslaDark ? 'bg-[#111111] text-[#3E6AE1]' : 'bg-white text-[#0071E3]'}>
                Information (1)
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Notification Center Cards */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div
            className={`py-16 text-center border ${
              isTeslaDark
                ? 'rounded-[10px] bg-[#111111] border-[#1F1F1F]'
                : 'rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm text-zinc-500'
            }`}
          >
            <div
              className={`w-12 h-12 flex items-center justify-center mx-auto mb-3 ${
                isTeslaDark
                  ? 'rounded-[8px] bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30'
                  : 'rounded-[14px] bg-[#34c759]/15 text-[#34c759]'
              }`}
            >
              <Bell className="w-6 h-6" />
            </div>
            <h3
              className={`text-base font-semibold ${
                isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f] tracking-[-0.022em]'
              }`}
            >
              No Incidents Reported
            </h3>
            <p className={`text-xs mt-1 ${isTeslaDark ? 'text-zinc-500 font-mono' : 'text-zinc-500'}`}>
              All monitored hosts and telemetry triggers are nominal
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const pInfo = getPriorityInfo(alert.priority)
            const Icon = pInfo.icon

            return (
              <div
                key={alert.triggerid}
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all border ${
                  isTeslaDark
                    ? 'rounded-[10px] bg-[#111111] border-[#1F1F1F] hover:border-[#3E6AE1] shadow-none'
                    : 'rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 hover:border-black/20 hover:shadow-md shadow-xs hover:scale-[1.005]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 flex items-center justify-center shrink-0 ${pInfo.iconBg} ${
                      isTeslaDark ? 'rounded-[6px]' : 'rounded-[12px]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`font-semibold text-sm ${
                          isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f] tracking-[-0.022em]'
                        }`}
                      >
                        {alert.description}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${pInfo.bgClass} ${
                          isTeslaDark ? 'rounded-[4px] font-mono' : 'rounded-[8px]'
                        }`}
                      >
                        {pInfo.label}
                      </span>
                    </div>
                    <div className={`text-xs flex items-center gap-2 ${isTeslaDark ? 'text-zinc-500 font-mono' : 'text-zinc-500 tracking-[-0.011em]'}`}>
                      <span className={`font-medium ${isTeslaDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                        {alert.host_name}
                      </span>
                      <span>•</span>
                      <span>Zabbix Trigger #{alert.triggerid}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  {onInspectBlastRadius && (
                    <button
                      type="button"
                      onClick={() => onInspectBlastRadius(alert.host_name)}
                      className={`min-h-[38px] px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        isTeslaDark
                          ? 'rounded-[6px] bg-[#161616] hover:bg-[#1F1F1F] border-[#1F1F1F] text-zinc-300 hover:text-white font-mono'
                          : 'rounded-[10px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black border-[0.5px] border-black/10'
                      }`}
                      title="Analyze blast radius & impact cascade"
                    >
                      <ShieldAlert className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} />
                      <span>Blast Radius</span>
                    </button>
                  )}
                  <a
                    href={`http://192.168.1.85:8080/zabbix.php?action=problem.view&filter_name=${encodeURIComponent(alert.description)}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`min-h-[38px] px-3.5 py-1.5 text-white text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isTeslaDark
                        ? 'rounded-[6px] bg-[#3E6AE1] hover:bg-[#345ac2] font-mono shadow-none'
                        : 'rounded-[10px] bg-[#0071E3] hover:bg-[#0077ED] shadow-sm'
                    }`}
                  >
                    <span>Investigate</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

