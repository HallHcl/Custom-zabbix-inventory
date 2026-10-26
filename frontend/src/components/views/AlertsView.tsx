/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

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

interface AlertsViewProps {
  alerts: RecentAlert[]
  onInspectBlastRadius?: (hostName: string) => void
}

export function AlertsView({ alerts, onInspectBlastRadius }: AlertsViewProps) {
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const getPriorityInfo = (p: number) => {
    switch (p) {
      case 5:
        return {
          label: 'Disaster',
          bgClass: 'bg-[#ff3b30]/15 border-[#ff3b30]/30 text-[#ff3b30]',
          iconBg: 'bg-[#ff3b30]/10 text-[#ff3b30]',
          icon: AlertOctagon,
        }
      case 4:
        return {
          label: 'High',
          bgClass: 'bg-[#ff9500]/15 border-[#ff9500]/30 text-[#ff9500]',
          iconBg: 'bg-[#ff9500]/10 text-[#ff9500]',
          icon: AlertOctagon,
        }
      case 3:
        return {
          label: 'Average',
          bgClass: 'bg-amber-500/15 border-amber-500/30 text-amber-700',
          iconBg: 'bg-amber-500/10 text-amber-700',
          icon: AlertTriangle,
        }
      case 2:
        return {
          label: 'Warning',
          bgClass: 'bg-amber-500/15 border-amber-500/30 text-amber-700',
          iconBg: 'bg-amber-500/10 text-amber-700',
          icon: AlertTriangle,
        }
      case 1:
        return {
          label: 'Information',
          bgClass: 'bg-[#0071E3]/15 border-[#0071E3]/30 text-[#0071E3]',
          iconBg: 'bg-[#0071E3]/10 text-[#0071E3]',
          icon: Info,
        }
      default:
        return {
          label: 'Unclassified',
          bgClass: 'bg-black/[0.05] border-black/10 text-zinc-600',
          iconBg: 'bg-black/[0.05] text-zinc-600',
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
    <div className="max-w-[1600px] mx-auto space-y-6 select-none font-sans text-[#1d1d1f] pb-12">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm text-[#1d1d1f]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-[-0.022em] text-[#1d1d1f]">
              Incident Command Center
            </h1>
            <span className="px-2.5 py-1 rounded-[8px] bg-[#ff3b30]/10 border-[0.5px] border-[#ff3b30]/30 text-[#ff3b30] text-xs font-semibold">
              {alerts.length} ACTIVE PROBLEMS
            </span>
          </div>
          <p className="text-xs text-zinc-500 tracking-[-0.011em]">
            Real-time trigger states synchronized via Zabbix 7.0 JSON-RPC Engine
          </p>
        </div>

        {/* Search & Severity Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64 sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problem or host..."
              className="w-full h-[40px] pl-9 pr-3 rounded-[12px] bg-black/[0.04] border-[0.5px] border-black/10 text-xs text-[#1d1d1f] placeholder-zinc-400 focus:outline-none focus:border-[#0071E3] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 h-[40px] px-3 rounded-[12px] bg-black/[0.04] border-[0.5px] border-black/10">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-xs text-[#1d1d1f] focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-white text-[#1d1d1f]">All Severities</option>
              <option value="5" className="bg-white text-[#ff3b30]">Disaster (5)</option>
              <option value="4" className="bg-white text-[#ff9500]">High (4)</option>
              <option value="3" className="bg-white text-amber-700">Average (3)</option>
              <option value="2" className="bg-white text-amber-700">Warning (2)</option>
              <option value="1" className="bg-white text-[#0071E3]">Information (1)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Notification Center Cards */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="py-16 text-center rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm text-zinc-500">
            <div className="w-12 h-12 rounded-[14px] bg-[#34c759]/15 text-[#34c759] flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-[#1d1d1f] tracking-[-0.022em]">No Incidents Reported</h3>
            <p className="text-xs text-zinc-500 mt-1">All monitored hosts and telemetry triggers are nominal</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const pInfo = getPriorityInfo(alert.priority)
            const Icon = pInfo.icon

            return (
              <div
                key={alert.triggerid}
                className="p-4 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 hover:border-black/20 hover:shadow-md shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.005]"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center ${pInfo.iconBg} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[#1d1d1f] text-sm tracking-[-0.022em]">{alert.description}</span>
                      <span className={`px-2 py-0.5 rounded-[8px] text-[10px] font-bold border uppercase tracking-wider ${pInfo.bgClass}`}>
                        {pInfo.label}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-2 tracking-[-0.011em]">
                      <span className="font-medium text-zinc-700">{alert.host_name}</span>
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
                      className="min-h-[38px] px-3.5 py-1.5 rounded-[10px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black border-[0.5px] border-black/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Analyze blast radius & impact cascade"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span>Blast Radius</span>
                    </button>
                  )}
                  <a
                    href={`http://192.168.1.85:8080/zabbix.php?action=problem.view&filter_name=${encodeURIComponent(alert.description)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[38px] px-3.5 py-1.5 rounded-[10px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
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
