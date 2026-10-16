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
} from 'lucide-react'
import type { Device, RackSummary } from '../../types'
import { fetchDevices } from '../../api/client'

interface DevicesViewProps {
  racks: RackSummary[]
  onOpenDeviceInRack: (rackId: number, deviceId: number) => void
}

export function DevicesView({ racks, onOpenDeviceInRack }: DevicesViewProps) {
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
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Device Inventory</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Total {devices.length} Devices • Monitored via Zabbix 7.0 & Cached in Redis
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, IP, model..."
              className="w-full bg-[#111111] border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111111] border border-zinc-800">
            <Filter className="w-3.5 h-3.5 text-zinc-500 ml-2" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent text-xs text-zinc-300 font-medium pr-3 py-1.5 focus:outline-none cursor-pointer"
            >
              {deviceTypes.map((t) => (
                <option key={t} value={t} className="bg-zinc-900 text-white">
                  {t === 'all' ? 'All Types' : t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#0f0f0f] border border-zinc-800 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#141414] border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3.5 px-5">Device</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Location</th>
              <th className="py-3.5 px-4">IP Address</th>
              <th className="py-3.5 px-4">Zabbix Status</th>
              <th className="py-3.5 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500">
                  Loading devices from database...
                </td>
              </tr>
            ) : filteredDevices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500">
                  No matching devices found
                </td>
              </tr>
            ) : (
              filteredDevices.map((d) => {
                const rackName = rackMap[d.rack_id] || `Rack #${d.rack_id}`
                const status = d.zabbix_status?.status || 'ok'

                return (
                  <tr
                    key={d.id}
                    className="hover:bg-zinc-900/60 transition-colors group cursor-default"
                  >
                    {/* Device Name & Hardware */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
                          <Server className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-white block text-sm">{d.name}</span>
                          <span className="text-[11px] text-zinc-400">
                            {d.manufacturer} {d.model}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 font-medium">
                        {d.device_type}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-white block">{rackName}</span>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          Slot U{d.start_u}
                          {d.height_u > 1 ? ` - U${d.start_u + d.height_u - 1}` : ''} ({d.height_u}
                          U)
                        </span>
                      </div>
                    </td>

                    {/* IP Address */}
                    <td className="py-3.5 px-4 font-mono text-zinc-300">
                      {d.ip_address || <span className="text-zinc-600">—</span>}
                    </td>

                    {/* Zabbix Status */}
                    <td className="py-3.5 px-4">
                      {d.zabbix_host_id ? (
                        <div className="flex items-center gap-2">
                          {status === 'critical' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/50 text-rose-400 border border-rose-800">
                              <AlertOctagon className="w-3 h-3" />
                              Critical ({d.zabbix_status?.problems_count})
                            </span>
                          ) : status === 'warning' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/50 text-amber-400 border border-amber-800">
                              <AlertTriangle className="w-3 h-3" />
                              Warning ({d.zabbix_status?.problems_count})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/50 text-emerald-400 border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Healthy
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600 font-medium text-[11px]">Unlinked</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenDeviceInRack(d.rack_id, d.id)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>View in Rack</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        {d.zabbix_host_id && (
                          <a
                            href="http://192.168.1.190"
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                            title="Open in Zabbix Console"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
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
