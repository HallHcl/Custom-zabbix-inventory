import { useState, useMemo } from 'react'
import { Plus, Zap, Wifi, AlertTriangle, Activity, Layers } from 'lucide-react'
import type { Device, RackElevation as RackElevationType } from '../../types'
import { DeviceBezel } from './DeviceBezel'

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
                className={`w-full h-1.5 rounded-l-xs transition-all relative flex items-center justify-end ${
                  feedAActive
                    ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8] brightness-125 z-10'
                    : 'bg-sky-600/70 hover:bg-sky-500'
                }`}
                title={`Feed A: PDU-A Outlet -> ${dev.name} PSU-1 (230V • 1.1A • 253W)`}
              >
                {/* Cable Lug / Terminal Bead */}
                <span className="w-1.5 h-1.5 rounded-full bg-sky-200 border border-sky-400 shadow-2xs mr-0.5" />
              </div>
            ) : (
              <div className="w-full h-0.5 bg-[#253039] opacity-40" />
            )}
          </div>

          {/* Left U Rail Number */}
          <div className="w-7 shrink-0 text-right pr-1.5 font-mono text-[9px] text-[#85a6b1] font-bold select-none">
            {u}
          </div>

          {/* Left Rack Ear Screw */}
          <div className="w-2.5 h-full flex items-center justify-center bg-[#273139] border-r border-[#394650] select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#414a50] border border-[#50626f]" />
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
          <div className="w-2.5 h-full flex items-center justify-center bg-[#273139] border-l border-[#394650] select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#414a50] border border-[#50626f]" />
          </div>

          {/* Right U Rail Number */}
          <div className="w-7 shrink-0 text-left pl-1.5 font-mono text-[9px] text-[#85a6b1] font-bold select-none">
            {u}
          </div>

          {/* Right Cable Finger / Breakout (PDU B - Redundant Feed & Network) */}
          <div className="w-12 shrink-0 h-full flex flex-col justify-center gap-0.5 pl-1 relative group/pdub select-none">
            {/* Feed B Power Cable or Severed Single-Corded Warning */}
            {showFeedB ? (
              isSingleCorded ? (
                /* Severed / Missing Feed B Cable Hazard */
                <div
                  className="w-full h-1.5 border-t border-b border-dashed border-amber-400 bg-amber-950/40 rounded-r-xs flex items-center justify-between px-0.5 animate-pulse"
                  title="CRITICAL REDUNDANCY RISK: Feed B unplugged / single-corded!"
                >
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                  <span className="w-1.5 h-1 bg-amber-500 rounded-3xs" />
                </div>
              ) : (
                /* Normal Redundant Feed B Cable */
                <div
                  className={`w-full h-1 rounded-r-xs transition-all relative flex items-center ${
                    feedBActive
                      ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e] brightness-125 z-10'
                      : 'bg-rose-700/70 hover:bg-rose-600'
                  }`}
                  title={`Feed B: PDU-B Outlet -> ${dev.name} PSU-2 (230V • 0.1A • Standby)`}
                >
                  <span className="w-1 h-1 rounded-full bg-rose-200 border border-rose-500 ml-0.5" />
                </div>
              )
            ) : null}

            {/* Network Data Cable (Fiber/Copper to ToR Switch) */}
            {showNetwork && (
              <div
                className={`w-full h-1 rounded-r-xs transition-all relative flex items-center ${
                  networkActive
                    ? 'bg-emerald-400 shadow-[0_0_8px_#10b981] brightness-125 z-10'
                    : 'bg-emerald-700/60 hover:bg-emerald-600'
                }`}
                title={`Network Uplink: ${dev.name} eth0 -> SW-TOR-01 (10/25GbE Active)`}
              >
                <span className="w-1 h-1 rounded-full bg-emerald-200 ml-0.5" />
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
            <div className="w-4 h-0.5 bg-[#253039] opacity-30" />
          </div>

          {/* Left U Rail Number */}
          <div className="w-7 shrink-0 text-right pr-1.5 font-mono text-[9px] text-[#85a6b1] select-none">
            {u}
          </div>

          {/* Left Rail Mounting Hole */}
          <div className="w-2.5 h-7 flex items-center justify-center bg-[#222b32] border-r border-[#34424b] select-none">
            <span className="w-1.5 h-1.5 rounded-xs bg-[#2c3841] border border-[#394650]" />
          </div>

          {/* Empty Slot Bay */}
          <div
            onClick={() => onEmptySlotClick(u)}
            className="flex-1 h-7 border-y border-dashed border-[#34424b] bg-[#1a2127] hover:bg-[#252f36] hover:border-[#7aa5d2]/50 transition-colors cursor-pointer flex items-center justify-center text-transparent hover:text-[#caedde] text-[10px] font-mono"
            title={`Mount hardware unit at U${u}`}
          >
            <div className="flex items-center gap-1.5 opacity-0 group-hover/slot:opacity-100 transition-opacity">
              <Plus className="w-3 h-3 text-[#7aa5d2]" />
              <span className="tracking-tight text-[#7aa5d2]">U{u} VACANT SLOT</span>
            </div>
          </div>

          {/* Right Rail Mounting Hole */}
          <div className="w-2.5 h-7 flex items-center justify-center bg-[#222b32] border-l border-[#34424b] select-none">
            <span className="w-1.5 h-1.5 rounded-xs bg-[#2c3841] border border-[#394650]" />
          </div>

          {/* Right U Rail Number */}
          <div className="w-7 shrink-0 text-left pl-1.5 font-mono text-[9px] text-[#85a6b1] select-none">
            {u}
          </div>

          {/* Right Empty Finger */}
          <div className="w-12 shrink-0 h-7 flex items-center pl-1">
            <div className="w-4 h-0.5 bg-[#253039] opacity-30" />
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
    <div className="flex flex-col items-center select-none max-w-[580px] w-full">
      {/* Front / Rear & Standard EIA-310 Header */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-[#394650]">
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#85a6b1]">
          <span className="w-2 h-2 rounded-full bg-[#7aa5d2]" />
          <span className="font-bold text-slate-200">EIA-310-D 19&quot; SPEC</span>
          <span className="text-[#50626f]">•</span>
          <span className="text-sky-400">PDU-A / PDU-B 2N REDUNDANCY</span>
        </div>

        {/* Front / Rear Hardware Selector */}
        <div className="flex items-center p-0.5 rounded-[2px] bg-[#20282f] border border-[#394650]">
          <button
            type="button"
            onClick={() => setFace('Front')}
            className={`px-3 py-1 rounded-[2px] text-xs font-mono font-bold transition-colors cursor-pointer ${
              face === 'Front'
                ? 'bg-[#34424b] text-[#7aa5d2] border border-[#50626f]'
                : 'text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            FRONT
          </button>
          <button
            type="button"
            onClick={() => setFace('Rear')}
            className={`px-3 py-1 rounded-[2px] text-xs font-mono font-bold transition-colors cursor-pointer ${
              face === 'Rear'
                ? 'bg-[#34424b] text-[#7aa5d2] border border-[#50626f]'
                : 'text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            REAR
          </button>
        </div>
      </div>

      {/* Redundancy Hazard Banner if any single-corded device exists */}
      {singleCordedDevices.length > 0 && (
        <div className="w-full mb-2 p-2 rounded-[3px] bg-amber-950/40 border border-amber-500/80 flex items-center justify-between text-xs font-mono shadow-md">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold">SINGLE-CORDED HAZARD: </span>
              <span className="text-amber-200/90">
                {singleCordedDevices[0].name} has no Feed B connection!
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCableFilter('FEED_B')}
            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/60 text-[10px] font-bold cursor-pointer transition-colors"
          >
            Inspect Feed B
          </button>
        </div>
      )}

      {/* Cable Tracing Filter Toolbar */}
      <div className="w-full mb-2 p-1.5 rounded-[3px] bg-[#1a2127] border border-[#394650] flex flex-wrap items-center justify-between gap-1.5 text-xs font-mono shadow-xs">
        <div className="flex items-center gap-1 text-[10px] text-[#85a6b1]">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold uppercase">Cabling:</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCableFilter('ALL')}
            className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold transition-all cursor-pointer ${
              cableFilter === 'ALL'
                ? 'bg-[#34424b] text-white border border-[#7aa5d2]'
                : 'bg-[#20282f] text-[#85a6b1] hover:text-white border border-[#394650]'
            }`}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() => setCableFilter('FEED_A')}
            className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              cableFilter === 'FEED_A'
                ? 'bg-sky-950/80 text-sky-300 border border-sky-400 shadow-[0_0_6px_#38bdf855]'
                : 'bg-[#20282f] text-sky-400/80 hover:text-sky-300 border border-[#394650]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-2xs" />
            FEED A (BLUE)
          </button>
          <button
            type="button"
            onClick={() => setCableFilter('FEED_B')}
            className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              cableFilter === 'FEED_B'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-400 shadow-[0_0_6px_#f43f5e55]'
                : 'bg-[#20282f] text-rose-400/80 hover:text-rose-300 border border-[#394650]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-2xs" />
            FEED B (RED)
          </button>
          <button
            type="button"
            onClick={() => setCableFilter('NETWORK')}
            className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              cableFilter === 'NETWORK'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-400 shadow-[0_0_6px_#10b98155]'
                : 'bg-[#20282f] text-emerald-400/80 hover:text-emerald-300 border border-[#394650]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-2xs" />
            NETWORK
          </button>
          <button
            type="button"
            onClick={() => setCableFilter('NONE')}
            className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold transition-all cursor-pointer ${
              cableFilter === 'NONE'
                ? 'bg-[#34424b] text-white border border-[#7aa5d2]'
                : 'bg-[#20282f] text-[#85a6b1] hover:text-white border border-[#394650]'
            }`}
          >
            HIDE
          </button>
        </div>
      </div>

      {/* Quick Brand Filter Chip Bar */}
      {availableBrands.length > 0 && (
        <div className="w-full mb-2 p-1.5 rounded-[3px] bg-[#1a2127] border border-[#394650] flex items-center gap-1.5 overflow-x-auto text-xs font-mono shadow-xs">
          <span className="text-[9px] text-[#85a6b1] font-bold uppercase shrink-0 px-1">
            Brand:
          </span>
          <button
            type="button"
            onClick={() => setSelectedBrand(null)}
            className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
              selectedBrand === null
                ? 'bg-[#34424b] text-[#7aa5d2] border border-[#7aa5d2]/60 shadow-xs'
                : 'bg-[#20282f] text-[#85a6b1] hover:text-[#caedde] border border-[#394650]'
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
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#252f36] border text-white shadow-xs'
                    : 'bg-[#20282f] text-[#85a6b1] hover:text-[#caedde] border border-[#394650]'
                }`}
                style={{
                  borderColor: isActive ? b.color : undefined,
                  boxShadow: isActive ? `0 0 8px ${b.color}44` : undefined,
                }}
                title={`Filter by ${b.name} (${b.count} units)`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: b.color }}
                />
                <span>{b.tag || b.name}</span>
                <span className="text-[8.5px] opacity-75 font-normal">({b.count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 42U Heavy-Duty Equipment Rack Cabinet Frame with Vertical Cable Channels */}
      <div className="w-full p-2.5 rounded-[3px] bg-[#1a2127] border-2 border-[#394650] shadow-2xl relative">
        {/* Top Extrusion Header: Left PDU A, Center 42U Cabinet, Right PDU B */}
        <div className="h-6 bg-[#273139] border-b border-[#414a50] rounded-t-[2px] flex items-center justify-between px-2 text-[9px] font-mono text-[#85a6b1] mb-1">
          <div className="flex items-center gap-1 text-sky-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_4px_#38bdf8]" />
            <span>PDU-A (FEED A)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>42U EIA-310 STANDARD RACK</span>
            <span className="text-[#50626f]">•</span>
            <span>482.6 mm</span>
          </div>
          <div className="flex items-center gap-1 text-rose-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_4px_#f43f5e]" />
            <span>PDU-B (FEED B)</span>
          </div>
        </div>

        {/* 42U Rack Slots Container */}
        <div className="space-y-0.5">{uRows}</div>

        {/* Bottom Cabinet Plinth & Inlet Headers */}
        <div className="h-6 bg-[#273139] border-t border-[#414a50] rounded-b-[2px] flex items-center justify-between px-2 text-[9px] font-mono text-[#85a6b1] mt-1">
          <span className="text-sky-400">230V • 16A BREAKER A: OK</span>
          <span>CABLE TRAY INLET • LEVELING FEET ENGAGED</span>
          <span className="text-rose-400">230V • 16A BREAKER B: OK</span>
        </div>
      </div>

      {/* Interactive Cable Inspection HUD Pill when Hovered/Selected */}
      {activeDevice && (
        <div className="w-full mt-2 p-2.5 rounded-[3px] bg-[#151c22] border border-sky-600/60 shadow-lg text-xs font-mono space-y-1.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#2d3a43] pb-1">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold text-white">{activeDevice.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#20282f] border border-[#394650] rounded text-[#8bd7d1]">
                U{activeDevice.start_u} ({activeDevice.height_u}U)
              </span>
            </div>
            <span className="text-[10px] text-[#85a6b1] flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#85a6b1]" />
              {activeDevice.model || activeDevice.device_type}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
            {/* Feed A Info */}
            <div className="p-1.5 rounded bg-[#10161b] border border-sky-800/60">
              <span className="text-sky-400 font-bold block flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Feed A (Primary)
              </span>
              <span className="text-slate-200 block mt-0.5">PDU-A Outlet #{activeDevice.start_u}</span>
              <span className="text-[9px] text-[#85a6b1]">228V • 1.1A • 251W Nominal</span>
            </div>

            {/* Feed B Info */}
            <div
              className={`p-1.5 rounded ${
                singleCordedDevices.some((sc) => sc.id === activeDevice.id)
                  ? 'bg-amber-950/40 border border-amber-500/80'
                  : 'bg-[#10161b] border border-rose-800/60'
              }`}
            >
              <span
                className={`font-bold block flex items-center gap-1 ${
                  singleCordedDevices.some((sc) => sc.id === activeDevice.id)
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    singleCordedDevices.some((sc) => sc.id === activeDevice.id)
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-rose-400'
                  }`}
                />
                Feed B (Redundant)
              </span>
              {singleCordedDevices.some((sc) => sc.id === activeDevice.id) ? (
                <span className="text-amber-300 font-bold block mt-0.5">
                  DISCONNECTED (Single Cord Risk)
                </span>
              ) : (
                <>
                  <span className="text-slate-200 block mt-0.5">PDU-B Outlet #{activeDevice.start_u}</span>
                  <span className="text-[9px] text-[#85a6b1]">228V • 0.1A • Standby Active</span>
                </>
              )}
            </div>

            {/* Network Uplink Info */}
            <div className="p-1.5 rounded bg-[#10161b] border border-emerald-800/60">
              <span className="text-emerald-400 font-bold block flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-400" />
                Network Uplink
              </span>
              <span className="text-slate-200 block mt-0.5">SW-TOR-01 (Gi1/0/{activeDevice.start_u})</span>
              <span className="text-[9px] text-emerald-300 font-semibold">10/25 GbE SFP28 Link UP</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
