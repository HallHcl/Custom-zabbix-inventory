/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */

import { useState, useMemo } from 'react'
import { Plus, Zap, Wifi, AlertTriangle, Activity, Layers } from 'lucide-react'
import type { Device, RackElevation as RackElevationType } from '../../types'
import { DeviceBezel } from './DeviceBezel'
import { useTheme } from '../../lib/theme'

interface RackElevationProps {
  rack: RackElevationType
  selectedDeviceId: number | null
  onSelectDevice: (device: Device) => void
  onEmptySlotClick: (u: number) => void
  typeFilter?: string | null
  searchFilter?: string
}

type CableFilterMode = 'ALL' | 'FEED_A' | 'FEED_B' | 'NETWORK' | 'NONE'

export function RackElevation({
  rack,
  selectedDeviceId,
  onSelectDevice,
  onEmptySlotClick,
  typeFilter,
  searchFilter = '',
}: RackElevationProps) {
  const { isTeslaDark } = useTheme()
  const [face, setFace] = useState<'Front' | 'Rear'>('Front')
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [cableFilter, setCableFilter] = useState<CableFilterMode>('ALL')
  const [hoveredDeviceId, setHoveredDeviceId] = useState<number | null>(null)

  const activeDeviceId = selectedDeviceId ?? hoveredDeviceId

  // Compute available brands in this rack with device counts
  const availableBrands = useMemo(() => {
    const brandMap = new Map<string, { name: string; tag: string; color: string; count: number }>()
    rack.devices.forEach((d) => {
      if (d.brand_info) {
        const key = d.brand_info.name.toLowerCase()
        const existing = brandMap.get(key)
        if (existing) {
          existing.count += 1
        } else {
          brandMap.set(key, {
            name: d.brand_info.name,
            tag: d.brand_info.tag,
            color: d.brand_info.color,
            count: 1,
          })
        }
      }
    })
    return Array.from(brandMap.values()).sort((a, b) => b.count - a.count)
  }, [rack.devices])

  // Single-corded risk detection
  const singleCordedDevices = useMemo(() => {
    return rack.devices.filter(
      (d) =>
        d.name.includes('A01-U24') ||
        d.tags?.single_corded === true ||
        d.custom_fields?.redundancy === 'Single'
    )
  }, [rack.devices])

  // Filter devices
  const visibleDevices = rack.devices.filter((d) => {
    const isFullDepth = ['Server', 'Switch', 'Firewall', 'Storage', 'UPS'].includes(d.device_type)
    if (d.position_face !== face && !isFullDepth) return false
    if (typeFilter && d.device_type !== typeFilter) return false
    if (searchFilter && !d.name.toLowerCase().includes(searchFilter.toLowerCase())) return false
    return true
  })

  // Build slot occupancy map (U 1..42)
  const slotMap: Record<number, Device | null> = {}
  for (let u = 1; u <= rack.total_u; u++) {
    slotMap[u] = null
  }

  const occupiedSlots = new Set<number>()
  visibleDevices.forEach((dev) => {
    slotMap[dev.start_u] = dev
    for (let u = dev.start_u; u < dev.start_u + dev.height_u; u++) {
      occupiedSlots.add(u)
    }
  })

  // Render 42U slots from 42 down to 1 with Left (Feed A) & Right (Feed B + Network) Cable Breakouts
  const uRows = []
  for (let u = rack.total_u; u >= 1; u--) {
    const dev = slotMap[u]

    const isCoveredByHigherU = !dev && occupiedSlots.has(u)
    if (isCoveredByHigherU) continue

    if (dev) {
      const isDimmed =
        selectedBrand !== null &&
        dev.brand_info?.name.toLowerCase() !== selectedBrand.toLowerCase()

      const isDevActive = activeDeviceId === dev.id
      const isSingleCorded = singleCordedDevices.some((sc) => sc.id === dev.id)

      // Feed A Cable Breakout Visibility & Styling
      const showFeedA = cableFilter === 'ALL' || cableFilter === 'FEED_A'
      const feedAActive = isDevActive && showFeedA

      // Feed B Cable Breakout Visibility & Styling
      const showFeedB = cableFilter === 'ALL' || cableFilter === 'FEED_B'
      const feedBActive = isDevActive && showFeedB

      // Network Cable Breakout Visibility & Styling
      const showNetwork = cableFilter === 'ALL' || cableFilter === 'NETWORK'
      const networkActive = isDevActive && showNetwork

      uRows.push(
        <div
          key={`device-${dev.id}`}
          className="flex items-center w-full"
          onMouseEnter={() => setHoveredDeviceId(dev.id)}
          onMouseLeave={() => setHoveredDeviceId(null)}
        >
          {/* Left Cable Finger / Breakout (PDU A - Primary Feed) */}
          <div className="w-10 shrink-0 h-full flex items-center justify-end pr-1 relative group/pdua select-none">
            {showFeedA ? (
              <div
                className={`w-full h-1.5 rounded-l-full transition-all relative flex items-center justify-end ${
                  feedAActive
                    ? 'bg-[#007AFF] shadow-[0_0_10px_#007AFF] brightness-125 z-10'
                    : 'bg-[#007AFF]/60 hover:bg-[#007AFF]'
                }`}
                title={`Feed A: PDU-A Outlet -> ${dev.name} PSU-1 (230V • 1.1A • 253W)`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/90 mr-0.5 shadow-sm" />
              </div>
            ) : (
              <div className="w-full h-0.5 bg-white/5 opacity-40" />
            )}
          </div>

          {/* Left U Rail Number */}
          <div className="w-7 shrink-0 text-right pr-1.5 font-mono text-[10px] text-zinc-500 font-semibold select-none">
            {u}
          </div>

          {/* Left Rack Ear Screw */}
          <div className={`w-3 h-full flex items-center justify-center select-none border-r-[0.5px] ${
            isTeslaDark ? "bg-[#141414] border-[#1F1F1F]" : "bg-black/[0.03] border-black/10"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full border-[0.5px] ${
              isTeslaDark ? "bg-[#2E2E2E] border-[#3E3E3E]" : "bg-black/15 border-black/25"
            }`} />
          </div>

          {/* Center: Device Faceplate Bezel */}
          <div className="flex-1 min-w-0">
            <DeviceBezel
              device={dev}
              isSelected={selectedDeviceId === dev.id}
              onClick={() => onSelectDevice(dev)}
              isDimmed={isDimmed}
              face={face}
            />
          </div>

          {/* Right Rack Ear Screw */}
          <div className={`w-3 h-full flex items-center justify-center select-none border-l-[0.5px] ${
            isTeslaDark ? "bg-[#141414] border-[#1F1F1F]" : "bg-black/[0.03] border-black/10"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full border-[0.5px] ${
              isTeslaDark ? "bg-[#2E2E2E] border-[#3E3E3E]" : "bg-black/15 border-black/25"
            }`} />
          </div>

          {/* Right U Rail Number */}
          <div className={`w-7 shrink-0 text-left pl-1.5 font-mono text-[10px] font-semibold select-none ${
            isTeslaDark ? "text-[#888888]" : "text-zinc-500"
          }`}>
            {u}
          </div>

          {/* Right Cable Finger / Breakout (PDU B - Redundant Feed & Network) */}
          <div className="w-12 shrink-0 h-full flex flex-col justify-center gap-0.5 pl-1 relative group/pdub select-none">
            {/* Feed B Power Cable or Severed Single-Corded Warning */}
            {showFeedB ? (
              isSingleCorded ? (
                /* Severed / Missing Feed B Cable Hazard */
                <div
                  className="w-full h-1.5 border-t border-b border-dashed border-[#ffd60a] bg-[#ffd60a]/20 rounded-r-full flex items-center justify-between px-0.5 animate-pulse"
                  title="CRITICAL REDUNDANCY RISK: Feed B unplugged / single-corded!"
                >
                  <AlertTriangle className="w-2.5 h-2.5 text-[#ffd60a]" />
                  <span className="w-1.5 h-1 bg-[#ffd60a] rounded-full" />
                </div>
              ) : (
                /* Normal Redundant Feed B Cable */
                <div
                  className={`w-full h-1 rounded-r-full transition-all relative flex items-center ${
                    feedBActive
                      ? 'bg-[#ff453a] shadow-[0_0_10px_#ff453a] brightness-125 z-10'
                      : 'bg-[#ff453a]/60 hover:bg-[#ff453a]'
                  }`}
                  title={`Feed B: PDU-B Outlet -> ${dev.name} PSU-2 (230V • 0.1A • Standby)`}
                >
                  <span className="w-1 h-1 rounded-full bg-white/90 ml-0.5 shadow-sm" />
                </div>
              )
            ) : null}

            {/* Network Data Cable (Fiber/Copper to ToR Switch) */}
            {showNetwork && (
              <div
                className={`w-full h-1 rounded-r-full transition-all relative flex items-center ${
                  networkActive
                    ? 'bg-[#30d158] shadow-[0_0_10px_#30d158] brightness-125 z-10'
                    : 'bg-[#30d158]/60 hover:bg-[#30d158]'
                }`}
                title={`Network Uplink: ${dev.name} eth0 -> SW-TOR-01 (10/25GbE Active)`}
              >
                <span className="w-1 h-1 rounded-full bg-white/90 ml-0.5" />
              </div>
            )}
          </div>
        </div>
      )
    } else {
      uRows.push(
        <div key={`slot-${u}`} className="flex items-center w-full group/slot">
          {/* Left Empty Finger */}
          <div className="w-10 shrink-0 h-7 flex items-center justify-end pr-1">
            <div className={`w-4 h-0.5 ${isTeslaDark ? "bg-[#222222]" : "bg-black/10"}`} />
          </div>

          {/* Left U Rail Number */}
          <div className={`w-7 shrink-0 text-right pr-1.5 font-mono text-[10px] select-none ${
            isTeslaDark ? "text-[#666666]" : "text-zinc-400"
          }`}>
            {u}
          </div>

          {/* Left Rail Mounting Hole */}
          <div className={`w-3 h-7 flex items-center justify-center select-none border-r-[0.5px] ${
            isTeslaDark ? "bg-[#141414] border-[#1F1F1F]" : "bg-black/[0.03] border-black/10"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full border-[0.5px] ${
              isTeslaDark ? "bg-[#2E2E2E] border-[#3E3E3E]" : "bg-black/15 border-black/25"
            }`} />
          </div>

          {/* Empty Slot Bay */}
          <div
            onClick={() => onEmptySlotClick(u)}
            className={`flex-1 h-7 border border-dashed transition-all duration-200 cursor-pointer flex items-center justify-center text-transparent text-[11px] font-sans font-medium ${
              isTeslaDark
                ? "border-[#222222] bg-[#0E0E0E] hover:bg-[#3E6AE1]/15 hover:border-[#3E6AE1]/50 hover:text-[#3E6AE1]"
                : "border-black/15 bg-black/[0.015] hover:bg-[#0071E3]/10 hover:border-[#0071E3]/40 hover:text-[#0071E3]"
            }`}
            title={`Mount hardware unit at U${u}`}
          >
            <div className="flex items-center gap-1.5 opacity-0 group-hover/slot:opacity-100 transition-opacity">
              <Plus className={`w-3.5 h-3.5 ${isTeslaDark ? "text-[#3E6AE1]" : "text-[#0071E3]"}`} />
              <span className={`tracking-tight ${isTeslaDark ? "text-[#3E6AE1]" : "text-[#0071E3]"}`}>Mount at U{u}</span>
            </div>
          </div>

          {/* Right Rail Mounting Hole */}
          <div className={`w-3 h-7 flex items-center justify-center select-none border-l-[0.5px] ${
            isTeslaDark ? "bg-[#141414] border-[#1F1F1F]" : "bg-black/[0.03] border-black/10"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full border-[0.5px] ${
              isTeslaDark ? "bg-[#2E2E2E] border-[#3E3E3E]" : "bg-black/15 border-black/25"
            }`} />
          </div>

          {/* Right U Rail Number */}
          <div className={`w-7 shrink-0 text-left pl-1.5 font-mono text-[10px] select-none ${
            isTeslaDark ? "text-[#666666]" : "text-zinc-400"
          }`}>
            {u}
          </div>

          {/* Right Empty Finger */}
          <div className="w-12 shrink-0 h-7 flex items-center pl-1">
            <div className={`w-4 h-0.5 ${isTeslaDark ? "bg-[#222222]" : "bg-black/10"}`} />
          </div>
        </div>
      )
    }
  }

  // Active Device Telemetry details for Cable HUD
  const activeDevice = useMemo(() => {
    if (!activeDeviceId) return null
    return rack.devices.find((d) => d.id === activeDeviceId) || null
  }, [rack.devices, activeDeviceId])

  return (
    <div className={`flex flex-col items-center select-none max-w-[620px] w-full font-sans transition-colors ${
      isTeslaDark ? "text-[#F5F5F7]" : "text-zinc-800"
    }`}>
      {/* Front / Rear & Standard EIA-310 Header */}
      <div className={`w-full flex items-center justify-between p-3 mb-3 rounded-[16px] backdrop-blur-xl border shadow-sm transition-colors ${
        isTeslaDark
          ? "bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]"
          : "bg-white/75 border-black/10 text-[#1d1d1f]"
      }`}>
        <div className={`flex items-center gap-2 text-xs ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${isTeslaDark ? "bg-[#3E6AE1]" : "bg-[#0071E3]"}`} />
          <span className={`font-semibold tracking-[-0.011em] ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>EIA-310-D 19&quot; SPEC</span>
          <span className={isTeslaDark ? "text-[#333333]" : "text-black/20"}>•</span>
          <span className={`font-medium ${isTeslaDark ? "text-[#3E6AE1]" : "text-[#0071E3]"}`}>2N Dual Power Redundancy</span>
        </div>

        {/* Front / Rear Hardware Selector */}
        <div className={`flex items-center p-1 rounded-[10px] border ${
          isTeslaDark
            ? "bg-[#181818] border-[#262626]"
            : "bg-black/[0.04] border-black/10"
        }`}>
          <button
            type="button"
            onClick={() => setFace('Front')}
            className={`min-h-[30px] px-3.5 py-1 rounded-[8px] text-xs font-semibold tracking-[-0.011em] transition-all duration-200 cursor-pointer ${
              face === 'Front'
                ? isTeslaDark
                  ? 'bg-[#2A2A2A] text-[#F5F5F7] shadow-sm'
                  : 'bg-white text-[#1d1d1f] shadow-sm'
                : isTeslaDark
                ? 'text-[#888888] hover:text-[#FFFFFF]'
                : 'text-zinc-500 hover:text-[#1d1d1f]'
            }`}
          >
            FRONT
          </button>
          <button
            type="button"
            onClick={() => setFace('Rear')}
            className={`min-h-[30px] px-3.5 py-1 rounded-[8px] text-xs font-semibold tracking-[-0.011em] transition-all duration-200 cursor-pointer ${
              face === 'Rear'
                ? isTeslaDark
                  ? 'bg-[#2A2A2A] text-[#F5F5F7] shadow-sm'
                  : 'bg-white text-[#1d1d1f] shadow-sm'
                : isTeslaDark
                ? 'text-[#888888] hover:text-[#FFFFFF]'
                : 'text-zinc-500 hover:text-[#1d1d1f]'
            }`}
          >
            REAR
          </button>
        </div>
      </div>

      {/* Redundancy Hazard Banner if any single-corded device exists */}
      {singleCordedDevices.length > 0 && (
        <div className={`w-full mb-3 p-3 rounded-[16px] border flex items-center justify-between text-xs shadow-sm ${
          isTeslaDark
            ? "bg-amber-950/30 border-amber-800/50"
            : "bg-[#ff9500]/10 border-[#ff9500]/30"
        }`}>
          <div className="flex items-center gap-2.5 text-[#ff9500]">
            <AlertTriangle className="w-4 h-4 text-[#ff9500] shrink-0 animate-pulse" />
            <div>
              <span className="font-bold">SINGLE-CORDED HAZARD: </span>
              <span className={isTeslaDark ? "text-[#CCCCCC]" : "text-zinc-700"}>
                {singleCordedDevices[0].name} has no redundant Feed B power connection!
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCableFilter('FEED_B')}
            className="min-h-[30px] px-3 py-1 rounded-[8px] bg-[#ff9500]/15 hover:bg-[#ff9500]/25 text-[#ff9500] border-[0.5px] border-[#ff9500]/40 text-xs font-semibold cursor-pointer transition-colors"
          >
            Inspect Feed B
          </button>
        </div>
      )}

      {/* Cable Tracing Filter Toolbar */}
      <div className={`w-full mb-3 p-2 rounded-[16px] backdrop-blur-xl border flex flex-wrap items-center justify-between gap-2 text-xs shadow-sm transition-colors ${
        isTeslaDark
          ? "bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]"
          : "bg-white/75 border-black/10 text-[#1d1d1f]"
      }`}>
        <div className={`flex items-center gap-1.5 pl-1 font-medium ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
          <Zap className="w-3.5 h-3.5 text-[#ff9500]" />
          <span>Cabling:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCableFilter('ALL')}
            className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
              cableFilter === 'ALL'
                ? isTeslaDark ? 'bg-[#3E6AE1] text-white shadow-sm' : 'bg-[#0071E3] text-white shadow-sm'
                : isTeslaDark ? 'bg-[#181818] text-[#888888] hover:text-[#FFFFFF]' : 'bg-black/[0.04] text-zinc-600 hover:text-[#1d1d1f]'
            }`}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => setCableFilter('FEED_A')}
            className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              cableFilter === 'FEED_A'
                ? isTeslaDark ? 'bg-[#3E6AE1]/20 text-[#3E6AE1] border border-[#3E6AE1]/40' : 'bg-[#0071E3]/15 text-[#0071E3] border-[0.5px] border-[#0071E3]/40 shadow-xs'
                : isTeslaDark ? 'bg-[#181818] text-[#888888] hover:text-[#3E6AE1]' : 'bg-black/[0.04] text-zinc-600 hover:text-[#0071E3]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isTeslaDark ? "bg-[#3E6AE1]" : "bg-[#0071E3]"}`} />
            FEED A
          </button>
          <button
            type="button"
            onClick={() => setCableFilter('FEED_B')}
            className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              cableFilter === 'FEED_B'
                ? 'bg-[#ff3b30]/15 text-[#ff3b30] border-[0.5px] border-[#ff3b30]/40 shadow-xs'
                : isTeslaDark ? 'bg-[#181818] text-[#888888] hover:text-[#ff3b30]' : 'bg-black/[0.04] text-zinc-600 hover:text-[#ff3b30]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30]" />
            FEED B
          </button>
          <button
            type="button"
            onClick={() => setCableFilter('NETWORK')}
            className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              cableFilter === 'NETWORK'
                ? 'bg-[#34c759]/15 text-[#34c759] border-[0.5px] border-[#34c759]/40 shadow-xs'
                : isTeslaDark ? 'bg-[#181818] text-[#888888] hover:text-[#34c759]' : 'bg-black/[0.04] text-zinc-600 hover:text-[#34c759]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]" />
            NETWORK
          </button>
          <button
            type="button"
            onClick={() => setCableFilter('NONE')}
            className={`px-2 py-1 rounded-[8px] text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
              cableFilter === 'NONE'
                ? isTeslaDark ? 'bg-[#2A2A2A] text-[#F5F5F7] shadow-xs' : 'bg-black/10 text-[#1d1d1f] shadow-xs'
                : isTeslaDark ? 'bg-[#181818] text-[#666666] hover:text-[#FFFFFF]' : 'bg-black/[0.04] text-zinc-500 hover:text-[#1d1d1f]'
            }`}
          >
            HIDE
          </button>
        </div>
      </div>

      {/* Quick Brand Filter Chip Bar */}
      {availableBrands.length > 0 && (
        <div className={`w-full mb-3 p-2 rounded-[16px] backdrop-blur-xl border flex items-center gap-1.5 overflow-x-auto text-xs shadow-sm transition-colors ${
          isTeslaDark
            ? "bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]"
            : "bg-white/75 border-black/10 text-[#1d1d1f]"
        }`}>
          <span className={`text-[11px] font-medium shrink-0 px-1 ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
            Brand:
          </span>
          <button
            type="button"
            onClick={() => setSelectedBrand(null)}
            className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
              selectedBrand === null
                ? isTeslaDark ? 'bg-[#3E6AE1] text-white shadow-sm' : 'bg-[#0071E3] text-white shadow-sm'
                : isTeslaDark ? 'bg-[#181818] text-[#888888] hover:text-[#FFFFFF] border border-[#262626]' : 'bg-black/[0.04] text-zinc-600 hover:text-[#1d1d1f] border-[0.5px] border-black/10'
            }`}
          >
            ALL ({rack.devices.length})
          </button>
          {availableBrands.map((b) => {
            const isActive = selectedBrand?.toLowerCase() === b.name.toLowerCase()
            return (
              <button
                key={b.name}
                type="button"
                onClick={() => setSelectedBrand(isActive ? null : b.name)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? isTeslaDark ? 'bg-[#3E6AE1]/20 text-[#3E6AE1] border border-[#3E6AE1]/40 shadow-xs' : 'bg-[#0071E3]/15 text-[#0071E3] border-[0.5px] border-[#0071E3]/30 shadow-xs'
                    : isTeslaDark ? 'bg-[#181818] text-[#888888] hover:text-[#FFFFFF] border border-[#262626]' : 'bg-black/[0.04] text-zinc-600 hover:text-[#1d1d1f] border-[0.5px] border-black/10'
                }`}
                title={`Filter by ${b.name} (${b.count} units)`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: b.color }}
                />
                <span>{b.tag || b.name}</span>
                <span className="text-[10px] opacity-75 font-normal">({b.count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 42U Heavy-Duty Equipment Rack Cabinet Frame with Vertical Cable Channels */}
      <div className={`w-full p-3 rounded-[20px] backdrop-blur-2xl saturate-180 border shadow-xl relative transition-colors ${
        isTeslaDark
          ? "bg-[#0A0A0A] border-[#1F1F1F]"
          : "bg-white/80 border-black/10"
      }`}>
        {/* Top Extrusion Header: Left PDU A, Center 42U Cabinet, Right PDU B */}
        <div className={`h-7 border-b rounded-t-[14px] flex items-center justify-between px-3 text-[10px] font-mono mb-1.5 ${
          isTeslaDark
            ? "bg-[#121212] border-[#1F1F1F] text-[#888888]"
            : "bg-black/[0.03] border-black/10 text-zinc-500"
        }`}>
          <div className={`flex items-center gap-1.5 font-bold ${isTeslaDark ? "text-[#3E6AE1]" : "text-[#0071E3]"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isTeslaDark ? "bg-[#3E6AE1] shadow-[0_0_6px_#3E6AE1]" : "bg-[#0071E3] shadow-[0_0_6px_#0071E3]"}`} />
            <span>PDU-A (FEED A)</span>
          </div>
          <div className={`flex items-center gap-2 ${isTeslaDark ? "text-[#AAAAAA]" : "text-zinc-600"}`}>
            <span>42U EIA-310 STANDARD RACK</span>
            <span className={isTeslaDark ? "text-[#333333]" : "text-black/20"}>•</span>
            <span>482.6 mm</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#ff3b30] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b30] shadow-[0_0_6px_#ff3b30]" />
            <span>PDU-B (FEED B)</span>
          </div>
        </div>

        {/* 42U Rack Slots Container */}
        <div className="space-y-0.5">{uRows}</div>

        {/* Bottom Cabinet Plinth & Inlet Headers */}
        <div className={`h-7 border-t rounded-b-[14px] flex items-center justify-between px-3 text-[10px] font-mono mt-1.5 ${
          isTeslaDark
            ? "bg-[#121212] border-[#1F1F1F] text-[#888888]"
            : "bg-black/[0.03] border-black/10 text-zinc-500"
        }`}>
          <span className={isTeslaDark ? "text-[#3E6AE1]" : "text-[#0071E3]"}>230V • 16A BREAKER A: NOMINAL</span>
          <span className={isTeslaDark ? "text-[#AAAAAA]" : "text-zinc-600"}>CABLE TRAY INLET • LEVELING ENGAGED</span>
          <span className="text-[#ff3b30]">230V • 16A BREAKER B: NOMINAL</span>
        </div>
      </div>

      {/* Interactive Cable Inspection HUD Pill when Hovered/Selected */}
      {activeDevice && (
        <div className={`w-full mt-3 p-4 rounded-[16px] backdrop-blur-2xl border shadow-lg text-xs space-y-3 animate-fadeIn transition-colors ${
          isTeslaDark
            ? "bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]"
            : "bg-white/85 border-[#0071E3]/30 text-[#1d1d1f]"
        }`}>
          <div className={`flex items-center justify-between border-b pb-2 ${
            isTeslaDark ? "border-[#1F1F1F]" : "border-black/10"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center ${
                isTeslaDark ? "bg-[#3E6AE1]/20 text-[#3E6AE1]" : "bg-[#0071E3]/15 text-[#0071E3]"
              }`}>
                <Activity className="w-4 h-4" />
              </div>
              <span className={`font-semibold text-sm ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>{activeDevice.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-[6px] font-medium border ${
                isTeslaDark
                  ? "bg-[#181818] border-[#262626] text-[#A1A1A6]"
                  : "bg-black/[0.05] border-transparent text-zinc-700"
              }`}>
                U{activeDevice.start_u} ({activeDevice.height_u}U)
              </span>
            </div>
            <span className={`text-xs flex items-center gap-1 ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              {activeDevice.model || activeDevice.device_type}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* Feed A Info */}
            <div className={`p-3 rounded-[12px] border ${
              isTeslaDark
                ? "bg-[#161616] border-[#222222]"
                : "bg-black/[0.03] border-black/10"
            }`}>
              <span className={`font-semibold flex items-center gap-1.5 mb-1 ${isTeslaDark ? "text-[#3E6AE1]" : "text-[#0071E3]"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isTeslaDark ? "bg-[#3E6AE1]" : "bg-[#0071E3]"}`} />
                Feed A (Primary)
              </span>
              <span className={`block text-[11px] font-medium ${isTeslaDark ? "text-[#E0E0E0]" : "text-zinc-800"}`}>PDU-A Outlet #{activeDevice.start_u}</span>
              <span className={`text-[10px] mt-0.5 block ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>228V • 1.1A • 251W Nominal</span>
            </div>

            {/* Feed B Info */}
            <div
              className={`p-3 rounded-[12px] border ${
                singleCordedDevices.some((sc) => sc.id === activeDevice.id)
                  ? isTeslaDark ? 'bg-amber-950/30 border-amber-800/50' : 'bg-[#ff9500]/15 border-[#ff9500]/40'
                  : isTeslaDark ? 'bg-[#161616] border-[#222222]' : 'bg-black/[0.03] border-black/10'
              }`}
            >
              <span
                className={`font-semibold flex items-center gap-1.5 mb-1 ${
                  singleCordedDevices.some((sc) => sc.id === activeDevice.id)
                    ? 'text-[#ff9500]'
                    : 'text-[#ff3b30]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    singleCordedDevices.some((sc) => sc.id === activeDevice.id)
                      ? 'bg-[#ff9500] animate-ping'
                      : 'bg-[#ff3b30]'
                  }`}
                />
                Feed B (Redundant)
              </span>
              {singleCordedDevices.some((sc) => sc.id === activeDevice.id) ? (
                <span className="text-[#ff9500] font-semibold block text-[11px]">
                  DISCONNECTED (Single Cord Risk)
                </span>
              ) : (
                <>
                  <span className={`block text-[11px] font-medium ${isTeslaDark ? "text-[#E0E0E0]" : "text-zinc-800"}`}>PDU-B Outlet #{activeDevice.start_u}</span>
                  <span className={`text-[10px] mt-0.5 block ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>228V • 0.1A • Standby Active</span>
                </>
              )}
            </div>

            {/* Network Uplink Info */}
            <div className={`p-3 rounded-[12px] border ${
              isTeslaDark
                ? "bg-[#161616] border-[#222222]"
                : "bg-black/[0.03] border-black/10"
            }`}>
              <span className="text-[#34c759] font-semibold flex items-center gap-1.5 mb-1">
                <Wifi className="w-3.5 h-3.5 text-[#34c759]" />
                Network Uplink
              </span>
              <span className={`block text-[11px] font-medium ${isTeslaDark ? "text-[#E0E0E0]" : "text-zinc-800"}`}>SW-TOR-01 (Gi1/0/{activeDevice.start_u})</span>
              <span className="text-[10px] text-[#34c759] font-medium mt-0.5 block">10/25 GbE SFP28 Link UP</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
