import { useState } from 'react'
import { Eye, Activity, Thermometer, Zap, RotateCcw, Plus, Minus } from 'lucide-react'
import type { RackSummary } from '../../types'

interface IsometricRoomProps {
  racks: RackSummary[]
  selectedRackId: number | null
  onSelectRack: (rack: RackSummary) => void
  statusCounts: {
    healthy: number
    warning: number
    critical: number
    offline: number
  }
}

type ViewMode = '3d' | 'status' | 'temp' | 'power'

export function IsometricRoom({
  racks,
  selectedRackId,
  onSelectRack,
  statusCounts,
}: IsometricRoomProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('3d')
  const [zoom, setZoom] = useState<number>(1)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Isometric projection coordinates
  const getRackCoordinates = (rowLetter: string, colNum: number) => {
    const rowIdx = rowLetter.includes('C') ? 0 : rowLetter.includes('B') ? 1 : 2
    const colIdx = colNum - 1

    const originX = 540
    const originY = 240
    const tileW = 110
    const tileH = 55

    const isoX = originX + (colIdx - rowIdx) * tileW
    const isoY = originY + (colIdx + rowIdx) * tileH
    return { x: isoX, y: isoY }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return '#e82127' // Tesla Red
      case 'warning':
        return '#f59e0b' // Amber yellow
      case 'offline':
        return '#52525b' // Slate
      case 'healthy':
      default:
        return '#10b981' // Emerald
    }
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 1.4))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.7))
  const handleReset = () => {
    setZoom(1)
    setStatusFilter(null)
  }

  return (
    <div className="relative rounded-2xl bg-[#090909] border border-[#1f1f1f] shadow-2xl overflow-hidden flex flex-col h-[520px]">
      {/* Top View Mode Toggles */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1 p-1 rounded-xl bg-[#141414]/90 border border-[#262626] backdrop-blur shadow-lg">
        <button
          type="button"
          onClick={() => setViewMode('3d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            viewMode === '3d'
              ? 'bg-[#292929] text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>3D View</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('status')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'status'
              ? 'bg-[#292929] text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Status</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('temp')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'temp'
              ? 'bg-[#292929] text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5" />
          <span>Temperature</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('power')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'power'
              ? 'bg-[#292929] text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Power</span>
        </button>
      </div>

      {/* Main Isometric SVG Room Canvas */}
      <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing">
        <svg
          viewBox="0 0 1080 580"
          className="w-full h-full transition-transform duration-300"
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            {/* Tesla Floor Tiles Pattern */}
            <pattern id="floorTilesTesla" width="40" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 40 10 L 20 20 L 0 10 Z"
                fill="#0d0d0d"
                stroke="#1c1c1c"
                strokeWidth="0.7"
              />
            </pattern>

            {/* Aisle Grid */}
            <pattern id="aisleTiles" width="40" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 40 10 L 20 20 L 0 10 Z"
                fill="#161616"
                stroke="#2b2b2b"
                strokeWidth="0.8"
              />
            </pattern>

            <filter id="teslaGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Back Walls */}
          <polygon points="120,180 540,60 540,300 120,420" fill="#141414" stroke="#222222" />
          <polygon points="540,60 960,180 960,420 540,300" fill="#0f0f0f" stroke="#222222" />

          {/* Double Doors */}
          <polygon points="500,105 580,80 580,240 500,265" fill="#1c1c1c" stroke="#2c2c2c" />
          <line x1="540" y1="92" x2="540" y2="252" stroke="#3f3f46" strokeWidth="2" />

          {/* Overhead Cable Trays */}
          <line x1="180" y1="200" x2="540" y2="100" stroke="#52525b" strokeWidth="2.5" opacity="0.4" />
          <line x1="540" y1="100" x2="900" y2="200" stroke="#52525b" strokeWidth="2.5" opacity="0.4" />

          {/* Floor */}
          <polygon points="120,420 540,300 960,420 540,540" fill="url(#floorTilesTesla)" />

          {/* Cold Aisle Mat */}
          <polygon
            points="280,380 540,290 800,380 540,470"
            fill="url(#aisleTiles)"
            opacity="0.9"
          />

          {/* CRAC Cooling Units */}
          <g transform="translate(180, 260)">
            <polygon points="0,40 40,25 40,110 0,125" fill="#181818" stroke="#2a2a2a" />
            <polygon points="40,25 90,45 90,130 40,110" fill="#111111" stroke="#2a2a2a" />
            <polygon points="0,40 40,25 90,45 50,60" fill="#242424" stroke="#333333" />
            <circle cx="65" cy="80" r="11" fill="#3f3f46" opacity="0.8" />
            <circle cx="65" cy="110" r="11" fill="#3f3f46" opacity="0.8" />
          </g>

          <g transform="translate(810, 260)">
            <polygon points="0,45 50,25 50,110 0,130" fill="#111111" stroke="#2a2a2a" />
            <polygon points="50,25 90,40 90,125 50,110" fill="#181818" stroke="#2a2a2a" />
            <polygon points="0,45 50,25 90,40 40,60" fill="#242424" stroke="#333333" />
            <circle cx="25" cy="80" r="11" fill="#3f3f46" opacity="0.8" />
            <circle cx="25" cy="110" r="11" fill="#3f3f46" opacity="0.8" />
          </g>

          {/* 12 Racks */}
          {racks.map((rack) => {
            const { x, y } = getRackCoordinates(rack.row, rack.col)
            const isSelected = selectedRackId === rack.id
            const isDimmed = statusFilter !== null && rack.status !== statusFilter
            const statusColor = getStatusColor(rack.status)

            let badgeText = rack.name.replace('Rack ', '')
            if (viewMode === 'temp') badgeText = `${rack.inlet_temp_c}°C`
            if (viewMode === 'power') badgeText = `${rack.power_kw}kW`
            if (viewMode === 'status') badgeText = rack.status.toUpperCase()

            const rackHeight = 85
            const rackWidth = 44
            const rackDepth = 30

            return (
              <g
                key={rack.id}
                onClick={() => onSelectRack(rack)}
                className={`cursor-pointer transition-opacity duration-200 ${
                  isDimmed ? 'opacity-30' : 'opacity-100'
                }`}
              >
                {/* Selection Ring */}
                {isSelected && (
                  <ellipse
                    cx={x}
                    cy={y + 12}
                    rx="38"
                    ry="18"
                    fill="#ffffff"
                    fillOpacity="0.1"
                    stroke="#ffffff"
                    strokeWidth="2"
                    filter="url(#teslaGlow)"
                  />
                )}

                {/* Base Shadow */}
                <ellipse cx={x} cy={y + 10} rx="26" ry="12" fill="#000000" fillOpacity="0.8" />

                {/* Front Left Face */}
                <polygon
                  points={`${x - rackWidth / 2},${y - rackHeight + 8} ${x},${y - rackHeight + 20} ${x},${y + 12} ${x - rackWidth / 2},${y}`}
                  fill={isSelected ? '#2e2e2e' : '#1c1c1c'}
                  stroke={isSelected ? '#ffffff' : '#333333'}
                  strokeWidth={isSelected ? '2' : '1'}
                />

                {/* Front Right Face */}
                <polygon
                  points={`${x},${y - rackHeight + 20} ${x + rackDepth},${y - rackHeight + 6} ${x + rackDepth},${y - 2} ${x},${y + 12}`}
                  fill={isSelected ? '#222222' : '#141414'}
                  stroke={isSelected ? '#ffffff' : '#333333'}
                  strokeWidth={isSelected ? '2' : '1'}
                />

                {/* Top Face */}
                <polygon
                  points={`${x - rackWidth / 2},${y - rackHeight + 8} ${x},${y - rackHeight - 4} ${x + rackDepth},${y - rackHeight + 6} ${x},${y - rackHeight + 20}`}
                  fill={isSelected ? '#3f3f46' : '#262626'}
                  stroke={isSelected ? '#ffffff' : '#404040'}
                  strokeWidth={isSelected ? '2' : '1'}
                />

                {/* Status LED */}
                <circle
                  cx={x + 5}
                  cy={y - rackHeight + 8}
                  r={isSelected ? '5.5' : '4'}
                  fill={statusColor}
                  filter="url(#teslaGlow)"
                  className="animate-pulse"
                />

                {/* Label Floating above Rack */}
                <g transform={`translate(${x - 30}, ${y - rackHeight - 26})`}>
                  <rect
                    width="60"
                    height="18"
                    rx="6"
                    fill={isSelected ? '#ffffff' : '#141414'}
                    fillOpacity="0.95"
                    stroke={isSelected ? '#ffffff' : '#333333'}
                    strokeWidth="1"
                  />
                  <text
                    x="30"
                    y="13"
                    textAnchor="middle"
                    fill={isSelected ? '#000000' : '#ffffff'}
                    fontSize="10"
                    fontWeight="700"
                    letterSpacing="0.5"
                  >
                    {badgeText}
                  </text>
                </g>
              </g>
            )
          })}

          {/* Front Wall */}
          <polygon
            points="120,420 540,540 960,420 960,435 540,555 120,435"
            fill="#27272a"
            fillOpacity="0.2"
            stroke="#3f3f46"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Bottom Controls & Clickable Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Clickable Status Legend */}
        <div className="pointer-events-auto flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#141414]/90 border border-[#262626] backdrop-blur text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'healthy' ? null : 'healthy')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'healthy' ? 'bg-[#262626] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
            <span>Healthy ({statusCounts.healthy})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'warning' ? null : 'warning')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'warning' ? 'bg-[#262626] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
            <span>Warning ({statusCounts.warning})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'critical' ? null : 'critical')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'critical' ? 'bg-[#262626] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#e82127] shadow-sm" />
            <span>Critical ({statusCounts.critical})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'offline' ? null : 'offline')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'offline' ? 'bg-[#262626] text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
            <span>Offline ({statusCounts.offline})</span>
          </button>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-[#141414]/90 border border-[#262626] backdrop-blur shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#222222] rounded-lg transition-colors cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#222222] rounded-lg transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#222222] rounded-lg transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
