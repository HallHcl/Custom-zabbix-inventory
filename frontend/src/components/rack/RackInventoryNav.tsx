import { Search, Layers, Server, Network, Shield, HardDrive, BatteryCharging, MinusSquare, Cable } from 'lucide-react'
import type { Device } from '../../types'
import { useTheme } from '../../lib/theme'

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
  const { isTeslaDark } = useTheme()

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
    <div className={`w-60 rounded-[20px] backdrop-blur-2xl border shadow-sm flex flex-col justify-between select-none shrink-0 overflow-hidden transition-colors ${
      isTeslaDark
        ? "bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]"
        : "bg-white/75 border-black/10 text-[#1d1d1f]"
    }`}>
      <div>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          isTeslaDark ? "border-[#1F1F1F]" : "border-black/5"
        }`}>
          <span className={`font-semibold text-xs tracking-[-0.011em] ${isTeslaDark ? "text-[#F5F5F7]" : "text-[#1d1d1f]"}`}>Hardware Filters</span>
          <span className={`text-[11px] font-medium ${isTeslaDark ? "text-[#888888]" : "text-zinc-500"}`}>{devices.length} Units</span>
        </div>

        <div className="p-3 space-y-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
              isTeslaDark ? "text-[#666666]" : "text-zinc-400"
            }`} />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter rack units..."
              className={`w-full text-xs pl-8 pr-3 py-2 rounded-[10px] border transition-colors focus:outline-none ${
                isTeslaDark
                  ? "bg-[#181818] text-[#F5F5F7] placeholder-[#666666] border-[#262626] focus:border-[#3E6AE1]"
                  : "bg-black/[0.04] text-[#1d1d1f] placeholder:text-zinc-400 border-black/10 focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]"
              }`}
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
                      ? isTeslaDark ? 'bg-[#3E6AE1] text-white shadow-sm' : 'bg-[#0071E3] text-white shadow-sm'
                      : isTeslaDark
                      ? 'text-[#AAAAAA] hover:text-[#FFFFFF] hover:bg-[#181818]'
                      : 'text-zinc-600 hover:text-black hover:bg-black/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${
                      isSelected ? 'text-white' : isTeslaDark ? 'text-[#888888]' : 'text-zinc-500'
                    }`} />
                    <span className="text-xs">{cat.label}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : isTeslaDark
                        ? 'bg-[#1C1C1C] text-[#888888] border border-[#262626]'
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

      <div className={`px-3.5 py-2.5 border-t text-[11px] font-medium flex items-center justify-between ${
        isTeslaDark
          ? "border-[#1F1F1F] bg-[#0E0E0E] text-[#888888]"
          : "border-black/5 bg-black/[0.02] text-zinc-500"
      }`}>
        <span>Active Slot Filter</span>
        <span className={`font-semibold ${isTeslaDark ? "text-[#3E6AE1]" : "text-[#0071E3]"}`}>{selectedType || 'ALL'}</span>
      </div>
    </div>
  )
}
