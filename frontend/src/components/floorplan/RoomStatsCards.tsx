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
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    },
    {
      title: 'Devices',
      value: totalDevices,
      icon: Database,
      iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    },
    {
      title: 'Alerts',
      value: totalAlerts,
      icon: AlertTriangle,
      iconBg:
        totalAlerts > 0
          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    },
    {
      title: 'Room Temp',
      value: `${roomTemp.toFixed(1)}°C`,
      icon: Thermometer,
      iconBg: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-md backdrop-blur flex items-center justify-between transition-all hover:border-slate-700"
          >
            <div>
              <div className="text-3xl font-bold tracking-tight text-white mb-1">
                {card.value}
              </div>
              <div className="text-xs font-medium text-slate-400">{card.title}</div>
            </div>
            <div className={`p-3.5 rounded-2xl ${card.iconBg} shadow-inner`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
