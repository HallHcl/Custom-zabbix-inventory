import { useState } from 'react'
import {
  Layers,
  Zap,
  HardDrive,
  Cpu,
  Shield,
  Wifi,
  Eye,
  Server,
  Box,
} from 'lucide-react'
import type { ChassisSpecs, BrandInfo } from '../../types'
import { useTheme } from '../../lib/theme'

interface ChassisVisualCardProps {
  deviceType: string
  model?: string
  manufacturer?: string
  heightU: number
  chassisSpecs?: ChassisSpecs
  brandInfo?: BrandInfo | null
}

export function ChassisVisualCard({
  deviceType,
  model,
  manufacturer,
  heightU,
  chassisSpecs,
  brandInfo,
}: ChassisVisualCardProps) {
  const { isTeslaDark } = useTheme()
  const [viewFace, setViewFace] = useState<'front' | 'rear'>('front')

  const brand = brandInfo?.name || chassisSpecs?.brand || manufacturer || 'Enterprise Hardware'
  const brandTag = brandInfo?.tag || brand.toUpperCase()
  const modelName = brandInfo?.model_family || chassisSpecs?.model_family || model || `${deviceType} Appliance`
  const formFactor = chassisSpecs?.form_factor || `${heightU}U Standard Rackmount`
  const brandColor = brandInfo?.color || '#8bd7d1'

  // Render Realistic Front Bezel Visual
  const renderFrontChassis = () => {
    switch (chassisSpecs?.chassis_class) {
      case 'switch_core':
        return (
          <div
            className={`w-full border rounded-[10px] p-3 space-y-3 font-mono transition-colors ${
              isTeslaDark
                ? 'bg-[#141414] border-[#1F1F1F]'
                : 'bg-gradient-to-b from-[#F9F9FB] to-[#ECECEE] border-black/15 shadow-xs'
            }`}
          >
            {/* Switch Front Bezel */}
            <div className={`flex items-center justify-between border-b pb-2 ${isTeslaDark ? 'border-[#222222]' : 'border-black/10'}`}>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-[4px] border text-[9.5px] font-bold shadow-xs tracking-wider uppercase"
                  style={{
                    backgroundColor: isTeslaDark ? (brandInfo?.bg_color || '#1A1A1A') : '#FFFFFF',
                    borderColor: isTeslaDark ? (brandColor ? `${brandColor}66` : '#333333') : 'rgba(0,0,0,0.12)',
                    color: isTeslaDark ? (brandColor || '#3E6AE1') : '#0071E3',
                    boxShadow: isTeslaDark && brandInfo?.glow_color ? `0 0 6px ${brandInfo.glow_color}` : undefined,
                  }}
                >
                  {brandTag}
                </span>
                <span className={`text-xs font-bold tracking-wide ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  {modelName}
                </span>
              </div>
              <div className={`flex items-center gap-2 text-[10px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-600'}`}>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] shadow-[0_0_6px_#00C853]" />
                  SYS OK
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
                  PWR DUAL
                </span>
              </div>
            </div>

            {/* 48-Port SFP28/RJ45 Matrix */}
            <div
              className={`border p-2 rounded-[8px] ${
                isTeslaDark ? 'bg-[#0D0D0D] border-[#1F1F1F]' : 'bg-white/90 border-black/10 shadow-inner'
              }`}
            >
              <div className={`text-[9px] mb-1.5 flex justify-between font-semibold ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>
                <span>PORT ARRAY 1-48 (10/25GE SFP28)</span>
                <span className={isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}>8x 100GE QSFP28 UPLINKS</span>
              </div>
              <div className="grid grid-cols-12 sm:grid-cols-24 gap-1">
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-0.5 p-1 border rounded-[4px] ${
                      isTeslaDark ? 'bg-[#161616] border-[#222222]' : 'bg-[#F2F2F5] border-black/10'
                    }`}
                  >
                    <span className="w-1 h-1 rounded-full bg-[#00C853]" />
                    <div className={`w-3 h-2 rounded-[2px] border ${isTeslaDark ? 'bg-[#222222] border-[#333333]' : 'bg-white border-black/15'}`} />
                    <span className={`text-[7px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'firewall_ngfw':
        return (
          <div
            className={`w-full border rounded-[10px] p-3 space-y-3 font-mono transition-colors ${
              isTeslaDark
                ? 'bg-[#181214] border-rose-950/60'
                : 'bg-gradient-to-b from-[#FFF5F5] to-[#FCE8E8] border-rose-200 shadow-xs'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-2 ${isTeslaDark ? 'border-rose-950/80' : 'border-rose-200'}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded-[4px] border text-[10px] font-bold ${
                    isTeslaDark
                      ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                      : 'bg-white border-rose-300 text-rose-700 shadow-2xs'
                  }`}
                >
                  FORTINET
                </span>
                <span className={`text-xs font-bold tracking-wide ${isTeslaDark ? 'text-rose-100' : 'text-[#1d1d1f]'}`}>
                  {modelName}
                </span>
              </div>
              <div className={`flex items-center gap-2 text-[10px] ${isTeslaDark ? 'text-rose-300' : 'text-rose-700 font-medium'}`}>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
                  HA SYNC
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  SEC ENGINE ACTIVE
                </span>
              </div>
            </div>

            <div
              className={`border p-2.5 rounded-[8px] flex items-center justify-between ${
                isTeslaDark ? 'bg-[#100B0D] border-rose-950/80' : 'bg-white/90 border-rose-200 shadow-inner'
              }`}
            >
              <div className="flex gap-1.5">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center p-1 border rounded-[4px] ${
                      isTeslaDark ? 'bg-[#1C1216] border-rose-950' : 'bg-[#FFF0F0] border-rose-200'
                    }`}
                  >
                    <span className="w-1 h-1 rounded-full bg-rose-500 mb-0.5" />
                    <div className={`w-3.5 h-2.5 rounded-[2px] border ${isTeslaDark ? 'bg-[#140D10] border-rose-900' : 'bg-white border-rose-300'}`} />
                    <span className={`text-[7px] ${isTeslaDark ? 'text-rose-400/80' : 'text-rose-600'}`}>SFP{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="text-right">
                <span className={`text-[9px] block ${isTeslaDark ? 'text-rose-300' : 'text-zinc-500'}`}>
                  ASIC NP7/CP9 Accelerated
                </span>
                <span className={`text-[10px] font-bold ${isTeslaDark ? 'text-white' : 'text-rose-800'}`}>
                  400 Gbps Firewall Throughput
                </span>
              </div>
            </div>
          </div>
        )

      case 'ups_modular':
        return (
          <div
            className={`w-full border rounded-[10px] p-3 space-y-3 font-mono transition-colors ${
              isTeslaDark
                ? 'bg-[#141414] border-[#1F1F1F]'
                : 'bg-gradient-to-b from-[#F9F9FB] to-[#ECECEE] border-black/15 shadow-xs'
            }`}
          >
            <div className={`flex items-center justify-between border-b pb-2 ${isTeslaDark ? 'border-[#222222]' : 'border-black/10'}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded-[4px] border text-[10px] font-bold ${
                    isTeslaDark
                      ? 'bg-[#1C1C1E] border-[#2E2E2E] text-white'
                      : 'bg-white border-black/10 text-[#1d1d1f] shadow-2xs'
                  }`}
                >
                  SCHNEIDER / APC
                </span>
                <span className={`text-xs font-bold tracking-wide ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  {modelName}
                </span>
              </div>
              <span
                className={`px-1.5 py-0.5 text-[9px] rounded-[4px] border font-bold ${
                  isTeslaDark
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                ON-LINE DOUBLE CONVERSION
              </span>
            </div>

            {/* Modular Battery Slots & LCD Display */}
            <div
              className={`grid grid-cols-4 gap-2 p-2 rounded-[8px] border ${
                isTeslaDark ? 'bg-[#0D0D0D] border-[#1F1F1F]' : 'bg-white/90 border-black/10 shadow-inner'
              }`}
            >
              {/* LCD Display */}
              <div
                className={`col-span-1 p-2 rounded-[6px] border flex flex-col justify-between text-[8px] ${
                  isTeslaDark
                    ? 'bg-[#161616] border-[#3E6AE1]/40 text-[#3E6AE1]'
                    : 'bg-sky-50/80 border-sky-200 text-sky-800'
                }`}
              >
                <div>
                  <div className={`text-[7px] uppercase font-semibold ${isTeslaDark ? 'text-[#8E8E93]' : 'text-sky-600'}`}>
                    NMC3 STATUS
                  </div>
                  <div className={`font-bold text-[10px] ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                    230V / 50Hz
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[7px] mb-0.5">
                    <span>LOAD</span>
                    <span className="font-bold">45%</span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isTeslaDark ? 'bg-[#222222]' : 'bg-sky-200'}`}>
                    <div className={`w-9/20 h-full ${isTeslaDark ? 'bg-[#3E6AE1]' : 'bg-[#0071E3]'}`} />
                  </div>
                </div>
              </div>

              {/* Battery Packs */}
              <div className="col-span-3 grid grid-cols-3 gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`p-1.5 border rounded-[6px] flex flex-col justify-between ${
                      isTeslaDark ? 'bg-[#161616] border-[#222222]' : 'bg-[#F5F5F7] border-black/10'
                    }`}
                  >
                    <div className={`flex justify-between items-center text-[7px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>
                      <span className="font-semibold">BAT-PACK #{i + 1}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] shadow-[0_0_4px_#00C853]" />
                    </div>
                    <div
                      className={`h-6 rounded-[4px] border flex items-center justify-center text-[8px] font-bold ${
                        isTeslaDark
                          ? 'bg-[#0D0D0D] border-[#222222] text-[#A1A1A6]'
                          : 'bg-white border-black/10 text-zinc-700 shadow-2xs'
                      }`}
                    >
                      HOT-SWAP
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'dell_poweredge_2u':
      default:
        return (
          <div
            className={`w-full border rounded-[10px] p-3 space-y-3 font-mono transition-colors ${
              isTeslaDark
                ? 'bg-[#141414] border-[#1F1F1F]'
                : 'bg-gradient-to-b from-[#F9F9FB] to-[#ECECEE] border-black/15 shadow-xs'
            }`}
          >
            {/* Server Front Bezel Header */}
            <div className={`flex items-center justify-between border-b pb-2 ${isTeslaDark ? 'border-[#222222]' : 'border-black/10'}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded-[4px] border text-[10px] font-bold ${
                    isTeslaDark
                      ? 'bg-[#1C1C1E] border-[#2E2E2E] text-[#3E6AE1]'
                      : 'bg-white border-black/10 text-[#0071E3] shadow-2xs'
                  }`}
                >
                  DELL EMC
                </span>
                <span className={`text-xs font-bold tracking-wide ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  {modelName}
                </span>
                <span className={`text-[10px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>
                  2U 2-Socket Enterprise
                </span>
              </div>
              <div className={`flex items-center gap-2 text-[10px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-600'}`}>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] shadow-[0_0_6px_#00C853]" />
                  HEALTH OK
                </span>
                <span
                  className={`text-[9px] px-1 py-0.5 border rounded-[4px] font-semibold ${
                    isTeslaDark
                      ? 'bg-[#1C1C1E] border-[#2E2E2E] text-[#3E6AE1]'
                      : 'bg-white border-black/10 text-[#0071E3]'
                  }`}
                >
                  iDRAC9 ACTIVE
                </span>
              </div>
            </div>

            {/* 8-Bay Hot-Plug Drive Matrix */}
            <div
              className={`border p-2 rounded-[8px] ${
                isTeslaDark ? 'bg-[#0D0D0D] border-[#1F1F1F]' : 'bg-white/90 border-black/10 shadow-inner'
              }`}
            >
              <div className={`text-[9px] mb-1.5 flex justify-between font-semibold ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>
                <span>FRONT DRIVE BAYS (8x 2.5" SAS4 / NVMe U.2)</span>
                <span className={isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}>ALL DRIVES NOMINAL (RAID 10)</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`p-1.5 border rounded-[6px] flex flex-col justify-between h-14 ${
                      isTeslaDark ? 'bg-[#161616] border-[#222222]' : 'bg-[#F5F5F7] border-black/10'
                    }`}
                  >
                    <div className={`flex justify-between items-center text-[7px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>
                      <span className="font-semibold">BAY {i}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
                    </div>
                    <div
                      className={`w-full h-3 border rounded-[2px] flex items-center justify-center text-[7px] font-bold ${
                        isTeslaDark ? 'bg-[#0D0D0D] border-[#222222] text-[#8E8E93]' : 'bg-white border-black/10 text-zinc-600'
                      }`}
                    >
                      NVMe
                    </div>
                    <div className={`w-full h-1 rounded-full overflow-hidden ${isTeslaDark ? 'bg-[#222222]' : 'bg-black/10'}`}>
                      <div className="w-full h-full bg-[#00C853]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
    }
  }

  // Render Realistic Rear Panel Visual
  const renderRearChassis = () => {
    return (
      <div
        className={`w-full border rounded-[10px] p-3 space-y-3 font-mono transition-colors ${
          isTeslaDark
            ? 'bg-[#141414] border-[#1F1F1F]'
            : 'bg-gradient-to-b from-[#F9F9FB] to-[#ECECEE] border-black/15 shadow-xs'
        }`}
      >
        <div className={`flex items-center justify-between border-b pb-2 ${isTeslaDark ? 'border-[#222222]' : 'border-black/10'}`}>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold tracking-wide ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
              REAR I/O &amp; POWER ARCHITECTURE
            </span>
            <span className={`text-[10px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>
              (Cold-Aisle Intake / Hot-Aisle Exhaust)
            </span>
          </div>
          <span
            className={`px-1.5 py-0.5 rounded-[4px] border text-[10px] font-bold ${
              isTeslaDark
                ? 'bg-[#1C1C1E] border-[#2E2E2E] text-[#3E6AE1]'
                : 'bg-white border-black/10 text-[#0071E3] shadow-2xs'
            }`}
          >
            1+1 HOT-PLUG REDUNDANCY
          </span>
        </div>

        {/* Rear Architecture Components */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Dual Redundant Power Supplies */}
          <div
            className={`border p-2.5 rounded-[8px] space-y-2 ${
              isTeslaDark ? 'bg-[#0D0D0D] border-[#1F1F1F]' : 'bg-white/90 border-black/10 shadow-inner'
            }`}
          >
            <div className={`flex items-center justify-between text-[9px] font-semibold ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-600'}`}>
              <span className="flex items-center gap-1 font-bold text-amber-500">
                <Zap className="w-3 h-3 text-amber-500" /> DUAL PSUs
              </span>
              <span>800W PLATINUM</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div
                className={`p-1.5 border rounded-[6px] text-[8px] flex flex-col justify-between ${
                  isTeslaDark ? 'bg-[#161616] border-emerald-950/60' : 'bg-emerald-50/50 border-emerald-200'
                }`}
              >
                <div className="flex justify-between items-center text-emerald-600 font-bold">
                  <span>PSU-1</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] shadow-[0_0_4px_#00C853]" />
                </div>
                <div className={`font-bold text-[9px] my-1 ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  ACTIVE (AC OK)
                </div>
                <div className={`text-[7px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>228V • 1.1A</div>
              </div>
              <div
                className={`p-1.5 border rounded-[6px] text-[8px] flex flex-col justify-between ${
                  isTeslaDark ? 'bg-[#161616] border-emerald-950/60' : 'bg-emerald-50/50 border-emerald-200'
                }`}
              >
                <div className="flex justify-between items-center text-emerald-600 font-bold">
                  <span>PSU-2</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] shadow-[0_0_4px_#00C853]" />
                </div>
                <div className={`font-bold text-[9px] my-1 ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  STANDBY OK
                </div>
                <div className={`text-[7px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>228V • 0.1A</div>
              </div>
            </div>
          </div>

          {/* Network NICs & Uplinks */}
          <div
            className={`border p-2.5 rounded-[8px] space-y-2 ${
              isTeslaDark ? 'bg-[#0D0D0D] border-[#1F1F1F]' : 'bg-white/90 border-black/10 shadow-inner'
            }`}
          >
            <div className={`flex items-center justify-between text-[9px] font-semibold ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-600'}`}>
              <span className={`flex items-center gap-1 font-bold ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`}>
                <Wifi className="w-3 h-3" /> NIC INTERFACES
              </span>
              <span>10G/25G SFP+</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div
                className={`p-1.5 border rounded-[6px] text-[8px] ${
                  isTeslaDark ? 'bg-[#161616] border-[#222222]' : 'bg-[#F5F5F7] border-black/10'
                }`}
              >
                <div className={`flex justify-between font-semibold ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`}>
                  <span>PORT 1 (ETH0)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
                </div>
                <div className={`font-bold my-1 ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>10 Gbps SFP+</div>
                <div className={`text-[7px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>VLAN 102 (Core SW)</div>
              </div>
              <div
                className={`p-1.5 border rounded-[6px] text-[8px] ${
                  isTeslaDark ? 'bg-[#161616] border-[#222222]' : 'bg-[#F5F5F7] border-black/10'
                }`}
              >
                <div className={`flex justify-between font-semibold ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`}>
                  <span>PORT 2 (ETH1)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
                </div>
                <div className={`font-bold my-1 ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>10 Gbps SFP+</div>
                <div className={`text-[7px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>VLAN 104 (SAN Storage)</div>
              </div>
            </div>
          </div>

          {/* Out-of-Band Management & PCIe */}
          <div
            className={`border p-2.5 rounded-[8px] space-y-2 ${
              isTeslaDark ? 'bg-[#0D0D0D] border-[#1F1F1F]' : 'bg-white/90 border-black/10 shadow-inner'
            }`}
          >
            <div className={`flex items-center justify-between text-[9px] font-semibold ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-600'}`}>
              <span className={`flex items-center gap-1 font-bold ${isTeslaDark ? 'text-[#caedde]' : 'text-[#1d1d1f]'}`}>
                <Shield className="w-3 h-3 text-emerald-500" /> OOB MANAGEMENT
              </span>
              <span>DEDICATED 1GbE</span>
            </div>
            <div
              className={`p-1.5 border rounded-[6px] text-[8px] space-y-1 ${
                isTeslaDark ? 'bg-[#161616] border-[#222222]' : 'bg-[#F5F5F7] border-black/10'
              }`}
            >
              <div className="flex justify-between">
                <span className={isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-600'}>iDRAC9 / IPMI 2.0</span>
                <span className="text-emerald-500 font-bold">LINK UP</span>
              </div>
              <div className={`font-mono text-[9px] font-bold ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                {chassisSpecs?.management_port || '1GbE RJ45 MGMT Port'}
              </div>
              <div className={`text-[7px] ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>Dedicated Isolated Subnet</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`w-full rounded-[16px] p-5 space-y-4 ${
        isTeslaDark
          ? 'bg-[#111111] border border-[#1F1F1F] text-zinc-100 font-mono shadow-none'
          : "bg-white/70 backdrop-blur-xl border-[0.5px] border-black/10 text-[#1d1d1f] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif]"
      }`}
    >
      {/* Visual Header & View Angle Switcher */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b ${
          isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-[12px] border ${
              isTeslaDark
                ? 'bg-[#3E6AE1]/15 text-[#3E6AE1] border-[#3E6AE1]/30'
                : 'bg-[#0071E3]/10 text-[#0071E3] border-[#0071E3]/20'
            }`}
          >
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-semibold tracking-tight ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                {modelName}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium ${
                  isTeslaDark
                    ? 'bg-[#161616] border border-[#1F1F1F] text-zinc-300'
                    : 'bg-black/[0.04] border-[0.5px] border-black/10 text-zinc-700'
                }`}
              >
                {formFactor}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isTeslaDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
              Manufacturer: <span className={`font-semibold ${isTeslaDark ? 'text-zinc-200' : 'text-[#1d1d1f]'}`}>{brand}</span> • Device Class: {deviceType}
            </p>
          </div>
        </div>

        {/* Front / Rear Toggle Controls */}
        <div
          className={`flex items-center p-1 rounded-[10px] ${
            isTeslaDark ? 'bg-[#161616] border border-[#1F1F1F]' : 'bg-black/[0.04] border-[0.5px] border-black/10'
          }`}
        >
          <button
            onClick={() => setViewFace('front')}
            className={`px-3 py-1.5 text-xs font-medium rounded-[8px] transition-all cursor-pointer flex items-center gap-1.5 ${
              viewFace === 'front'
                ? isTeslaDark
                  ? 'bg-[#3E6AE1] text-white'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isTeslaDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-[#1d1d1f]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Front Bezel &amp; Bays
          </button>
          <button
            onClick={() => setViewFace('rear')}
            className={`px-3 py-1.5 text-xs font-medium rounded-[8px] transition-all cursor-pointer flex items-center gap-1.5 ${
              viewFace === 'rear'
                ? isTeslaDark
                  ? 'bg-[#3E6AE1] text-white'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isTeslaDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-600 hover:text-[#1d1d1f]'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            Rear Ports &amp; PSUs
          </button>
        </div>
      </div>

      {/* Render Selected View */}
      {viewFace === 'front' ? renderFrontChassis() : renderRearChassis()}

      {/* Physical Hardware Dimension Specs Grid */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t text-xs ${
          isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
        }`}
      >
        <div
          className={`p-2.5 rounded-[10px] border transition-colors ${
            isTeslaDark ? 'bg-[#141414] border-[#1F1F1F]' : 'bg-white border-black/10 shadow-2xs'
          }`}
        >
          <span
            className={`text-[10px] block uppercase font-semibold flex items-center gap-1.5 ${
              isTeslaDark ? 'text-[#8E8E93] tracking-[1.5px]' : 'text-zinc-500'
            }`}
          >
            <HardDrive className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`} /> Drive Config
          </span>
          <span className={`text-xs font-bold mt-1 block truncate ${isTeslaDark ? 'text-zinc-100 font-mono' : 'text-[#1d1d1f]'}`}>
            {chassisSpecs?.drive_bays || '8x 2.5" SAS/NVMe'}
          </span>
        </div>

        <div
          className={`p-2.5 rounded-[10px] border transition-colors ${
            isTeslaDark ? 'bg-[#141414] border-[#1F1F1F]' : 'bg-white border-black/10 shadow-2xs'
          }`}
        >
          <span
            className={`text-[10px] block uppercase font-semibold flex items-center gap-1.5 ${
              isTeslaDark ? 'text-[#8E8E93] tracking-[1.5px]' : 'text-zinc-500'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-amber-400' : 'text-amber-500'}`} /> Power Rating
          </span>
          <span className={`text-xs font-bold mt-1 block truncate font-mono ${isTeslaDark ? 'text-amber-400' : 'text-amber-600'}`}>
            {chassisSpecs?.max_power_watt || 800}W (Dual Redundant)
          </span>
        </div>

        <div
          className={`p-2.5 rounded-[10px] border transition-colors ${
            isTeslaDark ? 'bg-[#141414] border-[#1F1F1F]' : 'bg-white border-black/10 shadow-2xs'
          }`}
        >
          <span
            className={`text-[10px] block uppercase font-semibold flex items-center gap-1.5 ${
              isTeslaDark ? 'text-[#8E8E93] tracking-[1.5px]' : 'text-zinc-500'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-purple-400' : 'text-purple-600'}`} /> Dimensions / Weight
          </span>
          <span className={`text-xs font-bold mt-1 block truncate ${isTeslaDark ? 'text-zinc-100 font-mono' : 'text-[#1d1d1f]'}`}>
            {chassisSpecs?.weight_kg || 28.6} kg ({heightU}U Standard)
          </span>
        </div>

        <div
          className={`p-2.5 rounded-[10px] border transition-colors ${
            isTeslaDark ? 'bg-[#141414] border-[#1F1F1F]' : 'bg-white border-black/10 shadow-2xs'
          }`}
        >
          <span
            className={`text-[10px] block uppercase font-semibold flex items-center gap-1.5 ${
              isTeslaDark ? 'text-[#8E8E93] tracking-[1.5px]' : 'text-zinc-500'
            }`}
          >
            <Cpu className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-[#00C853]' : 'text-emerald-600'}`} /> OOB Management
          </span>
          <span className={`text-xs font-bold mt-1 block truncate font-mono ${isTeslaDark ? 'text-[#00C853]' : 'text-emerald-700'}`}>
            {chassisSpecs?.management_port || 'Dedicated 1GbE'}
          </span>
        </div>
      </div>
    </div>
  )
}
