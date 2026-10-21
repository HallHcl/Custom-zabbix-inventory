import { AlertTriangle, AlertOctagon, Shield } from 'lucide-react'
import type { Device, BrandInfo } from '../../types'

interface DeviceBezelProps {
  device: Device
  isSelected: boolean
  onClick: () => void
  isDimmed?: boolean
}

/**
 * Signature Brand Pill Badge for Enterprise 42U Rack Elevation
 */
function BrandPillBadge({ brandInfo, fallback }: { brandInfo?: BrandInfo | null; fallback?: string }) {
  const tag = brandInfo?.tag || fallback
  if (!tag) return null

  const badgeClass =
    brandInfo?.badge_class || 'bg-[#273139] border-[#50626f] text-[#caedde]'
  const brandColor = brandInfo?.color || '#8bd7d1'

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] border text-[7.5px] font-mono font-black tracking-wider uppercase shrink-0 shadow-xs transition-transform ${badgeClass}`}
      style={{
        boxShadow: brandInfo?.glow_color ? `0 0 6px ${brandInfo.glow_color}` : undefined,
      }}
      title={`Brand: ${brandInfo?.name || tag}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0 shadow-xs"
        style={{ backgroundColor: brandColor }}
      />
      <span>{tag}</span>
    </span>
  )
}

/**
 * Dell Signature Honeycomb Mesh Overlay (SVG Pattern)
 */
function DellHoneycombMesh({ opacity = 0.22 }: { opacity?: number }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="dell-honeycomb-pattern"
          width="12"
          height="20"
          patternUnits="userSpaceOnUse"
          patternTransform="scale(0.85)"
        >
          <path
            d="M6 0 L12 3.5 L12 10.5 L6 14 L0 10.5 L0 3.5 Z M6 10 L12 13.5 L12 20.5 L6 24 L0 20.5 L0 13.5 Z"
            fill="none"
            stroke="#007db8"
            strokeWidth="0.8"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dell-honeycomb-pattern)" />
    </svg>
  )
}

/**
 * HPE ProLiant Signature Emerald Green Bezel Stripe
 */
function HpeProLiantAccent({ heightU }: { heightU: number }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <div
        className="w-1.5 rounded-xs bg-[#01a982] shadow-[0_0_8px_rgba(1,169,130,0.8)]"
        style={{ height: heightU >= 2 ? '28px' : '16px' }}
      />
      <div className="w-3.5 h-3.5 border border-[#01a982] bg-[#0d2b24] rounded-[1px] flex items-center justify-center shadow-[0_0_6px_rgba(1,169,130,0.4)]">
        <span className="w-1.5 h-1.5 bg-[#01a982] rounded-xs" />
      </div>
    </div>
  )
}

/**
 * Realistic Drive Caddy Array with Activity LEDs
 */
function RealisticDriveCaddyArray({ count = 8, brandColor = '#85a6b1', heightU = 1 }: { count?: number; brandColor?: string; heightU?: number }) {
  const is2U = heightU >= 2
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className={`bg-[#14191d] border border-[#34404a] rounded-[1px] flex flex-col justify-between p-0.5 shadow-inner transition-colors hover:border-[#50626f] ${
            is2U ? 'w-3 h-6' : 'w-2.5 h-4'
          }`}
          title={`Drive Bay #${i + 1} - Hot-Swap SAS/NVMe`}
        >
          {/* Drive Status Activity LED */}
          <span
            className="w-1 h-1 rounded-full shadow-2xs animate-pulse"
            style={{
              backgroundColor: i % 3 === 0 ? '#10b981' : brandColor,
              animationDuration: `${1.2 + (i * 0.2)}s`,
            }}
          />
          {/* Drive Eject Latch Line */}
          <div className="w-full space-y-0.5">
            <span className="block w-full h-0.5 bg-[#414d57] rounded-2xs" />
            {is2U && <span className="block w-2/3 h-0.5 bg-[#252f36] rounded-2xs" />}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Realistic High-Speed Switch Port Array (RJ45 + SFP28/QSFP28)
 */
function RealisticSwitchPortArray({ portCount = 10, brandColor = '#00bceb', isHuawei = false, heightU = 1 }: { portCount?: number; brandColor?: string; isHuawei?: boolean; heightU?: number }) {
  const is2U = heightU >= 2
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Port Matrix */}
      <div className={`grid ${is2U ? 'grid-rows-2 grid-flow-col gap-0.5' : 'flex gap-0.5'}`}>
        {[...Array(portCount)].map((_, i) => (
          <div
            key={i}
            className="w-2.5 h-3.5 bg-[#12171b] border border-[#3b4751] rounded-[1px] flex flex-col items-center justify-between p-0.5 shadow-inner"
            title={`Port ${i + 1} - 10/25GE SFP28 Active`}
          >
            {/* Link/Activity LED */}
            <span
              className="w-1 h-1 rounded-full shadow-xs"
              style={{
                backgroundColor: i % 4 === 0 ? '#34d399' : (isHuawei ? '#f43f5e' : brandColor),
              }}
            />
            {/* Metal connector pins */}
            <span className="w-1.5 h-0.5 bg-[#5b6873] rounded-3xs" />
          </div>
        ))}
      </div>

      {/* Optical Uplink Cages (QSFP28 / SFP+) */}
      <div className="flex flex-col gap-0.5">
        <div
          className="px-1 py-0.5 bg-[#14191d] border rounded-[1px] flex items-center justify-center text-[6.5px] font-mono font-black tracking-tight shadow-xs"
          style={{
            borderColor: isHuawei ? '#cf0a2c88' : '#00bceb88',
            color: isHuawei ? '#fda4af' : '#67e8f9',
          }}
        >
          {isHuawei ? '100G' : 'QSFP'}
        </div>
        {is2U && (
          <div className="px-1 py-0.2 bg-[#14191d] border border-[#3b4751] rounded-[1px] text-[6px] font-mono text-[#85a6b1] text-center">
            UPLINK
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * APC Digital LCD Power Readout
 */
function RealisticApcLcdDisplay({ heightU = 4 }: { heightU: number }) {
  return (
    <div
      className={`bg-[#0a120e] border border-teal-500/70 rounded-[2px] p-1 flex flex-col justify-between font-mono shadow-xs shrink-0 ${
        heightU >= 4 ? 'w-24 h-12' : 'w-20 h-7'
      }`}
    >
      <div className="flex justify-between items-center text-[7px] text-teal-300 font-black tracking-wider">
        <span className="flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-teal-400 shadow-[0_0_4px_#2dd4bf] animate-ping" />
          ONLINE
        </span>
        <span className="text-teal-200">230V</span>
      </div>

      {heightU >= 4 && (
        <div className="flex justify-between text-[6.5px] text-teal-400/90 font-bold border-y border-teal-900/60 py-0.5 my-0.5">
          <span>FREQ: 50Hz</span>
          <span>LOAD: 42%</span>
        </div>
      )}

      {/* Battery Gauge Bar */}
      <div className="w-full bg-[#132219] h-1.5 rounded-[1px] overflow-hidden flex">
        <div className="w-4/5 h-full bg-teal-400 shadow-[0_0_5px_#2dd4bf]" />
        <div className="w-1/5 h-full bg-[#1b3325]" />
      </div>
    </div>
  )
}

export function DeviceBezel({ device, isSelected, onClick, isDimmed = false }: DeviceBezelProps) {
  const heightPx = device.height_u * 28 // 28px standard per 1U
  const status = device.zabbix_status?.status || 'ok'
  const brandInfo = device.brand_info
  const brandColor = brandInfo?.color || '#50626f'
  const brandName = (brandInfo?.name || device.manufacturer || '').toLowerCase()
  const modelDisplayName = brandInfo?.model_family || device.model || device.name

  // High-visibility status LED
  const getStatusLed = () => {
    switch (status) {
      case 'critical':
        return (
          <span
            className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)] animate-pulse shrink-0 ring-1 ring-white/50"
            title="Zabbix: Critical Trigger"
          />
        )
      case 'warning':
        return (
          <span
            className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.95)] animate-pulse shrink-0 ring-1 ring-white/40"
            title="Zabbix: Warning Trigger"
          />
        )
      case 'ok':
      default:
        return (
          <span
            className="w-2 h-2 rounded-full bg-[#7aa5d2] shadow-[0_0_6px_rgba(122,165,210,0.8)] shrink-0"
            title="Zabbix: Nominal"
          />
        )
    }
  }

  // Render specific faceplate based on device type & brand
  const renderFaceplate = () => {
    switch (device.device_type) {
      case 'Patch Panel':
        return (
          <div className="w-full h-full bg-[#1f252b] border-y border-[#343e47] px-2.5 flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 z-10">
              <BrandPillBadge brandInfo={brandInfo} fallback="COMMSCOPE" />
              <span className="text-[10px] font-mono font-bold text-[#caedde] tracking-tight truncate max-w-[130px]">
                {device.name}
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-2xs bg-[#14191d] border border-[#394650] text-[7.5px] font-mono text-[#85a6b1] font-semibold">
                CAT6A 24-PORT GIGABIT
              </span>
            </div>
            {/* RJ45 Port array */}
            <div className="flex gap-0.5 shrink-0 z-10">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-4 bg-[#121619] border border-[#3b4752] rounded-[1px] flex flex-col items-center justify-center shadow-inner"
                  title={`RJ45 Keystone Port ${i + 1}`}
                >
                  <div className="w-1.5 h-1.5 bg-[#414d57] rounded-3xs" />
                  <span className="w-0.5 h-0.5 bg-[#8bd7d1] mt-0.5 shadow-2xs" />
                </div>
              ))}
            </div>
          </div>
        )

      case 'Switch': {
        const isHuawei = brandName.includes('huawei')
        const isCisco = brandName.includes('cisco')
        return (
          <div className="w-full h-full bg-[#222c33] border-y border-[#384550] px-2.5 flex items-center justify-between relative overflow-hidden">
            {/* Subtle ventilation line pattern */}
            <div className="absolute inset-y-0 right-32 w-12 opacity-15 pointer-events-none flex gap-1 items-center">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-0.5 h-4 bg-[#caedde] rounded-full" />
              ))}
            </div>

            <div className="flex items-center gap-2 min-w-0 z-10">
              {getStatusLed()}
              <BrandPillBadge brandInfo={brandInfo} fallback={isHuawei ? 'HUAWEI' : isCisco ? 'CISCO' : 'SWITCH'} />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono font-black text-white tracking-tight truncate max-w-[110px]">
                    {device.name}
                  </span>
                  <span
                    className="px-1.5 py-0.2 rounded-[2px] bg-[#14181c] border text-[8px] font-mono font-black tracking-tight truncate max-w-[130px] shadow-xs"
                    style={{
                      borderColor: brandColor ? `${brandColor}55` : '#414a50',
                      color: brandColor || '#8bd7d1',
                    }}
                  >
                    {modelDisplayName}
                  </span>
                  {status === 'warning' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  {status === 'critical' && (
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-bounce" />
                  )}
                </div>
                {device.height_u >= 2 && (
                  <div className="text-[8.5px] font-mono text-[#85a6b1] truncate max-w-[190px] flex items-center gap-1.5">
                    <span className="text-[#caedde] font-semibold">{device.model || modelDisplayName}</span>
                    <span className="text-[#50626f]">•</span>
                    <span>{device.manufacturer || brandInfo?.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Switch Ports */}
            <div className="z-10">
              <RealisticSwitchPortArray
                portCount={device.height_u >= 2 ? 16 : 10}
                brandColor={brandColor}
                isHuawei={isHuawei}
                heightU={device.height_u}
              />
            </div>
          </div>
        )
      }

      case 'Firewall': {
        const isFortinet = brandName.includes('fortinet')
        const isPaloAlto = brandName.includes('palo alto') || brandName.includes('pan')
        return (
          <div className="w-full h-full bg-[#281a22] border-y border-[#472737] px-2.5 flex items-center justify-between relative overflow-hidden">
            {/* Ventilation Slits */}
            <div className="absolute inset-y-0 right-28 w-16 opacity-20 pointer-events-none flex gap-1 items-center">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-0.5 h-3.5 bg-rose-400 rounded-full" />
              ))}
            </div>

            <div className="flex items-center gap-2 min-w-0 z-10">
              {getStatusLed()}
              <BrandPillBadge brandInfo={brandInfo} fallback={isFortinet ? 'FORTINET' : isPaloAlto ? 'PALO ALTO' : 'SECURITY'} />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono font-black text-white tracking-tight truncate max-w-[110px]">
                    {device.name}
                  </span>
                  <span
                    className="px-1.5 py-0.2 rounded-[2px] bg-[#160f13] border text-[8px] font-mono font-black tracking-tight truncate max-w-[130px] shadow-xs"
                    style={{
                      borderColor: brandColor ? `${brandColor}66` : '#9f1239',
                      color: brandColor || '#f43f5e',
                    }}
                  >
                    {modelDisplayName}
                  </span>
                  {status === 'warning' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  {status === 'critical' && (
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-bounce" />
                  )}
                </div>
                {device.height_u >= 2 && (
                  <div className="text-[8.5px] font-mono text-rose-300/80 truncate max-w-[190px]">
                    {device.model || modelDisplayName} • {device.manufacturer || brandInfo?.name}
                  </div>
                )}
              </div>
            </div>

            {/* Firewall Security Faceplate Cluster */}
            <div className="flex gap-1.5 items-center shrink-0 z-10">
              <div className="flex gap-0.5">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3.5 bg-[#170e13] border border-rose-900/80 rounded-[1px] flex flex-col items-center justify-between p-0.5 shadow-inner"
                    title={`Security Port GE${i + 1}`}
                  >
                    <span className="w-1 h-1 bg-rose-500 rounded-full shadow-[0_0_4px_rgba(244,63,94,0.9)]" />
                    <span className="w-1.5 h-0.5 bg-rose-950" />
                  </div>
                ))}
              </div>
              <span className="text-[7px] font-mono text-rose-300 font-black px-1.5 py-0.5 bg-rose-950/90 border border-rose-800 rounded-[1px] shadow-xs flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-rose-400" />
                HA:OK
              </span>
            </div>
          </div>
        )
      }

      case 'Storage': {
        const isDell = brandName.includes('dell')
        return (
          <div className="w-full h-full bg-[#1c242a] border-y border-[#323f48] px-2.5 flex items-center justify-between relative overflow-hidden">
            {/* Dell Honeycomb Background if Dell Storage */}
            {isDell && <DellHoneycombMesh opacity={0.18} />}

            <div className="flex items-center gap-2 min-w-0 z-10">
              {getStatusLed()}
              <BrandPillBadge brandInfo={brandInfo} fallback="DELL EMC" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono font-black text-white tracking-tight truncate max-w-[110px]">
                    {device.name}
                  </span>
                  <span
                    className="px-1.5 py-0.2 rounded-[2px] bg-[#12171b] border text-[8px] font-mono font-black tracking-tight truncate max-w-[130px] shadow-xs"
                    style={{
                      borderColor: brandColor ? `${brandColor}55` : '#38bdf8',
                      color: brandColor || '#38bdf8',
                    }}
                  >
                    {modelDisplayName}
                  </span>
                  {status === 'warning' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  {status === 'critical' && (
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-bounce" />
                  )}
                </div>
                {device.height_u >= 2 && (
                  <div className="text-[8.5px] font-mono text-[#85a6b1] truncate max-w-[190px]">
                    {device.model || modelDisplayName} • {device.manufacturer || brandInfo?.name}
                  </div>
                )}
              </div>
            </div>

            {/* Storage Drive Bays */}
            <div className="z-10">
              <RealisticDriveCaddyArray
                count={device.height_u >= 2 ? 10 : 6}
                brandColor="#38bdf8"
                heightU={device.height_u}
              />
            </div>
          </div>
        )
      }

      case 'UPS':
        return (
          <div className="w-full h-full bg-[#1b2520] border-y border-[#2f4236] px-2.5 flex items-center justify-between relative overflow-hidden">
            {/* Heavy-Duty Industrial Louvers */}
            <div className="absolute inset-y-0 left-48 right-32 opacity-25 pointer-events-none flex flex-col justify-around py-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-full h-0.5 bg-teal-300 rounded-full" />
              ))}
            </div>

            <div className="flex items-center gap-2 min-w-0 z-10">
              <BrandPillBadge brandInfo={brandInfo} fallback="APC" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono font-black text-[#caedde] tracking-tight truncate max-w-[120px]">
                    {device.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-[2px] bg-[#0f1712] border border-teal-600/70 text-[8px] font-mono font-black text-teal-300 truncate max-w-[130px] shadow-xs">
                    {modelDisplayName}
                  </span>
                </div>
                {device.height_u >= 2 && (
                  <div className="text-[8.5px] font-mono text-teal-300/80 truncate max-w-[180px] flex items-center gap-1.5">
                    <span>Online 10kVA 2N</span>
                    <span className="text-teal-700">•</span>
                    <span>Schneider Electric</span>
                  </div>
                )}
              </div>
            </div>

            {/* UPS LCD Display */}
            <div className="z-10">
              <RealisticApcLcdDisplay heightU={device.height_u} />
            </div>
          </div>
        )

      case 'Server':
      default: {
        const isDell = brandName.includes('dell')
        const isHpe = brandName.includes('hpe') || brandName.includes('hewlett')
        const isCisco = brandName.includes('cisco')
        const isSupermicro = brandName.includes('supermicro')

        return (
          <div className="w-full h-full bg-[#212930] border-y border-[#36434d] px-2.5 flex items-center justify-between relative overflow-hidden">
            {/* Signature Texture Overlays */}
            {isDell && <DellHoneycombMesh opacity={0.24} />}

            <div className="flex items-center gap-2 min-w-0 z-10">
              {getStatusLed()}

              {/* HPE ProLiant Iconic Green Accent Stripe */}
              {isHpe && <HpeProLiantAccent heightU={device.height_u} />}

              {/* Signature Brand Pill Badge */}
              <BrandPillBadge
                brandInfo={brandInfo}
                fallback={isDell ? 'DELL EMC' : isHpe ? 'HPE' : isCisco ? 'CISCO' : isSupermicro ? 'SUPERMICRO' : 'SERVER'}
              />

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono font-black text-white tracking-tight truncate max-w-[110px]">
                    {device.name}
                  </span>
                  <span
                    className="px-1.5 py-0.2 rounded-[2px] bg-[#13181d] border text-[8px] font-mono font-black tracking-tight truncate max-w-[130px] shadow-xs"
                    style={{
                      borderColor: brandColor ? `${brandColor}66` : '#50626f',
                      color: brandColor || '#8bd7d1',
                    }}
                  >
                    {modelDisplayName}
                  </span>
                  {status === 'warning' && (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  )}
                  {status === 'critical' && (
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0 animate-bounce" />
                  )}
                </div>
                {device.height_u >= 2 && (
                  <div className="text-[8.5px] font-mono text-[#85a6b1] truncate max-w-[190px] flex items-center gap-1.5">
                    <span className="text-[#caedde] font-semibold">
                      {device.model || modelDisplayName}
                    </span>
                    <span className="text-[#50626f]">•</span>
                    <span>{device.manufacturer || brandInfo?.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Server Drive Caddies with Hot-Swap Activity */}
            <div className="z-10">
              <RealisticDriveCaddyArray
                count={device.height_u >= 2 ? 8 : 4}
                brandColor={brandColor}
                heightU={device.height_u}
              />
            </div>
          </div>
        )
      }
    }
  }

  // Hybrid Alert Overlay Classes
  const alertOverlayClass =
    status === 'critical'
      ? 'ring-1 ring-rose-500/90 shadow-[inset_0_0_12px_rgba(244,63,94,0.4)]'
      : status === 'warning'
        ? 'ring-1 ring-amber-500/80 shadow-[inset_0_0_8px_rgba(245,158,11,0.3)]'
        : ''

  return (
    <div
      onClick={onClick}
      style={{
        height: `${heightPx}px`,
        borderLeftColor: brandColor,
        borderLeftWidth: '3.5px',
        borderLeftStyle: 'solid',
      }}
      className={`relative w-full cursor-pointer select-none transition-all ${
        isSelected
          ? 'outline outline-2 outline-[#7aa5d2] -outline-offset-1 z-20 brightness-115 shadow-lg'
          : 'hover:brightness-110'
      } ${alertOverlayClass} ${
        isDimmed ? 'opacity-25 grayscale hover:opacity-80 transition-opacity' : ''
      }`}
    >
      {renderFaceplate()}
    </div>
  )
}
