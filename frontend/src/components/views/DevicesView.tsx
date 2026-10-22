import { useState, useEffect } from 'react'
import {
  Search,
  Server,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Filter,
  Inbox,
} from 'lucide-react'
import type { Device, RackSummary } from '../../types'
import { fetchDevices } from '../../api/client'

interface DevicesViewProps {
  racks: RackSummary[]
  onOpenDeviceInRack: (rackId: number, deviceId: number) => void
  onOpenDevicePage?: (deviceId: number) => void
  onOpenUnassigned?: () => void
  unassignedCount?: number
}

export function DevicesView({
  racks,
  onOpenDeviceInRack,
  onOpenDevicePage,
  onOpenUnassigned,
  unassignedCount,
}: DevicesViewProps) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    setLoading(true)
    fetchDevices()
      .then((data) => setDevices(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const rackMap: Record<number, string> = {}
  racks.forEach((r) => {
    rackMap[r.id] = r.name
  })

  const filteredDevices = devices.filter((d) => {
    if (selectedType !== 'all' && d.device_type !== selectedType) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.name.toLowerCase().includes(q) ||
      (d.ip_address && d.ip_address.includes(q)) ||
      (d.model && d.model.toLowerCase().includes(q)) ||
      (d.manufacturer && d.manufacturer.toLowerCase().includes(q))
    )
  })

  const deviceTypes = ['all', 'Server', 'Switch', 'Firewall', 'Storage', 'UPS', 'Patch Panel']

  return (
    <div className="max-w-[1600px] mx-auto space-y-3 select-none">
      {/* Tactical Sub-Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#394650]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white font-sans">
              HARDWARE INVENTORY MATRIX
            </h2>
            <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] font-mono text-[#8bd7d1]">
              {devices.length} UNITS
            </span>
          </div>
          <p className="text-xs text-[#85a6b1] font-mono mt-0.5">
            Synchronized with Zabbix 7.0 Hosts &amp; CMDB Rack Allocations
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="relative w-64 sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#85a6b1] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search host, IP, model, vendor..."
              className="w-full bg-[#273139] border border-[#394650] rounded-[3px] pl-8 pr-3 py-1.5 text-xs text-[#caedde] placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1] font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[3px] bg-[#273139] border border-[#394650]">
            <Filter className="w-3 h-3 text-[#85a6b1]" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-xs text-[#caedde] font-mono focus:outline-none cursor-pointer"
            >
              {deviceTypes.map((t) => (
                <option key={t} value={t} className="bg-[#273139] text-[#caedde]">
                  {t === 'all' ? 'All Hardware Types' : t}
                </option>
              ))}
            </select>
          </div>

          {onOpenUnassigned && (
            <button
              type="button"
              onClick={onOpenUnassigned}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#34424b] hover:bg-[#435561] border border-[#8bd7d1] text-xs font-mono text-[#8bd7d1] hover:text-white transition-colors cursor-pointer"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Unassigned Queue</span>
              {typeof unassignedCount === 'number' && unassignedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-[2px] bg-cyan-950 border border-cyan-700 text-[10px] text-cyan-300 font-bold">
                  {unassignedCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* High-Density NOC Table */}
      <div className="noc-panel overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#273139] border-b border-[#394650] text-[#85a6b1] uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Equipment / Host</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Cabinet &amp; Elevation</th>
              <th className="py-2.5 px-3">Management IP</th>
              <th className="py-2.5 px-3">Telemetry Posture</th>
              <th className="py-2.5 px-3 text-right">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#394650]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[#85a6b1]">
                  Polling hardware telemetry from database...
                </td>
              </tr>
            ) : filteredDevices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-[#85a6b1]">
                  No matching hardware records found
                </td>
              </tr>
            ) : (
              filteredDevices.map((d) => {
                const rackName = d.rack_id ? (rackMap[d.rack_id] || 'Rack') : 'Unracked / Virtual'
                const status = d.zabbix_status?.status || 'ok'

                return (
                  <tr
                    key={d.id}
                    className="hover:bg-[#252f36] transition-colors group cursor-default"
                  >
                    {/* Device Name & Hardware */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-[#8bd7d1] shrink-0" />
                        <div>
                          <span className="font-bold text-white block text-xs font-mono">{d.name}</span>
                          <span className="text-[10px] text-[#85a6b1]">
                            {d.manufacturer} {d.model}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] text-[#caedde] font-mono">
                        {d.device_type}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-2 px-3">
                      <div>
                        <span className="font-bold text-[#caedde] block text-xs">{rackName}</span>
                        {d.rack_id && d.start_u ? (
                          <span className="text-[10px] text-[#85a6b1] font-mono">
                            U{d.start_u}
                            {d.height_u > 1 ? `-U${d.start_u + d.height_u - 1}` : ''} ({d.height_u}U)
                          </span>
                        ) : (
                          <span className="text-[10px] text-cyan-400/80 font-mono">Virtual / Container</span>
                        )}
                      </div>
                    </td>

                    {/* IP Address */}
                    <td className="py-2 px-3 font-mono text-[#caedde] text-xs">
                      {d.ip_address || <span className="text-[#85a6b1]/50">—</span>}
                    </td>

                    {/* Zabbix Status */}
                    <td className="py-2 px-3">
                      {d.zabbix_host_id ? (
                        <div className="flex items-center gap-1.5">
                          {status === 'critical' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                              <AlertOctagon className="w-3 h-3" />
                              CRIT ({d.zabbix_status?.problems_count})
                            </span>
                          ) : status === 'warning' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700">
                              <AlertTriangle className="w-3 h-3" />
                              WARN ({d.zabbix_status?.problems_count})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold bg-[#1a3835] text-[#8bd7d1] border border-[#2b5d58]">
                              <CheckCircle2 className="w-3 h-3" />
                              NOMINAL
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#85a6b1]/60 font-mono text-[10px]">UNLINKED</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onOpenDevicePage && (
                          <button
                            type="button"
                            onClick={() => onOpenDevicePage(d.id)}
                            className="px-2.5 py-1 rounded-[2px] bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] text-[#8bd7d1] text-xs font-mono font-bold transition-colors cursor-pointer"
                            title="Open full Device Page with Zabbix latest data and specs"
                          >
                            <span>Device Page</span>
                          </button>
                        )}
                        {d.rack_id && (
                          <button
                            type="button"
                            onClick={() => onOpenDeviceInRack(d.rack_id, d.id)}
                            className="px-2 py-1 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-[#caedde] hover:text-white text-xs font-mono transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>Rack</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                        {d.zabbix_host_id && (
                          <a
                            href={`http://192.168.1.85:8080/zabbix.php?action=latest.view&hostids%5B%5D=${d.zabbix_host_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-[#85a6b1] hover:text-white transition-colors"
                            title="Open in Zabbix Latest Data"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
