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

    // If this slot is covered by a multi-U device that started higher up, skip rendering row
    const isCoveredByHigherU = !dev && occupiedSlots.has(u)
    if (isCoveredByHigherU) continue

    if (dev) {
      uRows.push(
        <div key={`device-${dev.id}`} className="flex items-center w-full">
          {/* U number indicator */}
          <div className="w-8 shrink-0 text-right pr-2 font-mono text-[10px] text-slate-500 font-bold select-none">
            {u}
          </div>
          {/* Bezel */}
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
      // Empty slot
      uRows.push(
        <div key={`slot-${u}`} className="flex items-center w-full group/slot">
          <div className="w-8 shrink-0 text-right pr-2 font-mono text-[10px] text-slate-600 font-medium select-none">
            {u}
          </div>
          <div
            onClick={() => onEmptySlotClick(u)}
            className="flex-1 h-7 border-y border-dashed border-slate-800/80 bg-slate-900/30 hover:bg-cyan-500/10 hover:border-cyan-500/40 transition-all cursor-pointer flex items-center justify-center text-transparent hover:text-cyan-400 text-xs font-medium"
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
      <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 mb-4 shadow-md">
        <button
          type="button"
          onClick={() => setFace('Front')}
          className={`px-6 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            face === 'Front'
              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Front
        </button>
        <button
          type="button"
          onClick={() => setFace('Rear')}
          className={`px-6 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            face === 'Rear'
              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Rear
        </button>
      </div>

      {/* 42U Cabinet Frame */}
      <div className="w-[430px] p-3 rounded-2xl bg-[#090e17] border-4 border-slate-800/90 shadow-2xl relative">
        {/* Mounting Rails Left and Right */}
        <div className="absolute top-3 bottom-3 left-10 w-1.5 bg-slate-700/60 rounded-full" />
        <div className="absolute top-3 bottom-3 right-3 w-1.5 bg-slate-700/60 rounded-full" />

        {/* Rack U Rows */}
        <div className="space-y-0.5">{uRows}</div>
      </div>
    </div>
  )
}
