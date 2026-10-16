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
        return { label: 'Disaster', color: 'bg-rose-950/60 text-rose-400 border-rose-800', icon: AlertOctagon }
      case 4:
        return { label: 'High', color: 'bg-rose-950/40 text-rose-400 border-rose-800/60', icon: AlertOctagon }
      case 3:
        return { label: 'Average', color: 'bg-amber-950/50 text-amber-400 border-amber-800', icon: AlertTriangle }
      case 2:
        return { label: 'Warning', color: 'bg-amber-950/30 text-amber-400 border-amber-800/40', icon: AlertTriangle }
      case 1:
        return { label: 'Information', color: 'bg-blue-950/40 text-blue-400 border-blue-800', icon: Info }
      default:
        return { label: 'Not Classified', color: 'bg-zinc-800 text-zinc-400 border-zinc-700', icon: Info }
    }
  }

  const filteredAlerts = alerts.filter((a) => {
    if (priorityFilter !== 'all' && String(a.priority) !== priorityFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return a.description.toLowerCase().includes(q) || a.host_name.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Active Zabbix Alerts</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Total {alerts.length} Active Problems synced in real-time from Zabbix 7.0
          </p>
        </div>

        {/* Search & Severity Filter */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter triggers or host..."
              className="w-full bg-[#111111] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111111] border border-zinc-800">
            <Filter className="w-3.5 h-3.5 text-zinc-500 ml-2" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 font-medium pr-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-white">All Severities</option>
              <option value="5" className="bg-zinc-900 text-white">Disaster (5)</option>
              <option value="4" className="bg-zinc-900 text-white">High (4)</option>
              <option value="3" className="bg-zinc-900 text-white">Average (3)</option>
              <option value="2" className="bg-zinc-900 text-white">Warning (2)</option>
              <option value="1" className="bg-zinc-900 text-white">Information (1)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Grid / List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 rounded-2xl bg-[#0f0f0f] border border-zinc-800">
            No matching active alerts
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const pInfo = getPriorityInfo(alert.priority)
            const Icon = pInfo.icon

            return (
              <div
                key={alert.triggerid}
                className="p-4 rounded-xl bg-[#111111] border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl border ${pInfo.color} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-sm">{alert.description}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${pInfo.color}`}>
                        {pInfo.label}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 flex items-center gap-3">
                      <span className="font-semibold text-zinc-300">{alert.host_name}</span>
                      <span>•</span>
                      <span className="font-mono text-zinc-500">Trigger ID: {alert.triggerid}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`http://192.168.1.190/zabbix.php?action=problem.view&filter_name=${encodeURIComponent(alert.description)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Investigate in Zabbix</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
