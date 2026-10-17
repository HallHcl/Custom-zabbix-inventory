import { useState, useRef, useMemo } from 'react'
import { Eye, Activity, Thermometer, Zap, RotateCcw, RotateCw, Plus, Minus, Compass } from 'lucide-react'
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
  const [rotationAngle, setRotationAngle] = useState<number>(0) // 0 to 360 degrees

  // Drag-to-rotate state
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const startAngleRef = useRef(0)
  const hasMovedRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  // Center of the room grid in isometric screen space
  const centerIso = useMemo(() => ({ x: 540, y: 360 }), [])
  const tileW = 110
  const tileH = 55

  // Rotation in radians
  const rad = useMemo(() => (rotationAngle * Math.PI) / 180, [rotationAngle])
  const cos = useMemo(() => Math.cos(rad), [rad])
  const sin = useMemo(() => Math.sin(rad), [rad])

  // Status color mapper
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

  // Zoom and rotation handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 1.4))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.7))
  const handleRotateLeft = () => setRotationAngle((prev) => (prev - 45 + 360) % 360)
  const handleRotateRight = () => setRotationAngle((prev) => (prev + 45) % 360)
  const handleReset = () => {
    setZoom(1)
    setRotationAngle(0)
    setStatusFilter(null)
  }

  // Mouse drag handlers for 360° free rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    setIsDragging(true)
    dragStartXRef.current = e.clientX
    startAngleRef.current = rotationAngle
    hasMovedRef.current = false
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const deltaX = e.clientX - dragStartXRef.current
    if (Math.abs(deltaX) > 4) {
      hasMovedRef.current = true
    }
    // Inverted so dragging left rotates the view to the right (natural orbital trackball motion)
    const nextAngle = (startAngleRef.current - deltaX * 0.45) % 360
    setRotationAngle(nextAngle < 0 ? nextAngle + 360 : nextAngle)
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
    setIsDragging(false)
  }

  // Touch handlers for mobile/tablet free rotation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true
      setIsDragging(true)
      dragStartXRef.current = e.touches[0].clientX
      startAngleRef.current = rotationAngle
      hasMovedRef.current = false
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return
    const deltaX = e.touches[0].clientX - dragStartXRef.current
    if (Math.abs(deltaX) > 4) {
      hasMovedRef.current = true
    }
    const nextAngle = (startAngleRef.current - deltaX * 0.45) % 360
    setRotationAngle(nextAngle < 0 ? nextAngle + 360 : nextAngle)
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
    setIsDragging(false)
  }

  // Calculate rotated floor, cold aisle, and back walls
  const roomGeometry = useMemo(() => {
    // 4 corners of the floor in isometric (u, v) space relative to center (540, 420)
    const floorCornersUV = [
      { u: -120, v: -120 }, // Top
      { u: 210, v: -210 },  // Right
      { u: 120, v: 120 },   // Bottom
      { u: -210, v: 210 },  // Left
    ]

    const floorPts = floorCornersUV.map((c) => {
      const ur = c.u * cos - c.v * sin
      const vr = c.u * sin + c.v * cos
      return {
        x: 540 + (ur - vr),
        y: 420 + (ur + vr) * 0.5,
      }
    })

    // Cold Aisle mat in (u, v) space
    const aisleUV = [
      { u: -90, v: -90 },
      { u: 130, v: -130 },
      { u: 90, v: 90 },
      { u: -130, v: 130 },
    ]
    const aislePts = aisleUV.map((c) => {
      const ur = c.u * cos - c.v * sin
      const vr = c.u * sin + c.v * cos
      return {
        x: 540 + (ur - vr),
        y: 380 + (ur + vr) * 0.5,
      }
    })

    // Determine back walls vs front curbs
    const wallHeight = 240
    const backWalls: string[] = []
    const frontCurbs: string[] = []

    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      const p1 = floorPts[i]
      const p2 = floorPts[j]
      const midY = (p1.y + p2.y) / 2

      if (midY < 420) {
        // Back Wall
        backWalls.push(
          `${p1.x},${p1.y - wallHeight} ${p2.x},${p2.y - wallHeight} ${p2.x},${p2.y} ${p1.x},${p1.y}`
        )
      } else {
        // Front Glass Curb
        frontCurbs.push(
          `${p1.x},${p1.y} ${p2.x},${p2.y} ${p2.x},${p2.y + 14} ${p1.x},${p1.y + 14}`
        )
      }
    }

    return {
      floorPoints: floorPts.map((p) => `${p.x},${p.y}`).join(' '),
      aislePoints: aislePts.map((p) => `${p.x},${p.y}`).join(' '),
      backWalls,
      frontCurbs,
    }
  }, [cos, sin])

  // Compute position and 3D mesh vertices for all 12 racks with painter's depth sorting
  const sortedRacks = useMemo(() => {
    const rackHeight = 85

    return racks.map((rack) => {
      const rowIdx = rack.row.includes('C') ? 0 : rack.row.includes('B') ? 1 : 2
      const colIdx = rack.col - 1

      // Relative grid offset from room center (row: 1.0, col: 1.5)
      const dc = colIdx - 1.5
      const dr = rowIdx - 1.0

      // Rotate coordinates around center
      const rc = dc * cos - dr * sin
      const rr = dc * sin + dr * cos

      const x = centerIso.x + (rc - rr) * tileW
      const y = centerIso.y + (rc + rr) * tileH
      const depth = rc + rr // Camera depth value for painter's order

      // 4 Base corners relative to anchor (u, v) rotated
      const u_front = 12
      const v_front = 12
      const u_w = -23
      const v_w = -1
      const u_d = 1
      const v_d = -29

      const cornersUV = [
        { u: u_front, v: v_front },                       // 0: Front
        { u: u_front + u_d, v: v_front + v_d },           // 1: Right
        { u: u_front + u_w + u_d, v: v_front + v_w + v_d }, // 2: Back
        { u: u_front + u_w, v: v_front + v_w },           // 3: Left
      ]

      const baseCorners = cornersUV.map((c) => {
        const ur = c.u * cos - c.v * sin
        const vr = c.u * sin + c.v * cos
        return {
          x: x + (ur - vr),
          y: y + (ur + vr) * 0.5,
        }
      })

      const topCorners = baseCorners.map((p) => ({
        x: p.x,
        y: p.y - rackHeight,
      }))

      // Top face polygon
      const topPolygon = topCorners.map((p) => `${p.x},${p.y}`).join(' ')

      // 4 side faces, back-face culled (visible if edge dx > 0 in screen space)
      const visibleSideFaces: { points: string; shade: string }[] = []
      const shades = ['#1c1c1c', '#141414', '#181818', '#222222']

      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4
        const dx = baseCorners[j].x - baseCorners[i].x
        if (dx > 0) {
          const facePts = [
            `${baseCorners[i].x},${baseCorners[i].y}`,
            `${baseCorners[j].x},${baseCorners[j].y}`,
            `${topCorners[j].x},${topCorners[j].y}`,
            `${topCorners[i].x},${topCorners[i].y}`,
          ].join(' ')

          visibleSideFaces.push({
            points: facePts,
            shade: shades[i % shades.length],
          })
        }
      }

      return {
        rack,
        x,
        y,
        depth,
        baseCorners,
        topCorners,
        topPolygon,
        visibleSideFaces,
      }
    }).sort((a, b) => a.depth - b.depth) // Sort back-to-front
  }, [racks, cos, sin, centerIso])

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

      {/* Top Right: Rotation Controls & Angle Indicator */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-[#141414]/90 border border-[#262626] backdrop-blur shadow-lg">
        <button
          type="button"
          onClick={handleRotateLeft}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#222222] rounded-lg transition-colors cursor-pointer"
          title="Rotate Left 45° (⟲)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-zinc-300 bg-[#1c1c1c] rounded-lg border border-[#2b2b2b] select-none cursor-pointer hover:border-zinc-500 transition-colors"
          onClick={() => setRotationAngle(0)}
          title="Click to reset rotation to 0°"
        >
          <Compass className="w-3.5 h-3.5 text-zinc-400" />
          <span>{Math.round(rotationAngle)}°</span>
        </div>

        <button
          type="button"
          onClick={handleRotateRight}
          className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#222222] rounded-lg transition-colors cursor-pointer"
          title="Rotate Right 45° (⟳)"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Isometric SVG Room Canvas with Free Drag-to-Rotate */}
      <div
        className={`flex-1 w-full h-full flex items-center justify-center overflow-hidden select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <svg
          viewBox="0 0 1080 580"
          className="w-full h-full transition-transform duration-150"
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

          {/* Dynamic Back Walls (Stay behind racks at any angle) */}
          {roomGeometry.backWalls.map((pts, idx) => (
            <polygon
              key={`back-wall-${idx}`}
              points={pts}
              fill={idx % 2 === 0 ? '#141414' : '#0f0f0f'}
              stroke="#222222"
              strokeWidth="1"
            />
          ))}

          {/* Rotated Floor Base */}
          <polygon
            points={roomGeometry.floorPoints}
            fill="url(#floorTilesTesla)"
            stroke="#222222"
            strokeWidth="1"
          />

          {/* Rotated Cold Aisle Mat */}
          <polygon
            points={roomGeometry.aislePoints}
            fill="url(#aisleTiles)"
            opacity="0.9"
            stroke="#2b2b2b"
            strokeWidth="0.8"
          />

          {/* 12 Racks Drawn in Dynamic Painter's Depth Order */}
          {sortedRacks.map(({ rack, x, y, topPolygon, visibleSideFaces }) => {
            const isSelected = selectedRackId === rack.id
            const isDimmed = statusFilter !== null && rack.status !== statusFilter
            const statusColor = getStatusColor(rack.status)

            let badgeText = rack.name.replace('Rack ', '')
            if (viewMode === 'temp') badgeText = `${rack.inlet_temp_c}°C`
            if (viewMode === 'power') badgeText = `${rack.power_kw}kW`
            if (viewMode === 'status') badgeText = rack.status.toUpperCase()

            const rackHeight = 85

            return (
              <g
                key={rack.id}
                onClick={() => {
                  if (hasMovedRef.current) return
                  onSelectRack(rack)
                }}
                className={`cursor-pointer transition-opacity duration-200 ${
                  isDimmed ? 'opacity-30' : 'opacity-100'
                }`}
              >
                {/* Selection Halo Ring */}
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

                {/* Visible 3D Side Faces */}
                {visibleSideFaces.map((face, fIdx) => (
                  <polygon
                    key={`face-${fIdx}`}
                    points={face.points}
                    fill={isSelected ? (fIdx === 0 ? '#2e2e2e' : '#222222') : face.shade}
                    stroke={isSelected ? '#ffffff' : '#333333'}
                    strokeWidth={isSelected ? '2' : '1'}
                  />
                ))}

                {/* Top Face */}
                <polygon
                  points={topPolygon}
                  fill={isSelected ? '#3f3f46' : '#262626'}
                  stroke={isSelected ? '#ffffff' : '#404040'}
                  strokeWidth={isSelected ? '2' : '1'}
                />

                {/* Status LED Beacon */}
                <circle
                  cx={x + 5}
                  cy={y - rackHeight + 8}
                  r={isSelected ? '5.5' : '4'}
                  fill={statusColor}
                  filter="url(#teslaGlow)"
                  className="animate-pulse"
                />

                {/* Floating Billboard Label (Facing Viewer At All Angles) */}
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

          {/* Front Perimeter Curbs (Stay in front of racks) */}
          {roomGeometry.frontCurbs.map((pts, idx) => (
            <polygon
              key={`front-curb-${idx}`}
              points={pts}
              fill="#27272a"
              fillOpacity="0.25"
              stroke="#3f3f46"
              strokeWidth="1.5"
            />
          ))}
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

        {/* Zoom, Drag Hint & Reset Controls */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-xl bg-[#141414]/90 border border-[#262626] backdrop-blur shadow-lg">
          <span className="text-[11px] text-zinc-500 px-2 select-none hidden md:inline">
            Drag to rotate 360°
          </span>
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
            title="Reset View (Zoom 1.0, Angle 0°)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
