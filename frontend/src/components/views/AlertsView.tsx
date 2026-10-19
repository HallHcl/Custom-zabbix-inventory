import { useState } from 'react'
import {
  Search,
  AlertTriangle,
  AlertOctagon,
  Info,
  ExternalLink,
  Filter,
} from 'lucide-react'
import type { RecentAlert } from '../../types'

interface AlertsViewProps {
  alerts: RecentAlert[]
}

export function AlertsView({ alerts }: AlertsViewProps) {
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const getPriorityInfo = (p: number) => {
    switch (p) {
      case 5:
        return { label: 'Disaster', color: 'bg-rose-950/80 text-rose-300 border-rose-700', icon: AlertOctagon }
      case 4:
        return { label: 'High', color: 'bg-rose-950/60 text-rose-300 border-rose-800', icon: AlertOctagon }
      case 3:
        return { label: 'Average', color: 'bg-amber-950/70 text-amber-300 border-amber-700', icon: AlertTriangle }
      case 2:
        return { label: 'Warning', color: 'bg-amber-950/40 text-amber-300 border-amber-800', icon: AlertTriangle }
      case 1:
        return { label: 'Information', color: 'bg-sky-950/60 text-sky-300 border-sky-800', icon: Info }
      default:
        return { label: 'Unclassified', color: 'bg-[#34424b] text-[#85a6b1] border-[#50626f]', icon: Info }
    }
  }

  const filteredAlerts = alerts.filter((a) => {
    if (priorityFilter !== 'all' && String(a.priority) !== priorityFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return a.description.toLowerCase().includes(q) || a.host_name.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-[1600px] mx-auto space-y-3 select-none">
      {/* Sub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#394650]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white font-sans">
              ZABBIX INCIDENT TRIAGE CONSOLE
            </h2>
            <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] font-mono text-[#8bd7d1]">
              {alerts.length} ACTIVE PROBLEMS
            </span>
          </div>
          <p className="text-xs text-[#85a6b1] font-mono mt-0.5">
            Real-time trigger states polled via Zabbix 7.0 JSON-RPC Engine
          </p>
        </div>

        {/* Search & Severity Filter */}
        <div className="flex items-center gap-2">
          <div className="relative w-64 sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#85a6b1] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by problem or host name..."
              className="w-full bg-[#273139] border border-[#394650] rounded-[3px] pl-8 pr-3 py-1.5 text-xs text-[#caedde] placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1] font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[3px] bg-[#273139] border border-[#394650]">
            <Filter className="w-3 h-3 text-[#85a6b1]" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-xs text-[#caedde] font-mono focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#273139] text-[#caedde]">All Severities</option>
              <option value="5" className="bg-[#273139] text-[#caedde]">Disaster (5)</option>
              <option value="4" className="bg-[#273139] text-[#caedde]">High (4)</option>
              <option value="3" className="bg-[#273139] text-[#caedde]">Average (3)</option>
              <option value="2" className="bg-[#273139] text-[#caedde]">Warning (2)</option>
              <option value="1" className="bg-[#273139] text-[#caedde]">Information (1)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Grid / List */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="py-12 text-center text-[#85a6b1] noc-panel font-mono text-xs">
            No active Zabbix problems matching current filters
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const pInfo = getPriorityInfo(alert.priority)
            const Icon = pInfo.icon

            return (
              <div
                key={alert.triggerid}
                className="p-3 noc-panel flex items-center justify-between hover:border-[#50626f] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-[2px] border ${pInfo.color} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-white text-xs font-mono">{alert.description}</span>
                      <span className={`px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono font-bold border uppercase ${pInfo.color}`}>
                        {pInfo.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#85a6b1] font-mono flex items-center gap-2.5">
                      <span className="font-bold text-[#caedde]">{alert.host_name}</span>
                      <span>/</span>
                      <span className="text-[#85a6b1]">Trigger #{alert.triggerid}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`http://192.168.1.190/zabbix.php?action=problem.view&filter_name=${encodeURIComponent(alert.description)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-[2px] bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] text-[#caedde] hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
                >
                  <span>Investigate</span>
                  <ExternalLink className="w-3 h-3 text-[#8bd7d1]" />
                </a>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
