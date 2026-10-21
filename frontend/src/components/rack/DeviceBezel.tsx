import { AlertTriangle, AlertOctagon, Shield, Zap, Radio, Terminal } from 'lucide-react'
import type { Device, BrandInfo } from '../../types'

export interface DeviceBezelProps {
  device: Device
  isSelected: boolean
  onClick: () => void
  isDimmed?: boolean
  face?: 'Front' | 'Rear'
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
 * HPE ProLiant Signature Emerald Green Bezel Stripe & UID LED
 */
function HpeProLiantAccent({ heightU }: { heightU: number }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <div
        className="w-1.5 rounded-xs bg-[#01a982] shadow-[0_0_8px_rgba(1,169,130,0.8)]"
        style={{ height: heightU >= 2 ? '28px' : '16px' }}
      />
      <div
        className="w-3.5 h-3.5 border border-[#01a982] bg-[#0d2b24] rounded-[1px] flex items-center justify-center shadow-[0_0_6px_rgba(1,169,130,0.4)] cursor-pointer"
        title="HPE UID (Unit ID) Blue/Green LED"
      >
        <span className="w-1.5 h-1.5 bg-[#01a982] rounded-xs animate-pulse" />
      </div>
    </div>
  )
}

/**
 * Realistic Drive Caddy Array with Activity LEDs (Front Chassis)
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
              animationDuration: `${0.8 + ((i * 0.3) % 1.5)}s`,
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
              className="w-1 h-1 rounded-full shadow-xs animate-pulse"
              style={{
                backgroundColor: i % 4 === 0 ? '#34d399' : (isHuawei ? '#f43f5e' : brandColor),
                animationDuration: `${0.6 + ((i * 0.25) % 1.2)}s`,
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
 * APC Digital LCD Power Readout (Front Chassis)
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

/**
 * Photorealistic Dual Hot-Swap PSUs for Rear Server Chassis
 */
function RearPsuCluster({ isSingleCorded = false, heightU = 1 }: { isSingleCorded?: boolean; heightU: number }) {
  const is2U = heightU >= 2
  return (
    <div className="flex items-center gap-1 bg-[#12161a] border border-[#2d3740] rounded-[2px] px-1 py-0.5 shadow-inner shrink-0">
      {/* PSU 1 (Feed A - Active Primary) */}
      <div
        className={`bg-[#182026] border border-[#394650] rounded-[1px] p-1 flex flex-col justify-between ${
          is2U ? 'w-9 h-11' : 'w-8 h-5.5'
        }`}
        title="PSU-1: 800W Platinum (Feed A) - ONLINE AC OK"
      >
        <div className="flex items-center justify-between">
          <span className="text-[6px] font-mono font-bold text-sky-400">P1</span>
          <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]" />
        </div>
        {/* C14 Inlet Socket Prongs */}
        <div className="w-full flex items-center justify-center my-0.5">
          <div className="w-3.5 h-2 bg-[#0d1114] border border-[#2a343d] rounded-2xs flex items-center justify-around px-0.5">
            <span className="w-0.5 h-1 bg-[#71808d] rounded-3xs" />
            <span className="w-0.5 h-1 bg-[#71808d] rounded-3xs" />
            <span className="w-0.5 h-0.5 bg-[#71808d] rounded-3xs" />
          </div>
        </div>
        <div className="w-full h-0.5 bg-sky-500/80 rounded-3xs" title="Feed A PDU Cable" />
      </div>

      {/* PSU 2 (Feed B - Redundant Secondary or Single-Corded Warning) */}
      <div
        className={`bg-[#182026] border rounded-[1px] p-1 flex flex-col justify-between ${
          isSingleCorded ? 'border-amber-500/60 bg-amber-950/20' : 'border-[#394650]'
        } ${is2U ? 'w-9 h-11' : 'w-8 h-5.5'}`}
        title={
          isSingleCorded
            ? 'PSU-2: UNPLUGGED - Single-Corded Power Risk!'
            : 'PSU-2: 800W Platinum (Feed B) - STANDBY NOMINAL'
        }
      >
        <div className="flex items-center justify-between">
          <span className={`text-[6px] font-mono font-bold ${isSingleCorded ? 'text-amber-400' : 'text-rose-400'}`}>
            P2
          </span>
          <span
            className={`w-1 h-1 rounded-full ${
              isSingleCorded
                ? 'bg-amber-400 shadow-[0_0_4px_#f59e0b] animate-ping'
                : 'bg-emerald-400 shadow-[0_0_4px_#10b981]'
            }`}
          />
        </div>
        {/* C14 Inlet Socket Prongs */}
        <div className="w-full flex items-center justify-center my-0.5">
          <div className="w-3.5 h-2 bg-[#0d1114] border border-[#2a343d] rounded-2xs flex items-center justify-around px-0.5">
            <span className="w-0.5 h-1 bg-[#71808d] rounded-3xs" />
            <span className="w-0.5 h-1 bg-[#71808d] rounded-3xs" />
            <span className="w-0.5 h-0.5 bg-[#71808d] rounded-3xs" />
          </div>
        </div>
        <div
          className={`w-full h-0.5 rounded-3xs ${
            isSingleCorded ? 'bg-amber-500 animate-pulse' : 'bg-rose-500/80'
          }`}
          title={isSingleCorded ? 'Missing Feed B Cord' : 'Feed B PDU Cable'}
        />
      </div>
    </div>
  )
}

/**
 * Photorealistic Rear PCIe Riser & Optical Port Bank
 */
function RearPcieExpansionBank({ heightU = 1 }: { heightU: number }) {
  const is2U = heightU >= 2
  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Dual SFP28/SFP+ 10/25GbE Optical Ports */}
      <div className="flex flex-col gap-0.5 bg-[#14191d] border border-[#34404a] p-1 rounded-[1px]">
        <div className="flex items-center gap-1">
          <span className="text-[6px] font-mono text-[#85a6b1]">NIC-1</span>
          <span className="w-1 h-1 rounded-full bg-[#10b981] animate-pulse" />
        </div>
        <div className="flex gap-0.5">
          <div className="w-3 h-2.5 bg-[#0e1317] border border-cyan-700/70 rounded-3xs flex items-center justify-center">
            <span className="w-1.5 h-1 bg-cyan-400/80 rounded-3xs" />
          </div>
          <div className="w-3 h-2.5 bg-[#0e1317] border border-cyan-700/70 rounded-3xs flex items-center justify-center">
            <span className="w-1.5 h-1 bg-cyan-400/80 rounded-3xs" />
          </div>
        </div>
      </div>

      {/* Vented Hex Cooling Exhaust Slots */}
      <div
        className={`flex flex-col justify-around bg-[#101418] border border-[#2b353d] px-1 py-0.5 rounded-[1px] opacity-70 ${
          is2U ? 'h-11 w-10' : 'h-5.5 w-8'
        }`}
      >
        {[...Array(is2U ? 4 : 2)].map((_, i) => (
          <div key={i} className="w-full h-0.5 bg-[#3a4752] rounded-full" />
        ))}
      </div>
    </div>
  )
}

/**
 * Out-of-Band Management & LOM RJ45 Ports (Rear)
 */
function RearOobMgmtBlock() {
  return (
    <div className="flex items-center gap-1 bg-[#13191d] border border-[#323d47] px-1 py-0.5 rounded-[1px] shrink-0">
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-0.5 text-[6px] font-mono text-emerald-400">
          <Terminal className="w-2 h-2" />
          <span>OOB</span>
        </div>
        <div
          className="w-3 h-3 bg-[#0a0d10] border border-emerald-600/60 rounded-3xs flex items-center justify-center mt-0.5"
          title="Dedicated 1GbE iDRAC / iLO Management Port"
        >
          <span className="w-1 h-1 bg-emerald-400 rounded-3xs animate-ping" />
        </div>
      </div>
    </div>
  )
}

export function DeviceBezel({
  device,
  isSelected,
  onClick,
  isDimmed = false,
  face = 'Front',
}: DeviceBezelProps) {
  const heightPx = device.height_u * 28 // 28px standard per 1U
  const status = device.zabbix_status?.status || 'ok'
  const brandInfo = device.brand_info
  const brandColor = brandInfo?.color || '#50626f'
  const brandName = (brandInfo?.name || device.manufacturer || '').toLowerCase()
  const modelDisplayName = brandInfo?.model_family || device.model || device.name

  // Detect single-corded risk (e.g. tag or name match for redundancy test)
  const isSingleCorded =
    device.name.includes('A01-U24') ||
    device.tags?.single_corded === true ||
    device.custom_fields?.redundancy === 'Single'

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
            className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.8)] shrink-0"
            title="Zabbix: Nominal"
          />
        )
    }
  }

  // Render Photorealistic REAR Chassis
  const renderRearFaceplate = () => {
    switch (device.device_type) {
      case 'Patch Panel':
        return (
          <div className="w-full h-full bg-[#181e23] border-y border-[#2d3740] px-2.5 flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 z-10">
              <span className="px-1.5 py-0.5 rounded-[2px] bg-[#101418] border border-[#3b4752] text-[7.5px] font-mono text-[#85a6b1] font-bold">
                REAR IDC PUNCH-DOWN
              </span>
              <span className="text-[9.5px] font-mono text-[#caedde] font-semibold truncate max-w-[120px]">
                {device.name}
              </span>
            </div>
            {/* Rear 110 Punch-down Wire Termination Pairs */}
            <div className="flex gap-1 shrink-0 z-10">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4.5 bg-[#0f1316] border border-[#303c46] rounded-2xs flex flex-col justify-around px-0.5"
                  title={`Block ${i + 1}: 4-Pair T568B Structured Cabling`}
                >
                  <div className="flex justify-between">
                    <span className="w-1 h-0.5 bg-blue-400 rounded-3xs" />
                    <span className="w-1 h-0.5 bg-orange-400 rounded-3xs" />
                  </div>
                  <div className="flex justify-between">
                    <span className="w-1 h-0.5 bg-emerald-400 rounded-3xs" />
                    <span className="w-1 h-0.5 bg-amber-600 rounded-3xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'Switch': {
        const isHuawei = brandName.includes('huawei')
        return (
          <div className="w-full h-full bg-[#1c2329] border-y border-[#323d47] px-2 flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 z-10">
              {getStatusLed()}
              <BrandPillBadge brandInfo={brandInfo} fallback={isHuawei ? 'HUAWEI' : 'SWITCH'} />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono font-black text-white tracking-tight truncate max-w-[100px]">
                    {device.name}
                  </span>
                  <span className="px-1 py-0.2 rounded-[2px] bg-[#12161a] border border-[#3a4753] text-[7.5px] font-mono text-[#85a6b1]">
                    REAR I/O
                  </span>
                </div>
              </div>
            </div>

            {/* Rear Switch Components: Dual Fan Trays + Dual Modular PSUs + MGMT */}
            <div className="flex items-center gap-2 z-10 shrink-0">
              {/* Dual Fan Module Assemblies */}
              <div className="flex gap-0.5 bg-[#12161a] border border-[#2d3740] p-0.5 rounded-[1px]">
                <div
                  className="w-3.5 h-5 bg-[#182026] border border-[#394650] rounded-2xs flex flex-col items-center justify-between p-0.5"
                  title="FAN-1: 14,000 RPM Nominal"
                >
                  <Radio className="w-2 h-2 text-cyan-400 animate-spin" />
                  <span className="w-1 h-0.5 bg-cyan-400" />
                </div>
                <div
                  className="w-3.5 h-5 bg-[#182026] border border-[#394650] rounded-2xs flex flex-col items-center justify-between p-0.5"
                  title="FAN-2: 14,000 RPM Nominal"
                >
                  <Radio className="w-2 h-2 text-cyan-400 animate-spin" />
                  <span className="w-1 h-0.5 bg-cyan-400" />
                </div>
              </div>

              {/* Rear Hot-Swap Dual PSUs */}
              <RearPsuCluster isSingleCorded={isSingleCorded} heightU={device.height_u} />

              {/* Console & Out-of-band MGMT */}
              <RearOobMgmtBlock />
            </div>
          </div>
        )
      }

      case 'Firewall':
        return (
          <div className="w-full h-full bg-[#24171e] border-y border-[#3d2331] px-2 flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 z-10">
              {getStatusLed()}
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-mono font-black text-rose-100 tracking-tight truncate max-w-[110px]">
                  {device.name}
                </span>
                <span className="text-[7.5px] font-mono text-rose-400/80">REAR HA / POWER</span>
              </div>
            </div>

            <div className="flex items-center gap-2 z-10 shrink-0">
              {/* Dedicated HA1 & HA2 Heartbeat SFP+ Ports */}
              <div className="flex gap-1 bg-[#180e14] border border-rose-900/60 p-1 rounded-[1px]">
                <div className="flex flex-col items-center">
                  <span className="text-[6px] font-mono text-rose-300">HA-1</span>
                  <div className="w-3 h-2.5 bg-[#10090d] border border-rose-700/80 rounded-3xs flex items-center justify-center">
                    <span className="w-1 h-1 bg-rose-400 rounded-full animate-ping" />
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[6px] font-mono text-rose-300">HA-2</span>
                  <div className="w-3 h-2.5 bg-[#10090d] border border-rose-700/80 rounded-3xs flex items-center justify-center">
                    <span className="w-1 h-1 bg-rose-400 rounded-full" />
                  </div>
                </div>
              </div>

              <RearPsuCluster isSingleCorded={isSingleCorded} heightU={device.height_u} />
            </div>
          </div>
        )

      case 'UPS':
        return (
          <div className="w-full h-full bg-[#17211b] border-y border-[#2a3a30] px-2 flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 z-10">
              <span className="px-1.5 py-0.5 rounded-[2px] bg-[#0d1410] border border-teal-600/70 text-[7.5px] font-mono font-black text-teal-300">
                UPS REAR DISTRIBUTION
              </span>
              <span className="text-[10px] font-mono font-bold text-[#caedde] truncate max-w-[120px]">
                {device.name}
              </span>
            </div>

            {/* Rear Outlet Banks & NMC3 Card */}
            <div className="flex items-center gap-2 z-10 shrink-0">
              {/* C13 / C19 Outlets Bank */}
              <div className="flex gap-1 bg-[#0f1612] border border-teal-800/80 p-1 rounded-[1px]">
                <div className="flex flex-col items-center">
                  <span className="text-[6px] font-mono text-teal-300">BANK 1 (C13)</span>
                  <div className="flex gap-0.5 mt-0.5">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-2.5 h-3 bg-[#16221c] border border-teal-700/60 rounded-3xs" />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[6px] font-mono text-teal-300">BANK 2 (C19)</span>
                  <div className="flex gap-0.5 mt-0.5">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="w-3 h-3 bg-[#16221c] border border-teal-700/60 rounded-3xs" />
                    ))}
                  </div>
                </div>
              </div>

              {/* NMC3 Network Management Card */}
              <div className="bg-[#0f1612] border border-teal-600/70 p-1 rounded-[1px] flex flex-col items-center">
                <span className="text-[6px] font-mono text-teal-300 font-bold">NMC3</span>
                <div className="w-3.5 h-3 bg-[#15231c] border border-teal-500 rounded-3xs flex items-center justify-center mt-0.5">
                  <span className="w-1 h-1 bg-teal-300 rounded-3xs animate-ping" />
                </div>
              </div>
            </div>
          </div>
        )

      case 'Server':
      default:
        return (
          <div className="w-full h-full bg-[#1a2127] border-y border-[#2f3b45] px-2 flex items-center justify-between relative overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 z-10">
              {getStatusLed()}
              <BrandPillBadge brandInfo={brandInfo} fallback="SERVER" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-mono font-black text-white tracking-tight truncate max-w-[110px]">
                    {device.name}
                  </span>
                  <span className="text-[8px] font-mono text-[#85a6b1] truncate">
                    {modelDisplayName}
                  </span>
                  {isSingleCorded && (
                    <span
                      className="px-1 py-0.2 rounded-[2px] bg-amber-500/20 border border-amber-500/80 text-[7px] font-mono text-amber-300 font-bold animate-pulse flex items-center gap-0.5"
                      title="Single-corded power supply hazard! Feed B unpowered."
                    >
                      <Zap className="w-2 h-2 text-amber-400" />
                      1x PSU
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rear Chassis Clusters: Dual PSUs + PCIe Risers + OOB MGMT */}
            <div className="flex items-center gap-2 z-10 shrink-0">
              <RearPsuCluster isSingleCorded={isSingleCorded} heightU={device.height_u} />
              <RearPcieExpansionBank heightU={device.height_u} />
              <RearOobMgmtBlock />
            </div>
          </div>
        )
    }
  }

  // Render Photorealistic FRONT Chassis
  const renderFrontFaceplate = () => {
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
            {/* Ventilation slits pattern */}
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
            {/* Industrial Louvers */}
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
            {isDell && <DellHoneycombMesh opacity={0.24} />}

            <div className="flex items-center gap-2 min-w-0 z-10">
              {getStatusLed()}

              {isHpe && <HpeProLiantAccent heightU={device.height_u} />}

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
      {face === 'Rear' ? renderRearFaceplate() : renderFrontFaceplate()}
    </div>
  )
}
