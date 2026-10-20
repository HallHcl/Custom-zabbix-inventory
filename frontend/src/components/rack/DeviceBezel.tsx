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
        return <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse shrink-0" />
      case 'warning':
        return <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse shrink-0" />
      case 'ok':
      default:
        return <span className="w-2 h-2 rounded-full bg-[#8bd7d1] shadow-[0_0_6px_rgba(139,215,209,0.8)] shrink-0" />
    }
  }

  // Render specific bezel face based on device type
  const renderFaceplate = () => {
    switch (device.device_type) {
      case 'Patch Panel':
        return (
          <div className="w-full h-full bg-[#242e35] border-y border-[#394650] px-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold text-[#caedde]">{device.name}</span>
            </div>
            {/* RJ45 Port array */}
            <div className="flex gap-0.5">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-3 h-3.5 bg-[#161c20] border border-[#394650] rounded-[1px] flex flex-col items-center justify-center">
                  <div className="w-1.5 h-1 bg-[#414a50] rounded-xs" />
                  <span className="w-0.5 h-0.5 bg-[#8bd7d1] mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        )

      case 'Switch':
        return (
          <div className="w-full h-full bg-[#29353e] border-y border-[#414a50] px-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusLed()}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-[#8bd7d1] truncate max-w-[120px]">{device.name}</span>
                <span className="px-1 py-0.2 rounded-2xs bg-[#161c20] border border-[#414a50] text-[8px] font-bold text-[#caedde]">
                  {device.model?.includes('6885') ? 'HUAWEI CE6885' : device.model || 'SW-48P'}
                </span>
              </div>
            </div>
            {/* Switch Ports */}
            <div className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-2.5 h-3.5 bg-[#161c20] border border-[#414a50] rounded-[1px] flex flex-col items-center justify-between p-0.5">
                    <span className="w-1 h-1 rounded-full bg-[#8bd7d1]" />
                    <span className="w-1 h-0.5 bg-[#85a6b1]" />
                  </div>
                ))}
              </div>
              <div className="w-5 h-4 bg-[#161c20] border border-amber-600/70 rounded-[1px] flex items-center justify-center text-[7px] text-amber-400 font-mono font-bold">
                SFP+
              </div>
            </div>
          </div>
        )

      case 'Firewall':
        return (
          <div className="w-full h-full bg-[#31232c] border-y border-[#56364a] px-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusLed()}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-rose-300 truncate max-w-[120px]">{device.name}</span>
                <span className="px-1 py-0.2 rounded-2xs bg-[#1d141a] border border-rose-900 text-[8px] text-rose-300 font-bold">
                  {device.model?.includes('701') ? 'FORTIGATE 701G' : device.model || 'NGFW'}
                </span>
              </div>
            </div>
            <div className="flex gap-1 items-center">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-3 h-3 bg-[#1d141a] border border-rose-900/70 rounded-[1px] flex items-center justify-center">
                  <span className="w-1 h-1 bg-rose-500 rounded-full" />
                </div>
              ))}
              <span className="text-[8px] font-mono text-rose-400 font-bold px-1 py-0.2 bg-rose-950/80 border border-rose-900 rounded-[1px]">
                SEC
              </span>
            </div>
          </div>
        )

      case 'Storage':
        return (
          <div className="w-full h-full bg-[#202930] border-y border-[#394650] px-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusLed()}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-white truncate max-w-[120px]">{device.name}</span>
                <span className="px-1 py-0.2 rounded-2xs bg-[#161c20] border border-[#394650] text-[8px] text-[#8bd7d1] font-bold">
                  ALL-FLASH SAN
                </span>
              </div>
            </div>
            {/* Storage Drive Bays */}
            <div className="flex gap-0.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-3.5 h-4.5 bg-[#161c20] border border-[#394650] rounded-[1px] flex flex-col justify-between p-0.5">
                  <span className="w-1 h-1 bg-[#85a6b1] rounded-full" />
                  <span className="w-full h-0.5 bg-[#8bd7d1]" />
                </div>
              ))}
            </div>
          </div>
        )

      case 'UPS':
        return (
          <div className="w-full h-full bg-[#222a31] border-y border-[#394650] px-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-[#caedde] font-mono px-1 py-0.2 bg-[#161c20] border border-[#394650] rounded-2xs">
                APC 10kVA
              </span>
              <span className="text-[10px] font-mono text-[#caedde] truncate max-w-[130px]">{device.name}</span>
            </div>
            {/* UPS LCD Display */}
            <div className="w-16 h-7 bg-[#161c20] border border-[#8bd7d1]/50 rounded-[2px] p-0.5 flex flex-col justify-between text-[7px] text-[#8bd7d1] font-mono">
              <div className="flex justify-between font-bold">
                <span>LINE:OK</span>
                <span>230V</span>
              </div>
              <div className="w-full bg-[#34424b] h-1 rounded-[1px] overflow-hidden">
                <div className="w-4/5 h-full bg-[#8bd7d1]" />
              </div>
            </div>
          </div>
        )

      case 'Server':
      default:
        return (
          <div className="w-full h-full bg-[#273139] border-y border-[#394650] px-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusLed()}
              <div>
                <div className="text-[10px] font-mono font-bold text-white flex items-center gap-1.5">
                  <span className="truncate max-w-[140px]">{device.name}</span>
                  <span className="px-1 py-0.2 rounded-2xs bg-[#20282f] border border-[#50626f] text-[8px] text-[#8bd7d1] font-bold">
                    {device.model?.includes('R750') ? 'DELL R750' : device.model || 'POWEREDGE'}
                  </span>
                  {status === 'warning' && (
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  )}
                  {status === 'critical' && (
                    <AlertOctagon className="w-3 h-3 text-rose-500 shrink-0" />
                  )}
                </div>
                {device.height_u >= 2 && (
                  <div className="text-[9px] font-mono text-[#85a6b1] truncate max-w-[140px]">
                    {device.model || 'Dell PowerEdge R750'} • {device.manufacturer || 'Dell EMC'}
                  </div>
                )}
              </div>
            </div>

            {/* Drive Caddies / Vent Grid */}
            <div className="flex items-center gap-0.5">
              {[...Array(device.height_u >= 2 ? 8 : 4)].map((_, i) => (
                <div
                  key={i}
                  className="w-2.5 h-4 bg-[#161c20] border border-[#394650] rounded-[1px] flex flex-col justify-between p-0.5"
                >
                  <span className="w-1 h-1 rounded-full bg-[#85a6b1]" />
                  <span className="w-full h-0.5 bg-[#8bd7d1]" />
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
      className={`relative w-full cursor-pointer select-none transition-colors ${
        isSelected
          ? 'outline outline-2 outline-[#8bd7d1] -outline-offset-1 z-10 bg-[#34424b]'
          : 'hover:brightness-110'
      }`}
    >
      {renderFaceplate()}
    </div>
  )
}
