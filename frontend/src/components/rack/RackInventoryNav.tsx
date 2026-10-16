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
    { id: null, label: 'All Devices', count: counts.all, icon: Layers },
    { id: 'Patch Panel', label: 'Patch Panel', count: counts['Patch Panel'], icon: Cable },
    { id: 'Switch', label: 'Switch', count: counts.Switch, icon: Network },
    { id: 'Firewall', label: 'Firewall', count: counts.Firewall, icon: Shield },
    { id: 'Server', label: 'Server', count: counts.Server, icon: Server },
    { id: 'Storage', label: 'Storage', count: counts.Storage, icon: HardDrive },
    { id: 'UPS', label: 'UPS', count: counts.UPS, icon: BatteryCharging },
    { id: 'Blank Panel', label: 'Blank Panel', count: counts['Blank Panel'], icon: MinusSquare },
  ]

  return (
    <div className="w-64 p-4 rounded-2xl bg-[#0f0f0f] border border-[#222222] shadow-xl flex flex-col gap-4 select-none">
      <div>
        <h3 className="font-bold text-white text-sm mb-3 tracking-wide">Rack Inventory</h3>
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter rack devices..."
            className="w-full bg-[#171717] text-xs text-white placeholder:text-zinc-500 pl-8 pr-3 py-2 rounded-xl border border-[#262626] focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-1">
        {navCategories.map((cat) => {
          const Icon = cat.icon
          const isActive = selectedType === cat.id

          return (
            <button
              key={cat.label}
              type="button"
              onClick={() => onSelectType(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1f1f1f] text-white border border-[#333333] shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141414]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                <span>{cat.label}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${
                  isActive ? 'bg-white text-black font-bold' : 'bg-[#181818] text-zinc-400'
                }`}
              >
                {cat.count || 0}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
