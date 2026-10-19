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
    <div className="w-60 noc-panel flex flex-col justify-between select-none shrink-0">
      <div>
        <div className="noc-panel-header">
          <span className="font-mono uppercase tracking-wider text-[11px]">Hardware Filters</span>
          <span className="text-[10px] text-[#85a6b1] font-mono">{devices.length} Units</span>
        </div>

        <div className="p-3 space-y-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#85a6b1] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter rack units..."
              className="w-full bg-[#273139] text-xs text-[#caedde] placeholder:text-[#85a6b1] pl-8 pr-2.5 py-1.5 rounded-[3px] border border-[#394650] focus:outline-none focus:border-[#8bd7d1] transition-colors font-mono"
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
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[3px] text-xs font-mono transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#34424b] text-[#caedde] border border-[#50626f]'
                      : 'text-[#85a6b1] hover:text-[#caedde] hover:bg-[#252f36] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#8bd7d1]' : 'text-[#85a6b1]'}`} />
                    <span className="text-[11px]">{cat.label}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold ${
                      isSelected
                        ? 'bg-[#414a50] text-[#8bd7d1]'
                        : 'bg-[#273139] text-[#85a6b1]'
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

      <div className="p-2.5 border-t border-[#394650] bg-[#20282f] text-[10px] font-mono text-[#85a6b1] flex items-center justify-between">
        <span>Active Slot Filter</span>
        <span className="text-[#8bd7d1] font-bold">{selectedType || 'ALL'}</span>
      </div>
    </div>
  )
}
