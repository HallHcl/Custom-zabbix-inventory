import { useState, useMemo } from 'react'
import {
  Zap,
  Thermometer,
  Layers,
  Server,
  Download,
  Activity,
  ExternalLink,
  ShieldCheck,
  Cpu,
  HardDrive,
  Network,
  Search,
} from 'lucide-react'
import type { RoomOverview, RackSummary } from '../../types'
import { fetchDevices } from '../../api/client'

interface ReportsViewProps {
  overview: RoomOverview | null
  onSelectRack?: (rack: RackSummary) => void
}

export function ReportsView({ overview, onSelectRack }: ReportsViewProps) {
  const [cabinetSearch, setCabinetSearch] = useState('')
  const [isExportingDevices, setIsExportingDevices] = useState(false)

  const computedMetrics = useMemo(() => {
    if (!overview) return null

    const totalRacks = overview.total_racks || overview.racks.length || 1
    const totalCapacityU = overview.total_capacity_u && overview.total_capacity_u > 0
      ? overview.total_capacity_u
      : totalRacks * 42
    const totalUsedU = overview.total_used_u ?? overview.racks.reduce((acc, r) => acc + r.used_u, 0)
    const freeU = Math.max(0, totalCapacityU - totalUsedU)
    const capacityPercent = totalCapacityU > 0 ? Math.round((totalUsedU / totalCapacityU) * 100) : 0

    const totalPowerKW = overview.total_power_kw ?? overview.racks.reduce((acc, r) => acc + r.power_kw, 0)
    const avgPowerPerRack = (totalPowerKW / totalRacks).toFixed(2)

    const temps = overview.racks.map((r) => r.inlet_temp_c).filter((t) => t > 0)
    const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : overview.room_temp_c.toFixed(1)
    const peakTemp = temps.length > 0 ? Math.max(...temps).toFixed(1) : overview.room_temp_c.toFixed(1)

    const deviceTypes = overview.device_type_counts || {}

    return {
      totalRacks,
      totalCapacityU,
      totalUsedU,
      freeU,
      capacityPercent,
      totalPowerKW,
      avgPowerPerRack,
      avgTemp,
      peakTemp,
      deviceTypes,
    }
  }, [overview])

  const filteredRacks = useMemo(() => {
    if (!overview?.racks) return []
    if (!cabinetSearch.trim()) return overview.racks
    const q = cabinetSearch.toLowerCase()
    return overview.racks.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.row.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    )
  }, [overview?.racks, cabinetSearch])

  if (!overview || !computedMetrics) {
    return (
      <div className="max-w-[1600px] mx-auto p-12 text-center text-[#85a6b1] noc-panel select-none">
        <Activity className="w-8 h-8 mx-auto mb-3 text-[#8bd7d1] animate-pulse" />
        <p className="text-xs font-mono">Loading Data Center telemetry & capacity analytics...</p>
      </div>
    )
  }

  const {
    totalRacks,
    totalCapacityU,
    totalUsedU,
    freeU,
    capacityPercent,
    totalPowerKW,
    avgPowerPerRack,
    avgTemp,
    peakTemp,
    deviceTypes,
  } = computedMetrics

  const zabbixStatus = overview.zabbix_status

  // Export 1: Enclosure Capacity & Metrics CSV
  const handleExportEnclosuresCSV = () => {
    let csv = 'Cabinet,Row,Col,Total_U,Used_U,Free_U,Usage_Percent,Power_kW,Inlet_Temp_C,Device_Count,Posture_Status,Highest_Severity\n'
    overview.racks.forEach((r) => {
      const free = r.total_u - r.used_u
      csv += `"${r.name}","${r.row}",${r.col},${r.total_u},${r.used_u},${free},${r.usage_percent},${r.power_kw},${r.inlet_temp_c},${r.device_count},"${r.status}",${r.highest_severity}\n`
    })
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `DC_Enclosures_Audit_${overview.room_name.replace(/\s+/g, '_')}_${dateStr}.csv`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Export 2: Complete Hardware Device Inventory CSV
  const handleExportDevicesCSV = async () => {
    try {
      setIsExportingDevices(true)
      const allDevices = await fetchDevices()
      let csv = 'Device_ID,Name,Type,Model,Manufacturer,Rack_ID,Start_U,Height_U,Face,IP_Address,Serial_Number,Zabbix_Host_ID,Status\n'
      allDevices.forEach((d) => {
        csv += `${d.id},"${d.name}","${d.device_type}","${d.model || ''}","${d.manufacturer || ''}",${d.rack_id || ''},${d.start_u},${d.height_u},"${d.position_face}","${d.ip_address || ''}","${d.serial_number || ''}","${d.zabbix_host_id || ''}","${d.status || 'Active'}"\n`
      })
      const dateStr = new Date().toISOString().split('T')[0]
      const filename = `DC_Hardware_Inventory_Audit_${overview.room_name.replace(/\s+/g, '_')}_${dateStr}.csv`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export device inventory CSV:', err)
    } finally {
      setIsExportingDevices(false)
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 select-none pb-8">
      {/* Sub Header & Report Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#394650]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white font-sans">
              DATACENTER TELEMETRY &amp; CAPACITY AUDIT
            </h2>
            <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] font-mono text-[#8bd7d1]">
              AUDIT READY
            </span>
            {zabbixStatus && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] border text-[9.5px] font-mono font-bold tracking-wide uppercase ${
                  zabbixStatus.status === 'CONNECTED'
                    ? 'bg-emerald-950/60 border-emerald-600/80 text-emerald-300'
                    : zabbixStatus.status === 'STALE'
                    ? 'bg-amber-950/60 border-amber-600/80 text-amber-300'
                    : 'bg-rose-950/60 border-rose-600/80 text-rose-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    zabbixStatus.status === 'CONNECTED'
                      ? 'bg-emerald-400 animate-pulse'
                      : zabbixStatus.status === 'STALE'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                />
                ZABBIX: {zabbixStatus.status}
              </span>
            )}
          </div>
          <p className="text-xs text-[#85a6b1] font-mono mt-0.5">
            Space, power, thermal, and inventory audit for {overview.site_name} • {overview.room_name} (Live synchronized)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {zabbixStatus?.zabbix_web_console_url && (
            <a
              href={zabbixStatus.zabbix_web_console_url}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#50626f] text-[#caedde] hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Open Zabbix 7.0 Web Console"
            >
              <span>Zabbix 7.0</span>
              <ExternalLink className="w-3 h-3 text-[#8bd7d1]" />
            </a>
          )}
          <button
            type="button"
            onClick={handleExportDevicesCSV}
            disabled={isExportingDevices}
            className="px-3 py-1.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#50626f] hover:border-[#8bd7d1] text-[#caedde] text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-[#8bd7d1]" />
            <span>{isExportingDevices ? 'Exporting...' : 'Export Devices CSV'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportEnclosuresCSV}
            className="px-3 py-1.5 rounded-[2px] bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] hover:border-[#8bd7d1] text-[#caedde] hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#8bd7d1]" />
            <span>Export Enclosures CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Rack Space Utilization */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider">Rack Space (RU)</span>
            <Server className="w-3.5 h-3.5 text-[#8bd7d1]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mb-1">
            {totalUsedU} / {totalCapacityU} U
          </div>
          <div className="w-full h-1.5 rounded-[1px] bg-[#273139] overflow-hidden mb-1.5">
            <div
              className={`h-full transition-all duration-300 ${
                capacityPercent > 85 ? 'bg-rose-400' : capacityPercent > 70 ? 'bg-amber-400' : 'bg-[#8bd7d1]'
              }`}
              style={{ width: `${Math.min(capacityPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#85a6b1]">
            <span className="text-[#caedde] font-bold">{capacityPercent}% Allocated</span>
            <span>{freeU} U Available</span>
          </div>
        </div>

        {/* 2. Facility Power Draw */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider">Total Active Load</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mb-1">
            {totalPowerKW.toFixed(1)} kW
          </div>
          <div className="w-full h-1.5 rounded-[1px] bg-[#273139] overflow-hidden mb-1.5">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${Math.min((totalPowerKW / (totalRacks * 5.0)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#85a6b1]">
            <span>Avg {avgPowerPerRack} kW / Cabinet</span>
            <span>{totalRacks} Enclosures</span>
          </div>
        </div>

        {/* 3. Inlet Thermal Ambient */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider">Thermal Posture</span>
            <Thermometer className="w-3.5 h-3.5 text-[#8bd7d1]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mb-1">
            {avgTemp} °C
          </div>
          <div className="w-full h-1.5 rounded-[1px] bg-[#273139] overflow-hidden mb-1.5">
            <div
              className={`h-full transition-all duration-300 ${
                Number(avgTemp) > 28 ? 'bg-rose-400' : Number(avgTemp) > 25 ? 'bg-amber-400' : 'bg-[#8bd7d1]'
              }`}
              style={{ width: `${Math.min((Number(avgTemp) / 35) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#85a6b1]">
            <span>Target: {overview.room_temp_c}°C</span>
            <span className="text-[#caedde]">Peak: {peakTemp}°C</span>
          </div>
        </div>

        {/* 4. Monitored Assets & Trigger Health */}
        <div className="noc-panel p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#85a6b1] text-xs mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider">Hardware Assets</span>
            <Layers className="w-3.5 h-3.5 text-[#85a6b1]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono mb-1">
            {overview.total_devices} Units
          </div>
          <div className="w-full h-1.5 rounded-[1px] bg-[#273139] overflow-hidden mb-1.5">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${Math.min((overview.status_counts.healthy / (overview.total_racks || 1)) * 100, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#8bd7d1] font-bold">
              {overview.status_counts.healthy} / {overview.total_racks} Healthy Racks
            </span>
            <span className={overview.total_alerts > 0 ? 'text-rose-400 font-bold' : 'text-[#85a6b1]'}>
              {overview.total_alerts} Active Alarms
            </span>
          </div>
        </div>
      </div>

      {/* Hardware Category Breakdown Bar & Cards */}
      <div className="noc-panel p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#8bd7d1]" />
            <span className="font-mono uppercase tracking-wider text-[11px] text-[#caedde] font-semibold">
              Hardware Category Inventory Breakdown
            </span>
          </div>
          <span className="text-[10px] text-[#85a6b1] font-mono">
            Total {overview.total_devices} Mounted Hardware Units
          </span>
        </div>

        {/* Proportional distribution bar */}
        {overview.total_devices > 0 && (
          <div className="w-full h-2 rounded-[2px] bg-[#273139] overflow-hidden flex">
            {Object.entries(deviceTypes).map(([type, count]) => {
              const pct = (count / overview.total_devices) * 100
              const colorClass =
                type === 'Server'
                  ? 'bg-[#8bd7d1]'
                  : type === 'Switch'
                  ? 'bg-sky-400'
                  : type === 'Firewall'
                  ? 'bg-rose-400'
                  : type === 'Storage'
                  ? 'bg-amber-400'
                  : type === 'UPS' || type === 'PDU'
                  ? 'bg-emerald-400'
                  : 'bg-[#50626f]'
              return (
                <div
                  key={type}
                  className={`h-full ${colorClass}`}
                  style={{ width: `${pct}%` }}
                  title={`${type}: ${count} units (${pct.toFixed(1)}%)`}
                />
              )
            })}
          </div>
        )}

        {/* Category Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
          {[
            { type: 'Server', icon: Server, color: 'text-[#8bd7d1]' },
            { type: 'Switch', icon: Network, color: 'text-sky-400' },
            { type: 'Firewall', icon: ShieldCheck, color: 'text-rose-400' },
            { type: 'Storage', icon: HardDrive, color: 'text-amber-400' },
            { type: 'UPS', icon: Zap, color: 'text-emerald-400' },
            { type: 'Patch Panel', icon: Layers, color: 'text-[#85a6b1]' },
          ].map(({ type, icon: Icon, color }) => {
            const count = deviceTypes[type] || 0
            const pct = overview.total_devices > 0 ? ((count / overview.total_devices) * 100).toFixed(0) : '0'
            return (
              <div
                key={type}
                className="p-2.5 rounded-[2px] bg-[#273139] border border-[#394650] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-[10px] text-[#85a6b1] font-mono mb-1">
                  <span className="truncate">{type}</span>
                  <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-lg font-bold text-white">{count}</span>
                  <span className="text-[10px] text-[#85a6b1]">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Enclosure Distribution Matrix Table */}
      <div className="noc-panel overflow-hidden">
        <div className="noc-panel-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono uppercase tracking-wider text-[11px] text-[#caedde]">
              Enclosure Distribution Matrix
            </span>
            <span className="text-[10px] text-[#85a6b1] font-mono">
              ({filteredRacks.length} of {overview.racks.length} Enclosures)
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#85a6b1]" />
            <input
              type="text"
              value={cabinetSearch}
              onChange={(e) => setCabinetSearch(e.target.value)}
              placeholder="Filter cabinet / row..."
              className="w-full pl-7 pr-2 py-1 text-xs font-mono bg-[#1a2329] border border-[#394650] rounded-[2px] text-white placeholder-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono min-w-[700px]">
            <thead className="bg-[#273139] border-b border-[#394650] text-[#85a6b1] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Cabinet</th>
                <th className="py-2.5 px-3">Row / Position</th>
                <th className="py-2.5 px-3">Space Allocated</th>
                <th className="py-2.5 px-3">Free RU</th>
                <th className="py-2.5 px-3">Device Count</th>
                <th className="py-2.5 px-3">Power Draw</th>
                <th className="py-2.5 px-3">Inlet Temp</th>
                <th className="py-2.5 px-3">Posture Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#394650]">
              {filteredRacks.map((r) => {
                const freeSlotU = Math.max(0, r.total_u - r.used_u)
                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelectRack && onSelectRack(r)}
                    className={`hover:bg-[#252f36] transition-colors ${
                      onSelectRack ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                      <span>{r.name}</span>
                      {onSelectRack && (
                        <ExternalLink className="w-2.5 h-2.5 text-[#85a6b1] opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#85a6b1]">
                      ROW {r.row} / COL {r.col}
                    </td>
                    <td className="py-2.5 px-3 text-[#caedde]">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-[1px] bg-[#273139] overflow-hidden">
                          <div
                            className={`h-full ${
                              r.usage_percent > 85
                                ? 'bg-rose-400'
                                : r.usage_percent > 70
                                ? 'bg-amber-400'
                                : 'bg-[#8bd7d1]'
                            }`}
                            style={{ width: `${Math.min(r.usage_percent, 100)}%` }}
                          />
                        </div>
                        <span>
                          {r.used_u} / {r.total_u} U ({r.usage_percent}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#85a6b1]">
                      {freeSlotU} U
                    </td>
                    <td className="py-2.5 px-3 text-white">
                      {r.device_count}
                    </td>
                    <td className="py-2.5 px-3 text-amber-400 font-medium">
                      {r.power_kw} kW
                    </td>
                    <td className="py-2.5 px-3 text-[#8bd7d1]">
                      {r.inlet_temp_c} °C
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold uppercase ${
                          r.status === 'critical'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : r.status === 'warning'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : 'bg-[#1a3835] text-[#8bd7d1] border border-[#2b5d58]'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ReportsView
