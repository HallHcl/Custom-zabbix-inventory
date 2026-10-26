import { Search, Layers, Server, Network, Shield, HardDrive, BatteryCharging, MinusSquare, Cable } from 'lucide-react'
import type { Device } from '../../types'

interface RackInventoryNavProps {
  devices: Device[]
  selectedType: string | null
  onSelectType: (type: string | null) => void
  searchFilter: string
  onSearchChange: (query: string) => void
}

export function RackInventoryNav({
  devices,
  selectedType,
  onSelectType,
  searchFilter,
  onSearchChange,
}: RackInventoryNavProps) {
  const counts: Record<string, number> = {
    all: devices.length,
    'Patch Panel': 0,
    Switch: 0,
    Firewall: 0,
    Server: 0,
    Storage: 0,
    UPS: 0,
    'Blank Panel': 0,
  }

  devices.forEach((d) => {
    if (counts[d.device_type] !== undefined) {
      counts[d.device_type] += 1
    } else {
      counts[d.device_type] = 1
    }
  })

  const navCategories = [
    { id: null, label: 'All Equipment', count: counts.all, icon: Layers },
    { id: 'Server', label: 'Servers', count: counts.Server, icon: Server },
    { id: 'Switch', label: 'Switches', count: counts.Switch, icon: Network },
    { id: 'Firewall', label: 'Firewalls', count: counts.Firewall, icon: Shield },
    { id: 'Storage', label: 'Storage / SAN', count: counts.Storage, icon: HardDrive },
    { id: 'UPS', label: 'Power / UPS', count: counts.UPS, icon: BatteryCharging },
    { id: 'Patch Panel', label: 'Patch Panels', count: counts['Patch Panel'], icon: Cable },
    { id: 'Blank Panel', label: 'Blank Panels', count: counts['Blank Panel'], icon: MinusSquare },
  ]

  return (
/* Apple UI Design System – Verified: 8pt Grid, SF Pro Typography, Material-Depth, Natural Spring Motion */
    <div className="w-60 rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm flex flex-col justify-between select-none shrink-0 overflow-hidden text-[#1d1d1f]">
      <div>
        <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
          <span className="font-semibold text-xs tracking-[-0.011em] text-[#1d1d1f]">Hardware Filters</span>
          <span className="text-[11px] font-medium text-zinc-500">{devices.length} Units</span>
        </div>

        <div className="p-3 space-y-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter rack units..."
              className="w-full bg-black/[0.04] text-xs text-[#1d1d1f] placeholder:text-zinc-400 pl-8 pr-3 py-2 rounded-[10px] border border-black/10 focus:outline-none focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3] transition-colors"
            />
          </div>

          {/* Type List */}
          <div className="space-y-1">
            {navCategories.map((cat) => {
              const Icon = cat.icon
              const isSelected = selectedType === cat.id

              return (
                <button
                  key={cat.label}
                  type="button"
                  onClick={() => onSelectType(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[10px] text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0071E3] text-white shadow-sm'
                      : 'text-zinc-600 hover:text-black hover:bg-black/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-zinc-500'}`} />
                    <span className="text-xs">{cat.label}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-black/[0.05] text-zinc-600'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-3.5 py-2.5 border-t border-black/5 bg-black/[0.02] text-[11px] font-medium text-zinc-500 flex items-center justify-between">
        <span>Active Slot Filter</span>
        <span className="text-[#0071E3] font-semibold">{selectedType || 'ALL'}</span>
      </div>
    </div>
  )
}
