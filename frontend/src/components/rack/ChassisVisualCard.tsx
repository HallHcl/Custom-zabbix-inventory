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
          <div className="w-full bg-[#1c242b] border border-[#394650] rounded-xs p-3 space-y-3 font-mono">
            {/* Switch Front Bezel */}
            <div className="flex items-center justify-between border-b border-[#2d3a43] pb-2">
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-[2px] border text-[9.5px] font-bold shadow-xs tracking-wider uppercase"
                  style={{
                    backgroundColor: brandInfo?.bg_color || '#273139',
                    borderColor: brandColor ? `${brandColor}66` : '#50626f',
                    color: brandColor || '#8bd7d1',
                    boxShadow: brandInfo?.glow_color ? `0 0 6px ${brandInfo.glow_color}` : undefined,
                  }}
                >
                  {brandTag}
                </span>
                <span className="text-xs text-[#caedde] font-bold tracking-wide">{modelName}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#85a6b1]">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8bd7d1] shadow-[0_0_6px_#8bd7d1]" />
                  SYS OK
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  PWR DUAL
                </span>
              </div>
            </div>

            {/* 48-Port SFP28/RJ45 Matrix */}
            <div className="bg-[#141a1f] border border-[#2d3a43] p-2 rounded-xs">
              <div className="text-[9px] text-[#85a6b1] mb-1.5 flex justify-between">
                <span>PORT ARRAY 1-48 (10/25GE SFP28)</span>
                <span className="text-[#8bd7d1]">8x 100GE QSFP28 UPLINKS</span>
              </div>
              <div className="grid grid-cols-12 sm:grid-cols-24 gap-1">
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-0.5 p-1 bg-[#1c242b] border border-[#394650] rounded-xs"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#8bd7d1]" />
                    <div className="w-3 h-2 bg-[#273139] rounded-2xs border border-[#50626f]" />
                    <span className="text-[7px] text-[#85a6b1]">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'firewall_ngfw':
        return (
          <div className="w-full bg-[#2a1c22] border border-[#56364a] rounded-xs p-3 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#432b37] pb-2">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-xs bg-[#3d2330] border border-rose-800 text-[10px] font-bold text-rose-300">
                  FORTINET
                </span>
                <span className="text-xs text-rose-100 font-bold tracking-wide">{modelName}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-rose-300">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                  HA SYNC
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  SEC ENGINE ACTIVE
                </span>
              </div>
            </div>

            <div className="bg-[#1b1217] border border-[#432b37] p-2.5 rounded-xs flex items-center justify-between">
              <div className="flex gap-1.5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center p-1 bg-[#2a1c22] border border-rose-950 rounded-xs">
                    <span className="w-1 h-1 rounded-full bg-rose-400 mb-0.5" />
                    <div className="w-3.5 h-2.5 bg-[#140d11] border border-rose-900 rounded-2xs" />
                    <span className="text-[7px] text-rose-400/80">SFP{i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="text-right">
                <span className="text-[9px] text-rose-300 block">ASIC NP7/CP9 Accelerated</span>
                <span className="text-[10px] text-white font-bold">400 Gbps Firewall Throughput</span>
              </div>
            </div>
          </div>
        )

      case 'ups_modular':
        return (
          <div className="w-full bg-[#20282f] border border-[#394650] rounded-xs p-3 space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-[#2d3a43] pb-2">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-xs bg-[#273139] border border-[#50626f] text-[10px] font-bold text-[#caedde]">
                  SCHNEIDER / APC
                </span>
                <span className="text-xs text-white font-bold tracking-wide">{modelName}</span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] rounded-xs bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                ON-LINE DOUBLE CONVERSION
              </span>
            </div>

            {/* Modular Battery Slots & LCD Display */}
            <div className="grid grid-cols-4 gap-2 bg-[#161c20] p-2 rounded-xs border border-[#2d3a43]">
              <div className="col-span-1 bg-[#20282f] border border-[#8bd7d1]/50 p-2 rounded-xs flex flex-col justify-between text-[8px] text-[#8bd7d1]">
                <div>
                  <div className="text-[7px] text-[#85a6b1]">NMC3 STATUS</div>
                  <div className="font-bold text-white text-[10px]">230V / 50Hz</div>
                </div>
                <div>
                  <div className="flex justify-between text-[7px] mb-0.5">
                    <span>LOAD</span>
                    <span>45%</span>
                  </div>
                  <div className="w-full bg-[#34424b] h-1.5 rounded-2xs overflow-hidden">
                    <div className="w-9/20 h-full bg-[#8bd7d1]" />
                  </div>
                </div>
              </div>

              <div className="col-span-3 grid grid-cols-3 gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="p-1.5 bg-[#273139] border border-[#394650] rounded-xs flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center text-[7px] text-[#85a6b1]">
                      <span>BAT-PACK #{i + 1}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    </div>
                    <div className="h-6 bg-[#161c20] rounded-2xs border border-[#394650] flex items-center justify-center text-[8px] text-[#caedde]">
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
          <div className="w-full bg-[#1e262c] border border-[#394650] rounded-xs p-3 space-y-3 font-mono">
            {/* Server Front Bezel Header */}
            <div className="flex items-center justify-between border-b border-[#2d3a43] pb-2">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-xs bg-[#273139] border border-[#50626f] text-[10px] font-bold text-[#8bd7d1]">
                  DELL EMC
                </span>
                <span className="text-xs text-white font-bold tracking-wide">{modelName}</span>
                <span className="text-[10px] text-[#85a6b1]">2U 2-Socket Enterprise</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[#85a6b1]">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981]" />
                  HEALTH OK
                </span>
                <span className="text-[9px] px-1 py-0.2 bg-[#273139] border border-[#50626f] rounded-xs text-[#8bd7d1]">
                  iDRAC9 ACTIVE
                </span>
              </div>
            </div>

            {/* 8-Bay Hot-Plug Drive Matrix */}
            <div className="bg-[#141a1f] border border-[#2d3a43] p-2 rounded-xs">
              <div className="text-[9px] text-[#85a6b1] mb-1.5 flex justify-between">
                <span>FRONT DRIVE BAYS (8x 2.5" SAS4 / NVMe U.2)</span>
                <span className="text-[#8bd7d1]">ALL DRIVES NOMINAL (RAID 10)</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="p-1.5 bg-[#20282f] border border-[#394650] rounded-xs flex flex-col justify-between h-14"
                  >
                    <div className="flex justify-between items-center text-[7px] text-[#85a6b1]">
                      <span>BAY {i}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8bd7d1]" />
                    </div>
                    <div className="w-full bg-[#161c20] h-3 border border-[#394650] rounded-2xs flex items-center justify-center text-[7px] text-[#85a6b1]">
                      NVMe
                    </div>
                    <div className="w-full h-1 bg-[#34424b] rounded-2xs overflow-hidden">
                      <div className="w-full h-full bg-[#10b981]" />
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
      <div className="w-full bg-[#182026] border border-[#394650] rounded-xs p-3 space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-[#2d3a43] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#caedde]">REAR I/O &amp; POWER ARCHITECTURE</span>
            <span className="text-[10px] text-[#85a6b1]">(Cold-Aisle Intake / Hot-Aisle Exhaust)</span>
          </div>
          <span className="px-1.5 py-0.5 rounded-xs bg-[#20282f] border border-[#394650] text-[10px] text-[#8bd7d1]">
            1+1 HOT-PLUG REDUNDANCY
          </span>
        </div>

        {/* Rear Architecture Components */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Dual Redundant Power Supplies */}
          <div className="bg-[#1e262c] border border-[#394650] p-2.5 rounded-xs space-y-2">
            <div className="flex items-center justify-between text-[9px] text-[#85a6b1]">
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <Zap className="w-3 h-3" /> DUAL PSUs
              </span>
              <span>800W PLATINUM</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-1.5 bg-[#141a1f] border border-emerald-900 rounded-xs text-[8px] flex flex-col justify-between">
                <div className="flex justify-between items-center text-emerald-400">
                  <span>PSU-1</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]" />
                </div>
                <div className="text-[#caedde] font-bold text-[9px] my-1">ACTIVE (AC OK)</div>
                <div className="text-[7px] text-[#85a6b1]">228V • 1.1A</div>
              </div>
              <div className="p-1.5 bg-[#141a1f] border border-emerald-900 rounded-xs text-[8px] flex flex-col justify-between">
                <div className="flex justify-between items-center text-emerald-400">
                  <span>PSU-2</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]" />
                </div>
                <div className="text-[#caedde] font-bold text-[9px] my-1">STANDBY OK</div>
                <div className="text-[7px] text-[#85a6b1]">228V • 0.1A</div>
              </div>
            </div>
          </div>

          {/* Network NICs & Uplinks */}
          <div className="bg-[#1e262c] border border-[#394650] p-2.5 rounded-xs space-y-2">
            <div className="flex items-center justify-between text-[9px] text-[#85a6b1]">
              <span className="flex items-center gap-1 font-bold text-[#8bd7d1]">
                <Wifi className="w-3 h-3" /> NIC INTERFACES
              </span>
              <span>10G/25G SFP+</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-1.5 bg-[#141a1f] border border-[#394650] rounded-xs text-[8px]">
                <div className="flex justify-between text-[#8bd7d1]">
                  <span>PORT 1 (ETH0)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8bd7d1]" />
                </div>
                <div className="text-white font-bold my-1">10 Gbps SFP+</div>
                <div className="text-[7px] text-[#85a6b1]">VLAN 102 (Core SW)</div>
              </div>
              <div className="p-1.5 bg-[#141a1f] border border-[#394650] rounded-xs text-[8px]">
                <div className="flex justify-between text-[#8bd7d1]">
                  <span>PORT 2 (ETH1)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8bd7d1]" />
                </div>
                <div className="text-white font-bold my-1">10 Gbps SFP+</div>
                <div className="text-[7px] text-[#85a6b1]">VLAN 104 (SAN Storage)</div>
              </div>
            </div>
          </div>

          {/* Out-of-Band Management & PCIe */}
          <div className="bg-[#1e262c] border border-[#394650] p-2.5 rounded-xs space-y-2">
            <div className="flex items-center justify-between text-[9px] text-[#85a6b1]">
              <span className="flex items-center gap-1 font-bold text-[#caedde]">
                <Shield className="w-3 h-3" /> OOB MANAGEMENT
              </span>
              <span>DEDICATED 1GbE</span>
            </div>
            <div className="p-1.5 bg-[#141a1f] border border-[#394650] rounded-xs text-[8px] space-y-1">
              <div className="flex justify-between text-[#caedde]">
                <span>iDRAC9 / IPMI 2.0</span>
                <span className="text-emerald-400 font-bold">LINK UP</span>
              </div>
              <div className="text-white font-mono text-[9px] font-bold">
                {chassisSpecs?.management_port || '1GbE RJ45 MGMT Port'}
              </div>
              <div className="text-[7px] text-[#85a6b1]">Dedicated Isolated Subnet</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-[#182026] border border-[#394650] rounded-xs p-4 space-y-4 text-slate-100">
      {/* Visual Header & View Angle Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#394650]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xs bg-[#20282f] border border-[#394650] text-[#8bd7d1]">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-mono tracking-tight">{modelName}</h3>
              <span className="px-1.5 py-0.2 rounded-xs bg-[#273139] border border-[#50626f] text-[10px] font-mono text-[#8bd7d1]">
                {formFactor}
              </span>
            </div>
            <p className="text-xs text-[#85a6b1] font-mono mt-0.5">
              Manufacturer: <span className="text-[#caedde] font-semibold">{brand}</span> • Device Class: {deviceType}
            </p>
          </div>
        </div>

        {/* Front / Rear Toggle Controls */}
        <div className="flex items-center p-0.5 rounded-xs bg-[#20282f] border border-[#394650]">
          <button
            onClick={() => setViewFace('front')}
            className={`px-3 py-1 text-xs font-mono rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewFace === 'front'
                ? 'bg-[#34424b] text-[#8bd7d1] font-bold shadow-xs'
                : 'text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            <Eye className="w-3 h-3" />
            Front Bezel &amp; Bays
          </button>
          <button
            onClick={() => setViewFace('rear')}
            className={`px-3 py-1 text-xs font-mono rounded-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewFace === 'rear'
                ? 'bg-[#34424b] text-[#8bd7d1] font-bold shadow-xs'
                : 'text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            <Box className="w-3 h-3" />
            Rear Ports &amp; PSUs
          </button>
        </div>
      </div>

      {/* Render Selected View */}
      {viewFace === 'front' ? renderFrontChassis() : renderRearChassis()}

      {/* Physical Hardware Dimension Specs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#2d3a43] text-xs font-mono">
        <div className="p-2 rounded-xs bg-[#20282f] border border-[#394650]">
          <span className="text-[9px] text-[#85a6b1] block uppercase flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-[#8bd7d1]" /> Drive Config
          </span>
          <span className="text-[#caedde] text-[10px] font-bold mt-0.5 block truncate">
            {chassisSpecs?.drive_bays || '8x 2.5" SAS/NVMe'}
          </span>
        </div>

        <div className="p-2 rounded-xs bg-[#20282f] border border-[#394650]">
          <span className="text-[9px] text-[#85a6b1] block uppercase flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Power Rating
          </span>
          <span className="text-amber-400 text-[10px] font-bold mt-0.5 block truncate">
            {chassisSpecs?.max_power_watt || 800}W (Dual Redundant)
          </span>
        </div>

        <div className="p-2 rounded-xs bg-[#20282f] border border-[#394650]">
          <span className="text-[9px] text-[#85a6b1] block uppercase flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#85a6b1]" /> Dimensions / Weight
          </span>
          <span className="text-[#caedde] text-[10px] font-bold mt-0.5 block truncate">
            {chassisSpecs?.weight_kg || 28.6} kg ({heightU}U Standard)
          </span>
        </div>

        <div className="p-2 rounded-xs bg-[#20282f] border border-[#394650]">
          <span className="text-[9px] text-[#85a6b1] block uppercase flex items-center gap-1">
            <Cpu className="w-3 h-3 text-[#8bd7d1]" /> OOB Management
          </span>
          <span className="text-[#8bd7d1] text-[10px] font-bold mt-0.5 block truncate">
            {chassisSpecs?.management_port || 'Dedicated 1GbE'}
          </span>
        </div>
      </div>
    </div>
  )
}
