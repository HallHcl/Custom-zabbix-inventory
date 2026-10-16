import { Server, Database, AlertTriangle, Thermometer } from 'lucide-react'

interface RoomStatsCardsProps {
  totalRacks: number
  totalDevices: number
  totalAlerts: number
  roomTemp: number
}

export function RoomStatsCards({
  totalRacks,
  totalDevices,
  totalAlerts,
  roomTemp,
}: RoomStatsCardsProps) {
  const cards = [
    {
      title: 'Racks',
      value: totalRacks,
      icon: Server,
      iconBg: 'bg-[#181818] text-white border border-[#2b2b2b]',
    },
    {
      title: 'Devices',
      value: totalDevices,
      icon: Database,
      iconBg: 'bg-[#181818] text-zinc-300 border border-[#2b2b2b]',
    },
    {
      title: 'Alerts',
      value: totalAlerts,
      icon: AlertTriangle,
      iconBg:
        totalAlerts > 0
          ? 'bg-rose-950/40 text-rose-400 border border-rose-800/60'
          : 'bg-[#181818] text-emerald-400 border border-[#2b2b2b]',
    },
    {
      title: 'Room Temp',
      value: `${roomTemp.toFixed(1)}°C`,
      icon: Thermometer,
      iconBg: 'bg-[#181818] text-zinc-300 border border-[#2b2b2b]',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="p-5 rounded-2xl bg-[#0f0f0f] border border-[#222222] shadow-lg flex items-center justify-between transition-all hover:border-[#383838]"
          >
            <div>
              <div className="text-3xl font-bold tracking-tight text-white mb-1 font-sans">
                {card.value}
              </div>
              <div className="text-xs font-medium text-zinc-400">{card.title}</div>
            </div>
            <div className={`p-3 rounded-xl ${card.iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
