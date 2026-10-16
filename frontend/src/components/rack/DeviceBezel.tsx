import { AlertTriangle, AlertOctagon } from 'lucide-react'
import type { Device } from '../../types'

interface DeviceBezelProps {
  device: Device
  isSelected: boolean
  onClick: () => void
}

export function DeviceBezel({ device, isSelected, onClick }: DeviceBezelProps) {
  const heightPx = device.height_u * 28 // 28px per 1U
  const status = device.zabbix_status?.status || 'ok'

  const getStatusLed = () => {
    switch (status) {
      case 'critical':
        return <span className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500 animate-pulse" />
      case 'warning':
        return <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400 animate-pulse" />
      case 'ok':
      default:
        return <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
    }
  }

  // Render specific bezel face based on device type
  const renderFaceplate = () => {
    switch (device.device_type) {
      case 'Patch Panel':
        return (
          <div className="w-full h-full bg-[#181d28] border-y border-slate-700/60 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-slate-400">{device.name}</span>
            </div>
            {/* RJ45 Port array */}
            <div className="flex gap-1">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-3.5 h-3.5 bg-slate-900 border border-slate-700 rounded-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-sky-900/60 rounded-xs" />
                </div>
              ))}
            </div>
          </div>
        )

      case 'Switch':
        return (
          <div className="w-full h-full bg-[#1e2638] border-y border-slate-700 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusLed()}
              <span className="text-[10px] font-mono font-bold text-emerald-400">{device.name}</span>
            </div>
            {/* Switch Ports */}
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-2.5 h-3 bg-slate-900 border border-slate-600 rounded-xs flex flex-col items-center justify-between p-0.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                  </div>
                ))}
              </div>
              <div className="w-5 h-4 bg-slate-900 border border-amber-600/60 rounded-xs flex items-center justify-center text-[7px] text-amber-400 font-mono">
                SFP
              </div>
            </div>
          </div>
        )

      case 'Firewall':
        return (
          <div className="w-full h-full bg-[#201c29] border-y border-slate-700 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusLed()}
              <span className="text-[10px] font-mono font-bold text-rose-300">{device.name}</span>
            </div>
            <div className="flex gap-1 items-center">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-3 h-3 bg-slate-950 border border-rose-900/60 rounded-xs" />
              ))}
            </div>
          </div>
        )

      case 'Storage':
        return (
          <div className="w-full h-full bg-[#111827] border-y border-slate-700 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusLed()}
              <span className="text-[10px] font-mono font-bold text-white">{device.name}</span>
            </div>
            <div className="text-[9px] font-bold text-cyan-400 tracking-wider">DELLEMC</div>
            {/* Storage Drive Bays */}
            <div className="flex gap-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-4 h-5 bg-slate-900 border border-slate-700 rounded-xs flex flex-col justify-end p-0.5">
                  <span className="w-full h-0.5 bg-emerald-500/80" />
                </div>
              ))}
            </div>
          </div>
        )

      case 'UPS':
        return (
          <div className="w-full h-full bg-[#0f172a] border-y border-slate-700 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">APC</span>
              <span className="text-[10px] font-mono text-slate-400">{device.name}</span>
            </div>
            {/* UPS LCD Display */}
            <div className="w-16 h-8 bg-sky-950/80 border border-sky-600/50 rounded-sm p-1 flex flex-col justify-between text-[7px] text-sky-300 font-mono">
              <div className="flex justify-between">
                <span>ONLINE</span>
                <span>230V</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-emerald-400" />
              </div>
            </div>
          </div>
        )

      case 'Server':
      default:
        return (
          <div className="w-full h-full bg-[#151c2c] border-y border-slate-700/80 px-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {getStatusLed()}
              <div>
                <div className="text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
                  <span>{device.name}</span>
                  {status === 'warning' && (
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  )}
                  {status === 'critical' && (
                    <AlertOctagon className="w-3 h-3 text-rose-400 shrink-0" />
                  )}
                </div>
                {device.height_u >= 2 && (
                  <div className="text-[9px] text-slate-400 truncate max-w-[130px]">
                    {device.model || 'Dell PowerEdge'}
                  </div>
                )}
              </div>
            </div>

            {/* Drive Caddies / Vent Grid */}
            <div className="flex items-center gap-1">
              {[...Array(device.height_u >= 2 ? 8 : 4)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-4 bg-slate-900 border border-slate-700/80 rounded-xs flex flex-col justify-between p-0.5"
                >
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="w-full h-0.5 bg-emerald-500/60" />
                </div>
              ))}
            </div>
          </div>
        )
    }
  }

  return (
    <div
      onClick={onClick}
      style={{ height: `${heightPx}px` }}
      className={`relative w-full cursor-pointer select-none transition-all duration-150 ${
        isSelected
          ? 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-900 z-10 shadow-lg shadow-cyan-500/20'
          : 'hover:brightness-110'
      }`}
    >
      {renderFaceplate()}
    </div>
  )
}
