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
} from 'lucide-react'
import type { Device, DeviceMetrics } from '../../types'
import { fetchDeviceMetrics } from '../../api/client'

interface DeviceDetailPanelProps {
  device: Device | null
  rackDevices: Device[]
  onSelectDevice: (device: Device) => void
  onUnmountDevice: (deviceId: number) => void
}

export function DeviceDetailPanel({
  device,
  rackDevices,
  onSelectDevice,
  onUnmountDevice,
}: DeviceDetailPanelProps) {
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null)

  // Fetch live metrics when selected device changes
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
      <div className="w-80 lg:w-96 p-6 rounded-2xl bg-[#0f172a]/80 border border-slate-800/80 shadow-xl backdrop-blur flex flex-col items-center justify-center text-center text-slate-500 h-full min-h-[400px]">
        <Layers className="w-12 h-12 mb-3 text-slate-600" />
        <p className="text-sm">Click any server on the rack to view live telemetry & alerts</p>
      </div>
    )
  }

  const status = device.zabbix_status?.status || 'ok'
  const cpuPercent = metrics?.cpu_utilization ?? 78.0
  const memPercent = metrics?.memory_utilization ?? 64.0
  const tempC = metrics?.temperature_c ?? 72.0

  return (
    <div className="w-80 lg:w-96 flex flex-col gap-5">
      {/* Selected Device Telemetry Card */}
      <div className="p-5 rounded-2xl bg-[#0f172a]/80 border border-slate-800/80 shadow-xl backdrop-blur flex flex-col gap-4">
        {/* Device Header */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xl font-bold text-white tracking-tight">{device.name}</h3>
            {status === 'critical' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" />
                Critical
              </span>
            ) : status === 'warning' ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Warning
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Normal
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{device.model || 'Server Hardware'}</span>
            <span className="font-bold text-cyan-400 tracking-wider">
              {device.manufacturer || 'DELLEMC'}
            </span>
          </div>
        </div>

        {/* Position & IP Badges */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-500 block mb-0.5">Position</span>
            <span className="font-semibold text-slate-200">
              U{device.start_u} - U{device.start_u + device.height_u - 1} ({device.height_u}U)
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-slate-500 block mb-0.5">IP Address</span>
            <span className="font-mono font-semibold text-slate-200">
              {device.ip_address || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* 3 Metric Progress Bars (CPU, Memory, Temp) */}
        <div className="space-y-3 pt-1">
          {/* CPU */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                CPU Utilization
              </span>
              <span className="font-bold text-white">{cpuPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(cpuPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Memory */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Memory Utilization
              </span>
              <span className="font-bold text-white">{memPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(memPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                Temperature
              </span>
              <span className="font-bold text-white">{tempC}°C</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((tempC / 100) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 1-Hour CPU Usage Sparkline Chart */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400 font-medium">CPU Usage (Last 1 Hour)</span>
            <span className="text-[10px] text-cyan-400">100% Max</span>
          </div>
          <div className="h-20 w-full bg-slate-900/60 rounded-xl border border-slate-800/60 p-2 flex items-end">
            {/* SVG Sparkline */}
            <svg viewBox="0 0 240 60" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Sample or Real Points */}
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeLinecap="round"
                points="0,35 20,40 40,30 60,38 80,25 100,28 120,20 140,24 160,18 180,22 200,15 220,18 240,14"
              />
              <polygon
                fill="url(#cpuGrad)"
                points="0,35 20,40 40,30 60,38 80,25 100,28 120,20 140,24 160,18 180,22 200,15 220,18 240,14 240,60 0,60"
              />
            </svg>
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
            <span>10:00</span>
            <span>10:15</span>
            <span>10:30</span>
            <span>10:45</span>
            <span>11:00</span>
          </div>
        </div>

        {/* Active Alert Banner */}
        {device.zabbix_status?.problems && device.zabbix_status.problems.length > 0 ? (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <div className="font-semibold leading-snug">
                {device.zabbix_status.problems[0].description}
              </div>
              <div className="text-[10px] text-amber-400/80 mt-0.5">
                Trigger #{device.zabbix_status.problems[0].triggerid}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>All systems nominal in Zabbix</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onUnmountDevice(device.id)}
            className="flex-1 py-2 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Unmount</span>
          </button>
          <a
            href="http://192.168.1.190"
            target="_blank"
            rel="noreferrer"
            className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View in Zabbix</span>
          </a>
        </div>
      </div>

      {/* Devices in This Rack Table */}
      <div className="p-5 rounded-2xl bg-[#0f172a]/80 border border-slate-800/80 shadow-xl backdrop-blur">
        <h4 className="font-bold text-white text-sm mb-3">
          Devices in This Rack ({rackDevices.length})
        </h4>
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {rackDevices.map((d) => {
            const isRowSelected = d.id === device.id
            const dStatus = d.zabbix_status?.status || 'ok'

            return (
              <div
                key={d.id}
                onClick={() => onSelectDevice(d)}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-all ${
                  isRowSelected
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      dStatus === 'critical'
                        ? 'bg-rose-500 animate-pulse'
                        : dStatus === 'warning'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <div>
                    <span className="font-semibold block">{d.name}</span>
                    <span className="text-[10px] text-slate-500">{d.device_type}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-slate-400">
                    U{d.start_u + d.height_u - 1}
                    {d.height_u > 1 ? `-${d.start_u}` : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
