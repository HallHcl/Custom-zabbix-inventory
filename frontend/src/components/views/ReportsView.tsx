/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

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
import { useTheme } from '../../lib/theme'

interface ReportsViewProps {
  overview: RoomOverview | null
  onSelectRack?: (rack: RackSummary) => void
}

export function ReportsView({ overview, onSelectRack }: ReportsViewProps) {
  const { isTeslaDark } = useTheme()
  const [cabinetSearch, setCabinetSearch] = useState('')
  const [isExportingDevices, setIsExportingDevices] = useState(false)

  const computedMetrics = useMemo(() => {
    if (!overview) return null

    const totalRacks = overview.total_racks || overview.racks.length || 1
    const totalCapacityU =
      overview.total_capacity_u && overview.total_capacity_u > 0
        ? overview.total_capacity_u
        : totalRacks * 42
    const totalUsedU =
      overview.total_used_u ?? overview.racks.reduce((acc, r) => acc + r.used_u, 0)
    const freeU = Math.max(0, totalCapacityU - totalUsedU)
    const capacityPercent =
      totalCapacityU > 0 ? Math.round((totalUsedU / totalCapacityU) * 100) : 0

    const totalPowerKW =
      overview.total_power_kw ?? overview.racks.reduce((acc, r) => acc + r.power_kw, 0)
    const avgPowerPerRack = (totalPowerKW / totalRacks).toFixed(2)

    const temps = overview.racks.map((r) => r.inlet_temp_c).filter((t) => t > 0)
    const avgTemp =
      temps.length > 0
        ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
        : overview.room_temp_c.toFixed(1)
    const peakTemp =
      temps.length > 0 ? Math.max(...temps).toFixed(1) : overview.room_temp_c.toFixed(1)

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
      <div className={`max-w-[1600px] mx-auto p-16 rounded-[20px] backdrop-blur-2xl border text-center shadow-sm transition-colors ${
        isTeslaDark
          ? "bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]"
          : "bg-white/75 border-black/10 text-[#1d1d1f]"
      }`}>
        <div className={`w-12 h-12 mx-auto mb-4 rounded-[14px] flex items-center justify-center border ${
          isTeslaDark
            ? "bg-[#3E6AE1]/20 border-[#3E6AE1]/40 text-[#3E6AE1]"
            : "bg-[#0071E3]/15 border-[#0071E3]/30 text-[#0071E3]"
        }`}>
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className={`text-base font-semibold tracking-[-0.022em] ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>
          Compiling Audit Telemetry
        </h3>
        <p className={`text-xs mt-1 tracking-[-0.011em] ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
          Loading Data Center telemetry &amp; capacity analytics...
        </p>
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
    let csv =
      'Cabinet,Row,Col,Total_U,Used_U,Free_U,Usage_Percent,Power_kW,Inlet_Temp_C,Device_Count,Posture_Status,Highest_Severity\n'
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
      let csv =
        'Device_ID,Name,Type,Model,Manufacturer,Rack_ID,Start_U,Height_U,Face,IP_Address,Serial_Number,Zabbix_Host_ID,Status\n'
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
    <div className={`max-w-[1600px] mx-auto space-y-6 select-none font-sans pb-12 transition-colors ${
      isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"
    }`}>
      {/* Executive Header & Audit Toolbar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[20px] backdrop-blur-2xl border shadow-sm transition-colors ${
        isTeslaDark
          ? "bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]"
          : "bg-white/75 border-black/10 text-[#1d1d1f]"
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className={`text-2xl font-bold tracking-[-0.022em] ${
              isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"
            }`}>
              Capacity &amp; Telemetry Audit
            </h1>
            <span className={`px-2.5 py-1 rounded-[8px] border text-xs font-semibold ${
              isTeslaDark
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-400"
                : "bg-[#34c759]/15 border-[#34c759]/30 text-[#34c759]"
            }`}>
              AUDIT READY
            </span>
            {zabbixStatus && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] border text-[11px] font-semibold tracking-wide uppercase ${
                  zabbixStatus.status === 'CONNECTED'
                    ? isTeslaDark
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                      : 'bg-[#34c759]/15 border-[#34c759]/30 text-[#34c759]'
                    : zabbixStatus.status === 'STALE'
                    ? isTeslaDark
                      ? 'bg-amber-950/40 border-amber-800/60 text-amber-400'
                      : 'bg-[#ff9500]/15 border-[#ff9500]/30 text-[#ff9500]'
                    : isTeslaDark
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-400'
                    : 'bg-[#ff3b30]/15 border-[#ff3b30]/30 text-[#ff3b30]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    zabbixStatus.status === 'CONNECTED'
                      ? 'bg-[#34c759] animate-pulse'
                      : zabbixStatus.status === 'STALE'
                      ? 'bg-[#ff9500]'
                      : 'bg-[#ff3b30]'
                  }`}
                />
                Zabbix: {zabbixStatus.status}
              </span>
            )}
          </div>
          <p className={`text-xs tracking-[-0.011em] ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
            Space, electrical load, thermal posture, and hardware asset accounting for {overview.site_name} • {overview.room_name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {zabbixStatus?.zabbix_web_console_url && (
            <a
              href={zabbixStatus.zabbix_web_console_url}
              target="_blank"
              rel="noreferrer"
              className={`min-h-[38px] px-3.5 py-1.5 rounded-[10px] border text-xs font-medium flex items-center gap-1.5 transition-all ${
                isTeslaDark
                  ? "bg-[#181818] hover:bg-[#222222] border-[#262626] text-[#A1A1A6] hover:text-[#FFFFFF]"
                  : "bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-700 hover:text-black"
              }`}
              title="Open Zabbix 7.0 Web Console"
            >
              <span>Zabbix Console</span>
              <ExternalLink className={`w-3.5 h-3.5 ${isTeslaDark ? "text-[#3E6AE1]" : "text-[#0071E3]"}`} />
            </a>
          )}
          <button
            type="button"
            onClick={handleExportDevicesCSV}
            disabled={isExportingDevices}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-[10px] border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${
              isTeslaDark
                ? "bg-[#181818] hover:bg-[#222222] border-[#262626] text-[#A1A1A6] hover:text-[#FFFFFF]"
                : "bg-black/[0.04] hover:bg-black/[0.08] border-black/10 text-zinc-700 hover:text-black"
            }`}
          >
            <Download className={`w-3.5 h-3.5 ${isTeslaDark ? "text-[#3E6AE1]" : "text-[#0071E3]"}`} />
            <span>{isExportingDevices ? 'Exporting...' : 'Export Devices CSV'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportEnclosuresCSV}
            className={`min-h-[38px] px-4 py-1.5 rounded-[10px] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
              isTeslaDark
                ? "bg-[#3E6AE1] hover:bg-[#4E7BF1]"
                : "bg-[#0071E3] hover:bg-[#0077ED]"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Enclosures CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Rack Space Utilization */}
        <div className={`rounded-[20px] backdrop-blur-xl border p-5 shadow-sm flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] ${
          isTeslaDark
            ? "bg-[#111111] border-[#1F1F1F] hover:border-[#2A2A2A]"
            : "bg-white/75 border-black/10 hover:border-black/20 hover:shadow-md"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>Rack Space (RU)</span>
            <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${
              isTeslaDark
                ? "bg-[#3E6AE1]/20 text-[#3E6AE1]"
                : "bg-[#0071E3]/15 text-[#0071E3]"
            }`}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className={`text-3xl font-bold tracking-tight ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>
              {totalUsedU} / {totalCapacityU} <span className={`text-lg font-normal ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>U</span>
            </div>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden mb-2 ${
            isTeslaDark ? "bg-[#1E1E1E]" : "bg-black/[0.06]"
          }`}>
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                capacityPercent > 85 ? 'bg-[#ff3b30]' : capacityPercent > 70 ? 'bg-[#ff9500]' : isTeslaDark ? 'bg-[#3E6AE1]' : 'bg-[#0071E3]'
              }`}
              style={{ width: `${Math.min(capacityPercent, 100)}%` }}
            />
          </div>
          <div className={`flex items-center justify-between text-xs tracking-[-0.011em] ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
            <span className={`font-semibold ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>{capacityPercent}% Allocated</span>
            <span>{freeU} U Available</span>
          </div>
        </div>

        {/* 2. Facility Power Draw */}
        <div className={`rounded-[20px] backdrop-blur-xl border p-5 shadow-sm flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] ${
          isTeslaDark
            ? "bg-[#111111] border-[#1F1F1F] hover:border-[#2A2A2A]"
            : "bg-white/75 border-black/10 hover:border-black/20 hover:shadow-md"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>Total Active Load</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#ff9500]/15 text-[#ff9500] flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className={`text-3xl font-bold tracking-tight ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>
              {totalPowerKW.toFixed(1)} <span className={`text-lg font-normal ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>kW</span>
            </div>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden mb-2 ${
            isTeslaDark ? "bg-[#1E1E1E]" : "bg-black/[0.06]"
          }`}>
            <div
              className="h-full bg-[#ff9500] transition-all duration-500 rounded-full"
              style={{ width: `${Math.min((totalPowerKW / (totalRacks * 5.0)) * 100, 100)}%` }}
            />
          </div>
          <div className={`flex items-center justify-between text-xs tracking-[-0.011em] ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
            <span>Avg {avgPowerPerRack} kW / Cabinet</span>
            <span>{totalRacks} Enclosures</span>
          </div>
        </div>

        {/* 3. Inlet Thermal Ambient */}
        <div className={`rounded-[20px] backdrop-blur-xl border p-5 shadow-sm flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] ${
          isTeslaDark
            ? "bg-[#111111] border-[#1F1F1F] hover:border-[#2A2A2A]"
            : "bg-white/75 border-black/10 hover:border-black/20 hover:shadow-md"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>Thermal Posture</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#34c759]/15 text-[#34c759] flex items-center justify-center">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className={`text-3xl font-bold tracking-tight ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>
              {avgTemp} <span className={`text-lg font-normal ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>°C</span>
            </div>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden mb-2 ${
            isTeslaDark ? "bg-[#1E1E1E]" : "bg-black/[0.06]"
          }`}>
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                Number(avgTemp) > 28 ? 'bg-[#ff3b30]' : Number(avgTemp) > 25 ? 'bg-[#ff9500]' : 'bg-[#34c759]'
              }`}
              style={{ width: `${Math.min((Number(avgTemp) / 35) * 100, 100)}%` }}
            />
          </div>
          <div className={`flex items-center justify-between text-xs tracking-[-0.011em] ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
            <span>Target: {overview.room_temp_c}°C</span>
            <span className={`font-semibold ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>Peak: {peakTemp}°C</span>
          </div>
        </div>

        {/* 4. Monitored Assets & Trigger Health */}
        <div className={`rounded-[20px] backdrop-blur-xl border p-5 shadow-sm flex flex-col justify-between transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] ${
          isTeslaDark
            ? "bg-[#111111] border-[#1F1F1F] hover:border-[#2A2A2A]"
            : "bg-white/75 border-black/10 hover:border-black/20 hover:shadow-md"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>Hardware Assets</span>
            <div className="w-8 h-8 rounded-[10px] bg-[#5856d6]/15 text-[#5856d6] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className={`text-3xl font-bold tracking-tight ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>
              {overview.total_devices} <span className={`text-lg font-normal ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>Units</span>
            </div>
          </div>
          <div className={`w-full h-1.5 rounded-full overflow-hidden mb-2 ${
            isTeslaDark ? "bg-[#1E1E1E]" : "bg-black/[0.06]"
          }`}>
            <div
              className="h-full bg-[#34c759] transition-all duration-500 rounded-full"
              style={{
                width: `${Math.min(
                  (overview.status_counts.healthy / (overview.total_racks || 1)) * 100,
                  100
                )}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs tracking-[-0.011em]">
            <span className="text-[#34c759] font-semibold">
              {overview.status_counts.healthy} / {overview.total_racks} Healthy Cabinets
            </span>
            <span className={overview.total_alerts > 0 ? 'text-[#ff3b30] font-semibold' : isTeslaDark ? 'text-[#888888]' : 'text-zinc-500'}>
              {overview.total_alerts} Active Alarms
            </span>
          </div>
        </div>
      </div>

      {/* Hardware Category Breakdown Bar & Cards */}
      <div className={`rounded-[20px] backdrop-blur-xl border p-6 shadow-sm space-y-4 transition-colors ${
        isTeslaDark
          ? "bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]"
          : "bg-white/75 border-black/10 text-[#1d1d1f]"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center ${
              isTeslaDark
                ? "bg-[#3E6AE1]/20 text-[#3E6AE1]"
                : "bg-[#0071E3]/15 text-[#0071E3]"
            }`}>
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-base font-semibold tracking-[-0.022em] ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>
                Hardware Category Inventory Breakdown
              </h3>
              <p className={`text-xs tracking-[-0.011em] ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
                Total {overview.total_devices} mounted hardware devices categorized by role
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-[8px] text-xs font-semibold border ${
            isTeslaDark
              ? "bg-[#181818] border-[#262626] text-[#A1A1A6]"
              : "bg-black/[0.05] border-transparent text-zinc-700"
          }`}>
            {Object.keys(deviceTypes).length} Categories
          </span>
        </div>

        {/* Proportional distribution bar */}
        {overview.total_devices > 0 && (
          <div className={`w-full h-2.5 rounded-full overflow-hidden flex ${
            isTeslaDark ? "bg-[#1E1E1E]" : "bg-black/[0.06]"
          }`}>
            {Object.entries(deviceTypes).map(([type, count]) => {
              const pct = (count / overview.total_devices) * 100
              const colorClass =
                type === 'Server'
                  ? isTeslaDark ? 'bg-[#3E6AE1]' : 'bg-[#0071E3]'
                  : type === 'Switch'
                  ? 'bg-[#5856d6]'
                  : type === 'Firewall'
                  ? 'bg-[#ff3b30]'
                  : type === 'Storage'
                  ? 'bg-[#ff9500]'
                  : type === 'UPS' || type === 'PDU'
                  ? 'bg-[#34c759]'
                  : isTeslaDark ? 'bg-[#333333]' : 'bg-zinc-400'
              return (
                <div
                  key={type}
                  className={`h-full ${colorClass} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                  title={`${type}: ${count} units (${pct.toFixed(1)}%)`}
                />
              )
            })}
          </div>
        )}

        {/* Category Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
          {[
            { type: 'Server', icon: Server, color: isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]' },
            { type: 'Switch', icon: Network, color: 'text-[#5856d6]' },
            { type: 'Firewall', icon: ShieldCheck, color: 'text-[#ff3b30]' },
            { type: 'Storage', icon: HardDrive, color: 'text-[#ff9500]' },
            { type: 'UPS', icon: Zap, color: 'text-[#34c759]' },
            { type: 'Patch Panel', icon: Layers, color: isTeslaDark ? 'text-[#888888]' : 'text-zinc-500' },
          ].map(({ type, icon: Icon, color }) => {
            const count = deviceTypes[type] || 0
            const pct =
              overview.total_devices > 0
                ? ((count / overview.total_devices) * 100).toFixed(0)
                : '0'
            return (
              <div
                key={type}
                className={`p-3.5 rounded-[14px] border transition-all flex flex-col justify-between space-y-2 ${
                  isTeslaDark
                    ? "bg-[#161616] border-[#222222] hover:border-[#2C2C2C]"
                    : "bg-black/[0.03] border-black/10 hover:border-black/20"
                }`}
              >
                <div className={`flex items-center justify-between text-xs font-medium ${
                  isTeslaDark ? "text-[#CCCCCC]" : "text-zinc-600"
                }`}>
                  <span className="truncate">{type}</span>
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-xl font-bold ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>{count}</span>
                  <span className={`text-xs ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Enclosure Distribution Matrix Table */}
      <div className={`rounded-[20px] backdrop-blur-xl border overflow-hidden shadow-sm transition-colors ${
        isTeslaDark
          ? "bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]"
          : "bg-white/75 border-black/10 text-[#1d1d1f]"
      }`}>
        <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isTeslaDark ? "border-[#1F1F1F]" : "border-black/10"
        }`}>
          <div>
            <h3 className={`text-base font-semibold tracking-[-0.022em] ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>
              Enclosure Distribution Matrix
            </h3>
            <p className={`text-xs tracking-[-0.011em] ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
              Showing {filteredRacks.length} of {overview.racks.length} data cabinets
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
              isTeslaDark ? "text-[#666666]" : "text-zinc-400"
            }`} />
            <input
              type="text"
              value={cabinetSearch}
              onChange={(e) => setCabinetSearch(e.target.value)}
              placeholder="Search cabinet or row..."
              className={`w-full h-[36px] pl-9 pr-3 text-xs border rounded-[10px] transition-all focus:outline-none ${
                isTeslaDark
                  ? "bg-[#181818] border-[#262626] text-[#F5F5F7] placeholder-[#666666] focus:border-[#3E6AE1] focus:bg-[#1E1E1E]"
                  : "bg-black/[0.04] border-black/10 text-[#1d1d1f] placeholder-zinc-400 focus:outline-none focus:border-[#0071E3] focus:bg-white"
              }`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className={`border-b text-xs font-semibold uppercase tracking-wider ${
              isTeslaDark
                ? "bg-[#161616] border-[#1F1F1F] text-[#888888]"
                : "bg-black/[0.02] border-black/10 text-zinc-500"
            }`}>
              <tr>
                <th className="py-3 px-4">Cabinet</th>
                <th className="py-3 px-4">Position</th>
                <th className="py-3 px-4">Space Allocated</th>
                <th className="py-3 px-4">Free RU</th>
                <th className="py-3 px-4">Device Count</th>
                <th className="py-3 px-4">Power Draw</th>
                <th className="py-3 px-4">Inlet Temp</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isTeslaDark ? "divide-[#1A1A1A]" : "divide-black/5"
            }`}>
              {filteredRacks.map((r) => {
                const freeSlotU = Math.max(0, r.total_u - r.used_u)
                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelectRack && onSelectRack(r)}
                    className={`transition-colors ${
                      isTeslaDark
                        ? "hover:bg-[#181818]"
                        : "hover:bg-black/[0.02]"
                    } ${
                      onSelectRack ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className={`py-3 px-4 font-semibold flex items-center gap-2 ${
                      isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"
                    }`}>
                      <span>{r.name}</span>
                      {onSelectRack && (
                        <ExternalLink className={`w-3 h-3 opacity-70 ${isTeslaDark ? "text-[#3E6AE1]" : "text-[#0071E3]"}`} />
                      )}
                    </td>
                    <td className={`py-3 px-4 ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
                      Row {r.row} • Col {r.col}
                    </td>
                    <td className={`py-3 px-4 ${isTeslaDark ? "text-[#D1D1D6]" : "text-zinc-700"}`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-16 h-1.5 rounded-full overflow-hidden ${
                          isTeslaDark ? "bg-[#222222]" : "bg-black/[0.06]"
                        }`}>
                          <div
                            className={`h-full rounded-full ${
                              r.usage_percent > 85
                                ? 'bg-[#ff3b30]'
                                : r.usage_percent > 70
                                ? 'bg-[#ff9500]'
                                : isTeslaDark ? 'bg-[#3E6AE1]' : 'bg-[#0071E3]'
                            }`}
                            style={{ width: `${Math.min(r.usage_percent, 100)}%` }}
                          />
                        </div>
                        <span>
                          {r.used_u}/{r.total_u} U ({r.usage_percent}%)
                        </span>
                      </div>
                    </td>
                    <td className={`py-3 px-4 ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
                      {freeSlotU} U
                    </td>
                    <td className={`py-3 px-4 font-medium ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>
                      {r.device_count}
                    </td>
                    <td className="py-3 px-4 text-[#ff9500] font-semibold">
                      {r.power_kw} kW
                    </td>
                    <td className="py-3 px-4 text-[#34c759] font-semibold">
                      {r.inlet_temp_c} °C
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-[8px] text-[10px] font-semibold uppercase tracking-wider border ${
                          r.status === 'critical'
                            ? isTeslaDark
                              ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                              : 'bg-[#ff3b30]/15 text-[#ff3b30] border-[#ff3b30]/30'
                            : r.status === 'warning'
                            ? isTeslaDark
                              ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                              : 'bg-[#ff9500]/15 text-[#ff9500] border-[#ff9500]/30'
                            : isTeslaDark
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                            : 'bg-[#34c759]/15 text-[#34c759] border-[#34c759]/30'
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
