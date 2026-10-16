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

  // Isometric projection helper
  // Grid coordinates: row (0: C, 1: B, 2: A), col (0..3)
  const getRackCoordinates = (rowLetter: string, colNum: number) => {
    const rowIdx = rowLetter.includes('C') ? 0 : rowLetter.includes('B') ? 1 : 2
    const colIdx = colNum - 1

    // 2.5D Isometric projection mapping
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
        return '#f43f5e' // Rose red
      case 'warning':
        return '#f59e0b' // Amber yellow
      case 'offline':
        return '#64748b' // Slate
      case 'healthy':
      default:
        return '#10b981' // Emerald green
    }
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 1.4))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.7))
  const handleReset = () => setZoom(1)

  return (
    <div className="relative rounded-2xl bg-[#090f1d] border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col h-[520px]">
      {/* Top View Mode Toggles */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur shadow-lg">
        <button
          type="button"
          onClick={() => setViewMode('3d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            viewMode === '3d'
              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>3D View</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('status')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'status'
              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Status</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('temp')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'temp'
              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5" />
          <span>Temperature</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('power')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'power'
              ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200'
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
            {/* Ambient Room Grid Floor Pattern */}
            <pattern id="floorTiles" width="40" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 40 10 L 20 20 L 0 10 Z"
                fill="#0b1322"
                stroke="#1e293b"
                strokeWidth="0.6"
              />
            </pattern>

            {/* Blue Airflow Perforated Tiles under Racks */}
            <pattern id="coolTiles" width="40" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 20 0 L 40 10 L 20 20 L 0 10 Z"
                fill="#082f49"
                stroke="#0284c7"
                strokeWidth="0.8"
              />
            </pattern>

            {/* Glowing filter for status LEDs */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Room Walls & Perimeter */}
          {/* Back Wall Left */}
          <polygon points="120,180 540,60 540,300 120,420" fill="#152136" stroke="#1e293b" />
          {/* Back Wall Right */}
          <polygon points="540,60 960,180 960,420 540,300" fill="#111c30" stroke="#1e293b" />

          {/* Data Center Double Doors on back wall */}
          <polygon points="500,105 580,80 580,240 500,265" fill="#1e293b" stroke="#334155" />
          <line x1="540" y1="92" x2="540" y2="252" stroke="#475569" strokeWidth="2" />

          {/* Cable Trays & Overhead Pipes */}
          <line x1="180" y1="200" x2="540" y2="100" stroke="#38bdf8" strokeWidth="3" opacity="0.6" />
          <line x1="540" y1="100" x2="900" y2="200" stroke="#38bdf8" strokeWidth="3" opacity="0.6" />

          {/* Floor Polygon */}
          <polygon points="120,420 540,300 960,420 540,540" fill="url(#floorTiles)" />

          {/* Cold Aisle Blue Floor Under Racks */}
          <polygon
            points="280,380 540,290 800,380 540,470"
            fill="url(#coolTiles)"
            opacity="0.85"
          />

          {/* CRAC / AC Units on Left & Right */}
          {/* Left AC Unit */}
          <g transform="translate(180, 260)">
            <polygon points="0,40 40,25 40,110 0,125" fill="#1e293b" stroke="#334155" />
            <polygon points="40,25 90,45 90,130 40,110" fill="#0f172a" stroke="#334155" />
            <polygon points="0,40 40,25 90,45 50,60" fill="#334155" stroke="#475569" />
            <circle cx="65" cy="80" r="12" fill="#0284c7" opacity="0.8" />
            <circle cx="65" cy="110" r="12" fill="#0284c7" opacity="0.8" />
          </g>

          {/* Right AC Unit */}
          <g transform="translate(810, 260)">
            <polygon points="0,45 50,25 50,110 0,130" fill="#0f172a" stroke="#334155" />
            <polygon points="50,25 90,40 90,125 50,110" fill="#1e293b" stroke="#334155" />
            <polygon points="0,45 50,25 90,40 40,60" fill="#334155" stroke="#475569" />
            <circle cx="25" cy="80" r="12" fill="#0284c7" opacity="0.8" />
            <circle cx="25" cy="110" r="12" fill="#0284c7" opacity="0.8" />
          </g>

          {/* Render 12 Racks (Ordered from back to front for proper 2.5D overlap) */}
          {racks.map((rack) => {
            const { x, y } = getRackCoordinates(rack.row, rack.col)
            const isSelected = selectedRackId === rack.id
            const statusColor = getStatusColor(rack.status)

            // Badge text depending on viewMode
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
                className="cursor-pointer transition-all duration-200 group"
              >
                {/* Selection Highlight Ring on Floor */}
                {isSelected && (
                  <ellipse
                    cx={x}
                    cy={y + 12}
                    rx="38"
                    ry="18"
                    fill="#06b6d4"
                    fillOpacity="0.25"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                    filter="url(#glow)"
                  />
                )}

                {/* Base Shadow */}
                <ellipse cx={x} cy={y + 10} rx="26" ry="12" fill="#000000" fillOpacity="0.5" />

                {/* Rack Cabinet 3D Faces */}
                {/* Front Left Face */}
                <polygon
                  points={`${x - rackWidth / 2},${y - rackHeight + 8} ${x},${y - rackHeight + 20} ${x},${y + 12} ${x - rackWidth / 2},${y}`}
                  fill={isSelected ? '#155e75' : '#1e293b'}
                  stroke={isSelected ? '#38bdf8' : '#334155'}
                  strokeWidth={isSelected ? '2' : '1'}
                />

                {/* Front Right Face (Glass door / Perforated mesh) */}
                <polygon
                  points={`${x},${y - rackHeight + 20} ${x + rackDepth},${y - rackHeight + 6} ${x + rackDepth},${y - 2} ${x},${y + 12}`}
                  fill={isSelected ? '#0e7490' : '#0f172a'}
                  stroke={isSelected ? '#38bdf8' : '#334155'}
                  strokeWidth={isSelected ? '2' : '1'}
                />

                {/* Top Face */}
                <polygon
                  points={`${x - rackWidth / 2},${y - rackHeight + 8} ${x},${y - rackHeight - 4} ${x + rackDepth},${y - rackHeight + 6} ${x},${y - rackHeight + 20}`}
                  fill={isSelected ? '#0891b2' : '#334155'}
                  stroke={isSelected ? '#67e8f9' : '#475569'}
                  strokeWidth={isSelected ? '2' : '1'}
                />

                {/* Status LED on top of Rack */}
                <circle
                  cx={x + 5}
                  cy={y - rackHeight + 8}
                  r={isSelected ? '5.5' : '4'}
                  fill={statusColor}
                  filter="url(#glow)"
                  className="animate-pulse"
                />

                {/* Tooltip / Label Floating above Rack */}
                <g transform={`translate(${x - 30}, ${y - rackHeight - 26})`}>
                  <rect
                    width="60"
                    height="18"
                    rx="6"
                    fill={isSelected ? '#0891b2' : '#090f1d'}
                    fillOpacity="0.95"
                    stroke={isSelected ? '#67e8f9' : '#334155'}
                    strokeWidth="1"
                  />
                  <text
                    x="30"
                    y="13"
                    textAnchor="middle"
                    fill="#ffffff"
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

          {/* Foreground Glass Partition Wall with sliding door */}
          <polygon
            points="120,420 540,540 960,420 960,435 540,555 120,435"
            fill="#0ea5e9"
            fillOpacity="0.2"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Bottom Controls: Zoom + Status Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Status Legend */}
        <div className="pointer-events-auto flex items-center gap-4 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-slate-300 font-medium">Healthy ({statusCounts.healthy})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300 font-medium">Warning ({statusCounts.warning})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span className="text-slate-300 font-medium">Critical ({statusCounts.critical})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span className="text-slate-400 font-medium">Offline ({statusCounts.offline})</span>
          </div>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
