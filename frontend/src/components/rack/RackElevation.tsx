import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
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

  // Filter devices
  const visibleDevices = rack.devices.filter((d) => {
    if (d.position_face !== face) return false
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

  // Render 42U slots from 42 down to 1
  const uRows = []
  for (let u = rack.total_u; u >= 1; u--) {
    const dev = slotMap[u]

    const isCoveredByHigherU = !dev && occupiedSlots.has(u)
    if (isCoveredByHigherU) continue

    if (dev) {
      const isDimmed =
        selectedBrand !== null &&
        dev.brand_info?.name.toLowerCase() !== selectedBrand.toLowerCase()

      uRows.push(
        <div key={`device-${dev.id}`} className="flex items-center w-full">
          {/* Left U Rail Number */}
          <div className="w-7 shrink-0 text-right pr-1.5 font-mono text-[9px] text-[#85a6b1] font-bold select-none">
            {u}
          </div>
          {/* Left Rack Ear Screw */}
          <div className="w-2.5 h-full flex items-center justify-center bg-[#273139] border-r border-[#394650] select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#414a50] border border-[#50626f]" />
          </div>
          {/* Device Faceplate */}
          <div className="flex-1 min-w-0">
            <DeviceBezel
              device={dev}
              isSelected={selectedDeviceId === dev.id}
              onClick={() => onSelectDevice(dev)}
              isDimmed={isDimmed}
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
        </div>
      )
    } else {
      uRows.push(
        <div key={`slot-${u}`} className="flex items-center w-full group/slot">
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
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col items-center select-none">
      {/* Front / Rear & Standard EIA-310 Header */}
      <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-[#394650] max-w-[460px]">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#85a6b1]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7aa5d2]" />
          <span>EIA-310-D 19&quot; SPEC</span>
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

      {/* Quick Brand Filter Chip Bar */}
      {availableBrands.length > 0 && (
        <div className="w-full max-w-[460px] mb-2 p-1.5 rounded-[3px] bg-[#1a2127] border border-[#394650] flex items-center gap-1.5 overflow-x-auto text-xs font-mono shadow-xs">
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

      {/* 42U Heavy-Duty Equipment Rack Cabinet Frame */}
      <div className="w-[460px] p-2.5 rounded-[3px] bg-[#1a2127] border-2 border-[#394650] shadow-2xl relative">
        {/* Top Cabinet Extrusion Frame */}
        <div className="h-4 bg-[#273139] border-b border-[#414a50] rounded-t-[2px] flex items-center justify-between px-3 text-[9px] font-mono text-[#85a6b1] mb-1">
          <span>TOP EXTRUSION</span>
          <span>42U STANDARD RACK</span>
          <span>482.6 mm</span>
        </div>

        {/* Rack Slots Container */}
        <div className="space-y-0.5">{uRows}</div>

        {/* Bottom Cabinet Plinth */}
        <div className="h-4 bg-[#273139] border-t border-[#414a50] rounded-b-[2px] flex items-center justify-between px-3 text-[9px] font-mono text-[#85a6b1] mt-1">
          <span>CABLE TRAY INLET</span>
          <span>LEVELING FEET ENGAGED</span>
        </div>
      </div>
    </div>
  )
}
