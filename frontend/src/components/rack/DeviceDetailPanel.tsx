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
      <div className="w-80 lg:w-96 p-6 noc-panel flex flex-col items-center justify-center text-center text-[#85a6b1] h-full min-h-[400px] select-none">
        <Activity className="w-10 h-10 mb-3 text-[#85a6b1]" />
        <span className="text-xs font-mono font-medium">Select a hardware unit in the 42U rack</span>
        <span className="text-[10px] text-[#85a6b1] font-mono mt-1">Live telemetry and trigger details will display here</span>
      </div>
    )
  }

  const status = device.zabbix_status?.status || 'ok'
  const brandInfo = device.brand_info
  const brandColor = brandInfo?.color || '#8bd7d1'
  const cpuPercent = metrics?.cpu_utilization ?? 78.0
  const memPercent = metrics?.memory_utilization ?? 64.0
  const tempC = metrics?.temperature_c ?? 72.0

  return (
    <div className="w-80 lg:w-96 flex flex-col gap-3 select-none">
      {/* Selected Device Telemetry Panel */}
      <div className="noc-panel flex flex-col justify-between">
        <div className="noc-panel-header">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8bd7d1]" />
            <span className="font-mono uppercase tracking-wider text-[11px] text-[#caedde]">
              Unit Telemetry Inspector
            </span>
          </div>
          <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] font-mono text-[#caedde]">
            {device.device_type}
          </span>
        </div>

        <div className="p-3.5 space-y-3">
          {/* Signature Hardware Hero Card */}
          <div
            className="p-3 rounded-[3px] border relative overflow-hidden space-y-2.5 transition-all shadow-md"
            style={{
              borderColor: brandColor ? `${brandColor}55` : '#394650',
              background: `linear-gradient(135deg, ${brandColor}18 0%, #1e262c 85%)`,
            }}
          >
            {/* Top Brand Pill & Operational Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] border text-[8.5px] font-mono font-black tracking-wider uppercase shadow-xs shrink-0 ${
                    brandInfo?.badge_class || 'bg-[#273139] border-[#50626f] text-[#caedde]'
                  }`}
                  style={{
                    boxShadow: brandInfo?.glow_color ? `0 0 8px ${brandInfo.glow_color}` : undefined,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: brandColor }}
                  />
                  <span>{brandInfo?.tag || brandInfo?.name || device.manufacturer || 'ENTERPRISE'}</span>
                </span>
                <span className="px-1.5 py-0.2 rounded-[2px] bg-[#14191d] border border-[#394650] text-[8px] font-mono font-bold text-[#85a6b1] shrink-0">
                  {device.height_u}U {device.device_type}
                </span>
              </div>

              {/* Status Indicator */}
              {status === 'critical' ? (
                <span className="px-1.5 py-0.2 rounded-[2px] text-[9.5px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700 flex items-center gap-1 shadow-xs animate-pulse shrink-0">
                  <AlertOctagon className="w-3 h-3" />
                  CRITICAL
                </span>
              ) : status === 'warning' ? (
                <span className="px-1.5 py-0.2 rounded-[2px] text-[9.5px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1 shadow-xs animate-pulse shrink-0">
                  <AlertTriangle className="w-3 h-3" />
                  WARNING
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-[2px] text-[9.5px] font-mono font-bold bg-[#142e2b] text-[#8bd7d1] border border-[#2b5d58] flex items-center gap-1 shadow-xs shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  NOMINAL
                </span>
              )}
            </div>

            {/* Model Family & Hostname Typography */}
            <div>
              <div className="flex items-baseline justify-between gap-1">
                <h3 className="text-sm font-mono font-black text-white tracking-tight truncate max-w-[200px]" title={device.name}>
                  {device.name}
                </h3>
                <span
                  className="text-xs font-mono font-bold tracking-tight shrink-0"
                  style={{ color: brandColor }}
                >
                  {brandInfo?.model_family || device.model || 'Standard Chassis'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#85a6b1] font-mono mt-0.5">
                <span>{device.model || 'OEM Spec'}</span>
                <span className="text-[#caedde] font-semibold">{device.manufacturer || brandInfo?.name || 'Enterprise'}</span>
              </div>
            </div>
          </div>

          {/* Position & IP Badges */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2 rounded-[2px] bg-[#273139] border border-[#394650]">
              <span className="text-[#85a6b1] block text-[9px] uppercase">Slot Elevation</span>
              <span className="font-bold text-[#caedde] text-[11px]">
                U{device.start_u} - U{device.start_u + device.height_u - 1} ({device.height_u}U)
              </span>
            </div>
            <div className="p-2 rounded-[2px] bg-[#273139] border border-[#394650]">
              <span className="text-[#85a6b1] block text-[9px] uppercase">Management IP</span>
              <span className="font-bold text-[#caedde] text-[11px] truncate block">
                {device.ip_address || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Edit Hardware Spec & Brand Modal Trigger */}
          {onEditSpec && (
            <button
              type="button"
              onClick={() => onEditSpec(device)}
              className="w-full py-1.5 px-3 rounded-[3px] bg-[#34424b] hover:bg-[#414a50] border border-[#50626f] text-[#8bd7d1] font-mono font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer hover:border-[#8bd7d1] group"
            >
              <Settings2 className="w-3.5 h-3.5 text-[#8bd7d1] group-hover:rotate-45 transition-transform" />
              <span>Edit Hardware Spec & Brand</span>
            </button>
          )}

          {/* Dynamic Custom Inventory Fields */}
          {device.custom_fields && Object.keys(device.custom_fields).length > 0 && (
            <div className="p-2.5 rounded-[2px] bg-[#273139] border border-[#394650] space-y-1 text-xs font-mono">
              <span className="text-[9px] text-[#85a6b1] uppercase tracking-wider block">
                CMDB Extended Inventory
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                {device.custom_fields.brand && (
                  <div>
                    <span className="text-[#85a6b1]">Brand: </span>
                    <span className="text-[#caedde] font-medium">{device.custom_fields.brand}</span>
                  </div>
                )}
                {device.custom_fields.vendor && (
                  <div>
                    <span className="text-[#85a6b1]">Vendor: </span>
                    <span className="text-[#caedde] font-medium">{device.custom_fields.vendor}</span>
                  </div>
                )}
                {device.custom_fields.version && (
                  <div>
                    <span className="text-[#85a6b1]">Firmware: </span>
                    <span className="text-[#caedde] font-medium">{device.custom_fields.version}</span>
                  </div>
                )}
                {device.custom_fields.user && (
                  <div>
                    <span className="text-[#85a6b1]">Custodian: </span>
                    <span className="text-[#caedde] font-medium">{device.custom_fields.user}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3 Metric Progress Bars (CPU, Memory, Temp) */}
          <div className="space-y-2.5 pt-1 font-mono">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#85a6b1] flex items-center gap-1.5 text-[11px]">
                  <Cpu className="w-3 h-3 text-[#8bd7d1]" />
                  CPU Utilization
                </span>
                <span className="font-bold text-white">{cpuPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-[1px] bg-[#273139] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    cpuPercent > 85 ? 'bg-rose-500' : cpuPercent > 70 ? 'bg-amber-400' : 'bg-[#8bd7d1]'
                  }`}
                  style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Memory */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#85a6b1] flex items-center gap-1.5 text-[11px]">
                  <Layers className="w-3 h-3 text-[#85a6b1]" />
                  Memory Utilization
                </span>
                <span className="font-bold text-white">{memPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-[1px] bg-[#273139] overflow-hidden">
                <div
                  className="h-full bg-[#85a6b1] transition-all duration-300"
                  style={{ width: `${Math.min(memPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Temperature */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#85a6b1] flex items-center gap-1.5 text-[11px]">
                  <Thermometer className="w-3 h-3 text-amber-400" />
                  Chassis Temperature
                </span>
                <span className="font-bold text-white">{tempC}°C</span>
              </div>
              <div className="w-full h-1.5 rounded-[1px] bg-[#273139] overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min((tempC / 100) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 1-Hour CPU Sparkline */}
          <div className="pt-2 border-t border-[#394650]">
            <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
              <span className="text-[#85a6b1]">CPU Trend (Last 1 Hour)</span>
              <span className="text-[#85a6b1]">100% Max</span>
            </div>
            <div className="h-16 w-full bg-[#273139] rounded-[2px] border border-[#394650] p-1.5 flex items-end">
              <svg viewBox="0 0 240 60" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="cpuSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8bd7d1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#8bd7d1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polyline
                  fill="none"
                  stroke="#8bd7d1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  points="0,35 20,40 40,30 60,38 80,25 100,28 120,20 140,24 160,18 180,22 200,15 220,18 240,14"
                />
                <polygon
                  fill="url(#cpuSparkGrad)"
                  points="0,35 20,40 40,30 60,38 80,25 100,28 120,20 140,24 160,18 180,22 200,15 220,18 240,14 240,60 0,60"
                />
              </svg>
            </div>
            <div className="flex justify-between text-[9px] text-[#85a6b1] font-mono mt-1">
              <span>-60m</span>
              <span>-45m</span>
              <span>-30m</span>
              <span>-15m</span>
              <span>Now</span>
            </div>
          </div>

          {/* Active Alert Banner */}
          {device.zabbix_status?.problems && device.zabbix_status.problems.length > 0 ? (
            <div className="p-2.5 rounded-[2px] bg-amber-950/20 border border-amber-800/40 flex items-start gap-2 text-xs font-mono text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <div className="font-semibold leading-tight text-[11px]">
                  {device.zabbix_status.problems[0].description}
                </div>
                <div className="text-[10px] text-amber-400/80 mt-0.5">
                  Zabbix Trigger #{device.zabbix_status.problems[0].triggerid}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-2 rounded-[2px] bg-[#1a3835] border border-[#2b5d58] flex items-center gap-2 text-xs font-mono text-[#8bd7d1]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#8bd7d1]" />
              <span className="text-[11px]">All Zabbix items &amp; triggers nominal</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            {onOpenDevicePage && (
              <button
                type="button"
                onClick={() => onOpenDevicePage(device.id)}
                className="w-full py-2 px-3 rounded-[2px] bg-[#8bd7d1] hover:bg-[#caedde] text-[#161c20] text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Open Full Device Page (Latest Data &amp; Specs)</span>
              </button>
            )}

            <div className="flex gap-2">
              {onInspectBlastRadius && (
                <button
                  type="button"
                  onClick={() => onInspectBlastRadius(device.id, device.name)}
                  className="flex-1 py-1.5 px-2 rounded-[2px] border border-sky-800/80 bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Simulate blast radius & cascade failure"
                >
                  <ShieldAlert className="w-3 h-3 text-sky-400" />
                  <span>Blast Radius</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onUnmountDevice(device.id)}
                className="flex-1 py-1.5 px-2 rounded-[2px] border border-amber-800/80 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Open Decommission & Hardware Replacement Wizard"
              >
                <Trash2 className="w-3 h-3 text-amber-400" />
                <span>Decommission</span>
              </button>
            </div>

            {/* Direct Zabbix 7.0 Deep Links Action Bar */}
            {device.zabbix_host_id && (
              <div className="pt-2 border-t border-[#394650] space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-[#85a6b1] font-mono uppercase tracking-wider">
                  <span>Zabbix 7.0 Console (Host #{device.zabbix_host_id})</span>
                  <span className="text-[#8bd7d1] font-bold">Live Synced</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-[10.5px]">
                  <a
                    href={device.zabbix_web_links?.latest_data_url || `http://192.168.1.85:8080/zabbix.php?action=latest.view&filter_hostids%5B%5D=${device.zabbix_host_id}&filter_set=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1 px-1.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#50626f] hover:border-[#8bd7d1] text-[#caedde] flex items-center justify-center gap-1 transition-colors"
                    title="Open Zabbix Latest Data"
                  >
                    <Activity className="w-3 h-3 text-[#8bd7d1] shrink-0" />
                    <span className="truncate">Latest</span>
                    <ExternalLink className="w-2.5 h-2.5 text-[#85a6b1] shrink-0" />
                  </a>
                  <a
                    href={device.zabbix_web_links?.problems_url || `http://192.168.1.85:8080/zabbix.php?action=problem.view&filter_hostids%5B%5D=${device.zabbix_host_id}&filter_set=1`}
                    target="_blank"
                    rel="noreferrer"
                    className={`py-1 px-1.5 rounded-[2px] border flex items-center justify-center gap-1 transition-colors ${
                      (device.zabbix_status?.problems_count || 0) > 0
                        ? 'bg-rose-950/40 border-rose-700/80 text-rose-300 hover:bg-rose-900/50'
                        : 'bg-[#273139] border-[#50626f] text-[#caedde] hover:bg-[#34424b] hover:border-[#8bd7d1]'
                    }`}
                    title="Open Zabbix Active Problems"
                  >
                    <AlertTriangle className={`w-3 h-3 shrink-0 ${(device.zabbix_status?.problems_count || 0) > 0 ? 'text-rose-400' : 'text-amber-400'}`} />
                    <span className="truncate">Alarms ({device.zabbix_status?.problems_count || 0})</span>
                    <ExternalLink className="w-2.5 h-2.5 text-[#85a6b1] shrink-0" />
                  </a>
                  <a
                    href={device.zabbix_web_links?.host_url || `http://192.168.1.85:8080/zabbix.php?action=host.edit&hostid=${device.zabbix_host_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1 px-1.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#50626f] hover:border-[#8bd7d1] text-[#caedde] flex items-center justify-center gap-1 transition-colors"
                    title="Open Zabbix Host Configuration"
                  >
                    <Settings2 className="w-3 h-3 text-[#85a6b1] shrink-0" />
                    <span className="truncate">Config</span>
                    <ExternalLink className="w-2.5 h-2.5 text-[#85a6b1] shrink-0" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Devices in This Rack Table */}
      <div className="noc-panel">
        <div className="noc-panel-header">
          <span className="font-mono uppercase tracking-wider text-[11px] text-[#caedde]">
            Cabinet Hardware ({rackDevices.length})
          </span>
          <span className="text-[10px] text-[#85a6b1] font-mono">Slot Position</span>
        </div>
        <div className="p-2 space-y-1 max-h-52 overflow-y-auto pr-1">
          {rackDevices.map((d) => {
            const isRowSelected = d.id === device.id
            const dStatus = d.zabbix_status?.status || 'ok'

            return (
              <div
                key={d.id}
                onClick={() => onSelectDevice(d)}
                className={`p-1.5 rounded-[2px] border flex items-center justify-between text-xs font-mono cursor-pointer transition-colors ${
                  isRowSelected
                    ? 'bg-[#34424b] border-[#8bd7d1] text-white'
                    : 'bg-[#273139] border-[#394650] text-[#85a6b1] hover:text-[#caedde] hover:border-[#50626f]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      dStatus === 'critical'
                        ? 'bg-rose-500 animate-pulse'
                        : dStatus === 'warning'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-[#8bd7d1]'
                    }`}
                  />
                  <div>
                    <span className="font-bold block text-[#caedde] text-[11px] truncate max-w-[170px]">{d.name}</span>
                    <span className="text-[9px] text-[#85a6b1]">{d.device_type}</span>
                  </div>
                </div>
                <div className="text-right text-[10px] text-[#85a6b1] font-bold">
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
