import { useState } from 'react'
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
      uRows.push(
        <div key={`device-${dev.id}`} className="flex items-center w-full">
          <div className="w-8 shrink-0 text-right pr-2 font-mono text-[10px] text-zinc-500 font-bold select-none">
            {u}
          </div>
          <div className="flex-1">
            <DeviceBezel
              device={dev}
              isSelected={selectedDeviceId === dev.id}
              onClick={() => onSelectDevice(dev)}
            />
          </div>
        </div>
      )
    } else {
      uRows.push(
        <div key={`slot-${u}`} className="flex items-center w-full group/slot">
          <div className="w-8 shrink-0 text-right pr-2 font-mono text-[10px] text-zinc-600 font-medium select-none">
            {u}
          </div>
          <div
            onClick={() => onEmptySlotClick(u)}
            className="flex-1 h-7 border-y border-dashed border-[#222222] bg-[#0d0d0d] hover:bg-zinc-800/40 hover:border-zinc-500 transition-all cursor-pointer flex items-center justify-center text-transparent hover:text-white text-xs font-medium"
            title={`Click to mount device at U${u}`}
          >
            <div className="flex items-center gap-1.5 opacity-0 group-hover/slot:opacity-100 transition-opacity">
              <Plus className="w-3.5 h-3.5" />
              <span>Mount at U{u}</span>
            </div>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Front / Rear Toggle */}
      <div className="flex items-center p-1 rounded-xl bg-[#141414] border border-[#262626] mb-4 shadow-md">
        <button
          type="button"
          onClick={() => setFace('Front')}
          className={`px-6 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            face === 'Front'
              ? 'bg-white text-black shadow-md font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Front
        </button>
        <button
          type="button"
          onClick={() => setFace('Rear')}
          className={`px-6 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            face === 'Rear'
              ? 'bg-white text-black shadow-md font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Rear
        </button>
      </div>

      {/* 42U Cabinet Frame */}
      <div className="w-[430px] p-3 rounded-2xl bg-[#0a0a0a] border-4 border-[#1f1f1f] shadow-2xl relative">
        <div className="absolute top-3 bottom-3 left-10 w-1 bg-[#2b2b2b] rounded-full" />
        <div className="absolute top-3 bottom-3 right-3 w-1 bg-[#2b2b2b] rounded-full" />
        <div className="space-y-0.5">{uRows}</div>
      </div>
    </div>
  )
}
