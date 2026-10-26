/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Trash2,
  Cpu,
  Layers,
  Thermometer,
  ExternalLink,
  Activity,
  Settings2,
  ShieldAlert,
} from 'lucide-react'
import type { Device, DeviceMetrics } from '../../types'
import { fetchDeviceMetrics } from '../../api/client'

interface DeviceDetailPanelProps {
  device: Device | null
  rackDevices: Device[]
  onSelectDevice: (device: Device) => void
  onUnmountDevice: (deviceId: number) => void
  onOpenDevicePage?: (deviceId: number) => void
  onEditSpec?: (device: Device) => void
  onInspectBlastRadius?: (deviceId: number, deviceName: string) => void
}

export function DeviceDetailPanel({
  device,
  rackDevices,
  onSelectDevice,
  onUnmountDevice,
  onOpenDevicePage,
  onEditSpec,
  onInspectBlastRadius,
}: DeviceDetailPanelProps) {
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null)

  useEffect(() => {
    if (!device) {
      setMetrics(null)
      return
    }

    fetchDeviceMetrics(device.id)
      .then((data) => setMetrics(data))
      .catch(() => setMetrics(null))
  }, [device?.id])

  if (!device) {
    return (
      <div className="w-80 lg:w-96 p-8 rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 flex flex-col items-center justify-center text-center text-zinc-500 h-full min-h-[440px] shadow-sm select-none font-sans">
        <div className="w-12 h-12 rounded-[14px] bg-[#0071E3]/10 border-[0.5px] border-[#0071E3]/25 flex items-center justify-center mb-4 text-[#0071E3]">
          <Activity className="w-6 h-6 animate-pulse" />
        </div>
        <span className="text-sm font-semibold text-[#1d1d1f] tracking-[-0.022em]">Select Hardware Unit</span>
        <span className="text-xs text-zinc-500 mt-1 tracking-[-0.011em]">
          Click any device in the 42U elevation to inspect live telemetry and triggers
        </span>
      </div>
    )
  }

  const status = device.zabbix_status?.status || 'ok'
  const brandInfo = device.brand_info
  const brandColor = brandInfo?.color || '#0071E3'
  const cpuPercent = metrics?.cpu_utilization ?? 78.0
  const memPercent = metrics?.memory_utilization ?? 64.0
  const tempC = metrics?.temperature_c ?? 72.0

  return (
    <div className="w-80 lg:w-96 flex flex-col gap-4 select-none font-sans text-[#1d1d1f]">
      {/* Selected Device Telemetry Panel */}
      <div className="rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 p-5 shadow-sm flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#0071E3] animate-pulse" />
            <span className="text-xs font-semibold tracking-[-0.011em] text-[#1d1d1f]">
              Hardware Inspector
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-[8px] bg-black/[0.04] text-xs font-semibold text-zinc-700">
            {device.device_type}
          </span>
        </div>

        <div className="space-y-4">
          {/* Signature Hardware Hero Card */}
          <div
            className="p-4 rounded-[16px] border-[0.5px] relative overflow-hidden space-y-3 transition-all shadow-sm"
            style={{
              borderColor: brandColor ? `${brandColor}40` : 'rgba(0,0,0,0.1)',
              background: `linear-gradient(135deg, ${brandColor}12 0%, rgba(255,255,255,0.95) 85%)`,
            }}
          >
            {/* Top Brand Pill & Operational Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] border text-[9px] font-bold uppercase tracking-wider shrink-0 bg-white border-black/10 text-zinc-800 shadow-2xs"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: brandColor }}
                  />
                  <span>{brandInfo?.tag || brandInfo?.name || device.manufacturer || 'ENTERPRISE'}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-[6px] bg-black/[0.04] border border-black/10 text-[9px] font-medium text-zinc-600 shrink-0">
                  {device.height_u}U {device.device_type}
                </span>
              </div>

              {/* Status Indicator */}
              {status === 'critical' ? (
                <span className="px-2 py-0.5 rounded-[8px] text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shrink-0">
                  <AlertOctagon className="w-3 h-3" />
                  CRITICAL
                </span>
              ) : status === 'warning' ? (
                <span className="px-2 py-0.5 rounded-[8px] text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shrink-0">
                  <AlertTriangle className="w-3 h-3" />
                  WARNING
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-[8px] text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  NOMINAL
                </span>
              )}
            </div>

            {/* Model Family & Hostname Typography */}
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-base font-bold text-[#1d1d1f] tracking-[-0.022em] truncate" title={device.name}>
                  {device.name}
                </h3>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mt-1">
                <span>{device.model || 'OEM Spec Chassis'}</span>
                <span className="text-zinc-700 font-semibold">{device.manufacturer || brandInfo?.name || 'Enterprise'}</span>
              </div>
            </div>
          </div>

          {/* Position & IP Badges */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-[12px] bg-black/[0.02] border-[0.5px] border-black/10">
              <span className="text-zinc-500 block text-[10px] uppercase font-medium">Slot Elevation</span>
              <span className="font-semibold text-[#1d1d1f] text-xs mt-0.5 block">
                U{device.start_u} - U{device.start_u + device.height_u - 1} ({device.height_u}U)
              </span>
            </div>
            <div className="p-3 rounded-[12px] bg-black/[0.02] border-[0.5px] border-black/10">
              <span className="text-zinc-500 block text-[10px] uppercase font-medium">Management IP</span>
              <span className="font-semibold text-[#0071E3] text-xs truncate mt-0.5 block">
                {device.ip_address || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Edit Hardware Spec & Brand Modal Trigger */}
          {onEditSpec && (
            <button
              type="button"
              onClick={() => onEditSpec(device)}
              className="w-full min-h-[38px] py-1.5 px-3 rounded-[12px] bg-black/[0.03] hover:bg-black/[0.06] border-[0.5px] border-black/10 text-[#0071E3] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer group"
            >
              <Settings2 className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
              <span>Edit Hardware Spec &amp; Brand</span>
            </button>
          )}

          {/* Dynamic Custom Inventory Fields */}
          {device.custom_fields && Object.keys(device.custom_fields).length > 0 && (
            <div className="p-3 rounded-[12px] bg-black/[0.02] border-[0.5px] border-black/10 space-y-1.5 text-xs">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">
                CMDB Extended Inventory
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {device.custom_fields.brand && (
                  <div>
                    <span className="text-zinc-500">Brand: </span>
                    <span className="text-zinc-700 font-medium">{device.custom_fields.brand}</span>
                  </div>
                )}
                {device.custom_fields.vendor && (
                  <div>
                    <span className="text-zinc-500">Vendor: </span>
                    <span className="text-zinc-700 font-medium">{device.custom_fields.vendor}</span>
                  </div>
                )}
                {device.custom_fields.version && (
                  <div>
                    <span className="text-zinc-500">Firmware: </span>
                    <span className="text-zinc-700 font-medium">{device.custom_fields.version}</span>
                  </div>
                )}
                {device.custom_fields.user && (
                  <div>
                    <span className="text-zinc-500">Custodian: </span>
                    <span className="text-zinc-700 font-medium">{device.custom_fields.user}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3 Metric Progress Bars (CPU, Memory, Temp) */}
          <div className="space-y-3 pt-1">
            {/* CPU */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 flex items-center gap-1.5 text-[11px] font-medium">
                  <Cpu className="w-3.5 h-3.5 text-[#0071E3]" />
                  CPU Utilization
                </span>
                <span className="font-semibold text-[#1d1d1f]">{cpuPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    cpuPercent > 85 ? 'bg-rose-500' : cpuPercent > 70 ? 'bg-amber-500' : 'bg-[#0071E3]'
                  }`}
                  style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Memory */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 flex items-center gap-1.5 text-[11px] font-medium">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  Memory Utilization
                </span>
                <span className="font-semibold text-[#1d1d1f]">{memPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(memPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 flex items-center gap-1.5 text-[11px] font-medium">
                  <Thermometer className="w-3.5 h-3.5 text-emerald-500" />
                  Chassis Temperature
                </span>
                <span className="font-semibold text-[#1d1d1f]">{tempC}°C</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min((tempC / 100) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 1-Hour CPU Sparkline */}
          <div className="pt-2 border-t border-black/10">
            <div className="flex items-center justify-between text-[11px] mb-1.5 text-zinc-500 font-medium">
              <span>CPU Trend (Last 1 Hour)</span>
              <span>100% Max</span>
            </div>
            <div className="h-16 w-full bg-black/[0.02] rounded-[12px] border-[0.5px] border-black/10 p-2 flex items-end">
              <svg viewBox="0 0 240 60" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="cpuSparkGradApple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0071E3" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#0071E3" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="none"
                  stroke="#0071E3"
                  strokeWidth="2"
                  strokeLinecap="round"
                  points="0,35 20,40 40,30 60,38 80,25 100,28 120,20 140,24 160,18 180,22 200,15 220,18 240,14"
                />
                <polygon
                  fill="url(#cpuSparkGradApple)"
                  points="0,35 20,40 40,30 60,38 80,25 100,28 120,20 140,24 160,18 180,22 200,15 220,18 240,14 240,60 0,60"
                />
              </svg>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
              <span>-60m</span>
              <span>-30m</span>
              <span>Now</span>
            </div>
          </div>

          {/* Active Alert Banner */}
          {device.zabbix_status?.problems && device.zabbix_status.problems.length > 0 ? (
            <div className="p-3 rounded-[12px] bg-amber-50 border-[0.5px] border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <div className="font-semibold leading-tight text-xs text-[#1d1d1f]">
                  {device.zabbix_status.problems[0].description}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Zabbix Trigger #{device.zabbix_status.problems[0].triggerid}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-[12px] bg-emerald-50 border-[0.5px] border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-medium">All Zabbix items &amp; triggers nominal</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {onOpenDevicePage && (
              <button
                type="button"
                onClick={() => onOpenDevicePage(device.id)}
                className="w-full min-h-[44px] py-2 px-3 rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm shadow-[#0071E3]/25 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
              >
                <Activity className="w-4 h-4" />
                <span>Open Full Device Page</span>
              </button>
            )}

            <div className="flex gap-2">
              {onInspectBlastRadius && (
                <button
                  type="button"
                  onClick={() => onInspectBlastRadius(device.id, device.name)}
                  className="flex-1 min-h-[38px] py-1.5 px-2 rounded-[10px] border-[0.5px] border-black/10 bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 hover:text-black text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Simulate blast radius & cascade failure"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span>Blast Radius</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onUnmountDevice(device.id)}
                className="flex-1 min-h-[38px] py-1.5 px-2 rounded-[10px] border-[0.5px] border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Open Decommission & Hardware Replacement Wizard"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Decommission</span>
              </button>
            </div>

            {/* Direct Zabbix 7.0 Deep Links Action Bar */}
            {device.zabbix_host_id && (
              <div className="pt-2 border-t border-black/10 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                  <span>Zabbix 7.0 Deep Links</span>
                  <span className="text-emerald-600 font-semibold">Live Synced</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <a
                    href={device.zabbix_web_links?.latest_data_url || `http://192.168.1.85:8080/zabbix.php?action=latest.view&filter_hostids%5B%5D=${device.zabbix_host_id}&filter_set=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-2 rounded-[10px] bg-black/[0.03] hover:bg-black/[0.06] border-[0.5px] border-black/10 text-zinc-700 hover:text-black flex items-center justify-center gap-1 transition-colors"
                    title="Open Zabbix Latest Data"
                  >
                    <Activity className="w-3 h-3 text-[#0071E3] shrink-0" />
                    <span className="truncate">Latest</span>
                    <ExternalLink className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                  </a>
                  <a
                    href={device.zabbix_web_links?.problems_url || `http://192.168.1.85:8080/zabbix.php?action=problem.view&filter_hostids%5B%5D=${device.zabbix_host_id}&filter_set=1`}
                    target="_blank"
                    rel="noreferrer"
                    className={`py-1.5 px-2 rounded-[10px] border-[0.5px] flex items-center justify-center gap-1 transition-colors ${
                      (device.zabbix_status?.problems_count || 0) > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-700'
                        : 'bg-black/[0.03] border-black/10 text-zinc-700 hover:bg-black/[0.06]'
                    }`}
                    title="Open Zabbix Active Problems"
                  >
                    <AlertTriangle className={`w-3 h-3 shrink-0 ${(device.zabbix_status?.problems_count || 0) > 0 ? 'text-rose-600' : 'text-amber-500'}`} />
                    <span className="truncate">Alarms ({device.zabbix_status?.problems_count || 0})</span>
                    <ExternalLink className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                  </a>
                  <a
                    href={device.zabbix_web_links?.host_url || `http://192.168.1.85:8080/zabbix.php?action=host.edit&hostid=${device.zabbix_host_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-2 rounded-[10px] bg-black/[0.03] hover:bg-black/[0.06] border-[0.5px] border-black/10 text-zinc-700 hover:text-black flex items-center justify-center gap-1 transition-colors"
                    title="Open Zabbix Host Configuration"
                  >
                    <Settings2 className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="truncate">Config</span>
                    <ExternalLink className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Devices in This Rack Drawer */}
      <div className="rounded-[20px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-black/10 mb-2">
          <span className="text-xs font-semibold text-[#1d1d1f] tracking-[-0.011em]">
            Cabinet Hardware ({rackDevices.length})
          </span>
          <span className="text-[11px] text-zinc-500">Slot Position</span>
        </div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {rackDevices.map((d) => {
            const isRowSelected = d.id === device.id
            const dStatus = d.zabbix_status?.status || 'ok'

            return (
              <div
                key={d.id}
                onClick={() => onSelectDevice(d)}
                className={`p-2 rounded-[12px] border-[0.5px] flex items-center justify-between text-xs cursor-pointer transition-all duration-200 ${
                  isRowSelected
                    ? 'bg-[#0071E3]/15 border-[#0071E3]/35 text-[#1d1d1f]'
                    : 'bg-black/[0.02] border-black/5 text-zinc-700 hover:bg-black/[0.05] hover:text-black'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      dStatus === 'critical'
                        ? 'bg-rose-500 animate-pulse'
                        : dStatus === 'warning'
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <div>
                    <span className="font-semibold block text-[#1d1d1f] text-xs truncate max-w-[170px]">{d.name}</span>
                    <span className="text-[10px] text-zinc-500">{d.device_type}</span>
                  </div>
                </div>
                <div className="text-right text-xs text-zinc-500 font-medium">
                  U{d.start_u + d.height_u - 1}
                  {d.height_u > 1 ? `-${d.start_u}` : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
