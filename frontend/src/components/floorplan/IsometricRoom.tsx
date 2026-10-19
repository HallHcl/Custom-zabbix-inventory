import { useState, useRef, useMemo, useEffect } from 'react'
import {
  Eye,
  Activity,
  Thermometer,
  Zap,
  RotateCcw,
  RotateCw,
  Plus,
  Minus,
  Compass,
  Save,
  Check,
  AlertCircle,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react'
import type { RackSummary } from '../../types'
import {
  updateRoomLayout,
  batchUpdateRackPositions,
  createRack,
  deleteRack,
  fetchRoomLayout,
} from '../../api/client'

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
  roomId?: number
  initialEditMode?: boolean
  fullPage?: boolean
  onLayoutSaved?: () => void
  onViewRackElevation?: (rack: RackSummary) => void
}

type ViewMode = '3d' | 'status' | 'temp' | 'power'

export function IsometricRoom({
  racks,
  selectedRackId,
  onSelectRack,
  statusCounts,
  roomId = 1,
  initialEditMode = false,
  fullPage = false,
  onLayoutSaved,
  onViewRackElevation,
}: IsometricRoomProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('3d')
  const [zoom, setZoom] = useState<number>(1)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [rotationAngle, setRotationAngle] = useState<number>(0) // 0 to 360 degrees

  // ─── Edit Mode State ─────────────────────────────────────────
  const [isEditMode, setIsEditMode] = useState(initialEditMode)
  const [gridRows, setGridRows] = useState(3)
  const [gridCols, setGridCols] = useState(4)
  const [localRacks, setLocalRacks] = useState<RackSummary[]>(racks)
  const [pickedUpRackId, setPickedUpRackId] = useState<number | null>(null)
  const [hoveredRackId, setHoveredRackId] = useState<number | null>(null)
  const [hoveredEmptySlot, setHoveredEmptySlot] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modals
  const [showAddModal, setShowAddModal] = useState<{ row: string; col: number } | null>(null)
  const [addRackName, setAddRackName] = useState('')
  const [addRackTotalU, setAddRackTotalU] = useState(42)
  const [isAddingRack, setIsAddingRack] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<RackSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync initial racks when racks prop changes (if no pending changes)
  useEffect(() => {
    if (!hasChanges) {
      setLocalRacks(racks)
    }
  }, [racks, hasChanges])

  // Load layout from backend on mount to get exact grid dimensions
  useEffect(() => {
    let isMounted = true
    fetchRoomLayout(roomId)
      .then((data) => {
        if (!isMounted) return
        setGridRows(data.grid_rows || 3)
        setGridCols(data.grid_cols || 4)
        if (!hasChanges && data.racks && data.racks.length > 0) {
          setLocalRacks(data.racks)
        }
      })
      .catch((err) => {
        console.warn('Could not fetch initial room layout dimensions, using defaults:', err)
      })
    return () => {
      isMounted = false
    }
  }, [roomId, hasChanges])

  // Drag-to-rotate state
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const startAngleRef = useRef(0)
  const hasMovedRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  // Dynamic scaling factor based on grid dimensions so rooms from 3x3 to 8x8 remain balanced and auto-fit
  const maxDim = Math.max(gridRows, gridCols)
  const autoScale = Math.min(1.0, 4.4 / Math.max(maxDim, 4.4))

  // Dynamically scaled isometric units
  const tileW = Math.round(95 * autoScale)
  const tileH = Math.round(48 * autoScale)
  const rackHeight = Math.round(85 * autoScale)
  const wallHeight = Math.round(150 * autoScale)
  const curbHeight = Math.max(6, Math.round(12 * autoScale))

  // Center of the room grid in isometric screen space
  const centerIso = useMemo(() => ({ x: 540, y: 350 }), [])

  // Rotation in radians
  const rad = useMemo(() => (rotationAngle * Math.PI) / 180, [rotationAngle])
  const cos = useMemo(() => Math.cos(rad), [rad])
  const sin = useMemo(() => Math.sin(rad), [rad])

  // Status color mapper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return '#e82127'
      case 'warning':
        return '#f59e0b'
      case 'offline':
        return '#52525b'
      case 'healthy':
      default:
        return '#10b981'
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
    if ((e.target as HTMLElement).closest('button, input, select, .no-drag')) return
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

  // Calculate rotated floor, cold aisle, and back walls dynamically based on gridRows and gridCols
  const roomGeometry = useMemo(() => {
    // Symmetrical floor boundaries based directly on rack grid coordinates (dc, dr)
    // plus uniform walkway padding around the racks on all 4 sides.
    const padC = 0.85
    const padR = 0.85
    const halfC = (gridCols - 1) / 2 + padC
    const halfR = (gridRows - 1) / 2 + padR

    // 4 corners of the room floor in (dc, dr) grid space:
    // Top (Back), Right (East), Bottom (Front), Left (West)
    const floorCorners = [
      { dc: -halfC, dr: -halfR }, // 0: Top / Back
      { dc: +halfC, dr: -halfR }, // 1: Right / East
      { dc: +halfC, dr: +halfR }, // 2: Bottom / Front
      { dc: -halfC, dr: +halfR }, // 3: Left / West
    ]

    // Project each floor corner with the EXACT same isometric rotation matrix as rack slots
    const floorPts = floorCorners.map((c) => {
      const rc = c.dc * cos - c.dr * sin
      const rr = c.dc * sin + c.dr * cos
      return {
        x: centerIso.x + (rc - rr) * tileW,
        y: centerIso.y + (rc + rr) * tileH,
      }
    })

    // Cold Aisle mat centered under the equipment
    const aislePadC = 0.4
    const aislePadR = 0.4
    const aisleHalfC = (gridCols - 1) / 2 + aislePadC
    const aisleHalfR = (gridRows - 1) / 2 + aislePadR

    const aisleCorners = [
      { dc: -aisleHalfC, dr: -aisleHalfR },
      { dc: +aisleHalfC, dr: -aisleHalfR },
      { dc: +aisleHalfC, dr: +aisleHalfR },
      { dc: -aisleHalfC, dr: +aisleHalfR },
    ]

    const aislePts = aisleCorners.map((c) => {
      const rc = c.dc * cos - c.dr * sin
      const rr = c.dc * sin + c.dr * cos
      return {
        x: centerIso.x + (rc - rr) * tileW,
        y: centerIso.y + (rc + rr) * tileH,
      }
    })

    const backWalls: string[] = []
    const frontCurbs: string[] = []

    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4
      const p1 = floorPts[i]
      const p2 = floorPts[j]
      const midY = (p1.y + p2.y) / 2

      if (midY < centerIso.y) {
        // Back wall rising vertically
        backWalls.push(
          `${p1.x},${p1.y - wallHeight} ${p2.x},${p2.y - wallHeight} ${p2.x},${p2.y} ${p1.x},${p1.y}`
        )
      } else {
        // Front curb slab edge
        frontCurbs.push(
          `${p1.x},${p1.y} ${p2.x},${p2.y} ${p2.x},${p2.y + curbHeight} ${p1.x},${p1.y + curbHeight}`
        )
      }
    }

    return {
      floorPoints: floorPts.map((p) => `${p.x},${p.y}`).join(' '),
      aislePoints: aislePts.map((p) => `${p.x},${p.y}`).join(' '),
      backWalls,
      frontCurbs,
    }
  }, [gridRows, gridCols, cos, sin, centerIso, tileW, tileH, wallHeight, curbHeight])

  // Helper to get row letter from index (0 -> 'A', 1 -> 'B')
  const getRowLetter = (idx: number) => String.fromCharCode(65 + idx)
  const getRowIndex = (rowStr: string) => {
    const letter = rowStr.replace('Row ', '').trim().toUpperCase()
    return letter.charCodeAt(0) - 65
  }

  // Calculate 3D position and vertices for all grid cells (both occupied racks and empty slots)
  const { allRacksSorted, emptyCells } = useMemo(() => {
    const occupiedCoords = new Set<string>()

    // Base corners relative to anchor (u, v) in isometric space, scaled dynamically
    const u_front = 12 * autoScale
    const v_front = 12 * autoScale
    const u_w = -23 * autoScale
    const v_w = -1 * autoScale
    const u_d = 1 * autoScale
    const v_d = -29 * autoScale

    const cornersUV = [
      { u: u_front, v: v_front },
      { u: u_front + u_d, v: v_front + v_d },
      { u: u_front + u_w + u_d, v: v_front + v_w + v_d },
      { u: u_front + u_w, v: v_front + v_w },
    ]

    // Compute racks
    const racksComputed = localRacks.map((rack) => {
      const rIdx = getRowIndex(rack.row)
      const cIdx = rack.col - 1
      const coordKey = `${rIdx}_${rack.col}`
      occupiedCoords.add(coordKey)

      const dr = (gridRows - 1 - rIdx) - (gridRows - 1) / 2
      const dc = cIdx - (gridCols - 1) / 2

      const rc = dc * cos - dr * sin
      const rr = dc * sin + dr * cos

      const x = centerIso.x + (rc - rr) * tileW
      const y = centerIso.y + (rc + rr) * tileH
      const depth = rc + rr

      const isPickedUp = pickedUpRackId === rack.id
      const liftY = isPickedUp ? Math.round(26 * autoScale) : 0

      const baseCorners = cornersUV.map((c) => {
        const ur = c.u * cos - c.v * sin
        const vr = c.u * sin + c.v * cos
        return {
          x: x + (ur - vr),
          y: y + (ur + vr) * 0.5 - liftY,
        }
      })

      const topCorners = baseCorners.map((p) => ({
        x: p.x,
        y: p.y - rackHeight,
      }))

      const topPolygon = topCorners.map((p) => `${p.x},${p.y}`).join(' ')

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
        y: y - liftY,
        floorY: y,
        depth,
        isPickedUp,
        baseCorners,
        topCorners,
        topPolygon,
        visibleSideFaces,
      }
    }).sort((a, b) => a.depth - b.depth)

    // Compute empty grid cells
    const emptyCellsComputed: {
      rowLetter: string
      rowIdx: number
      col: number
      slotCode: string
      x: number
      y: number
      depth: number
      polygon: string
    }[] = []

    for (let r = 0; r < gridRows; r++) {
      const rowLetter = getRowLetter(r)
      for (let c = 1; c <= gridCols; c++) {
        const coordKey = `${r}_${c}`
        if (!occupiedCoords.has(coordKey)) {
          const dr = (gridRows - 1 - r) - (gridRows - 1) / 2
          const dc = (c - 1) - (gridCols - 1) / 2

          const rc = dc * cos - dr * sin
          const rr = dc * sin + dr * cos

          const x = centerIso.x + (rc - rr) * tileW
          const y = centerIso.y + (rc + rr) * tileH
          const depth = rc + rr

          const tileCorners = cornersUV.map((corner) => {
            const ur = corner.u * cos - corner.v * sin
            const vr = corner.u * sin + corner.v * cos
            return {
              x: x + (ur - vr),
              y: y + (ur + vr) * 0.5,
            }
          })

          emptyCellsComputed.push({
            rowLetter,
            rowIdx: r,
            col: c,
            slotCode: `${rowLetter}${c < 10 ? '0' + c : c}`,
            x,
            y,
            depth,
            polygon: tileCorners.map((p) => `${p.x},${p.y}`).join(' '),
          })
        }
      }
    }

    return {
      allRacksSorted: racksComputed,
      emptyCells: emptyCellsComputed,
    }
  }, [localRacks, gridRows, gridCols, cos, sin, centerIso, pickedUpRackId, autoScale, tileW, tileH, rackHeight])

  // ─── Scale Adjustment Handler ────────────────────────────────
  const handleSetScale = (newRows: number, newCols: number) => {
    if (newRows < 2 || newCols < 2 || newRows > 8 || newCols > 8) return

    const outOfBoundsRack = localRacks.find((r) => {
      const rIdx = getRowIndex(r.row)
      return rIdx >= newRows || r.col > newCols
    })

    if (outOfBoundsRack) {
      setSaveMessage({
        type: 'error',
        text: `Cannot shrink to ${newRows}×${newCols}: ${outOfBoundsRack.name} is at Row ${outOfBoundsRack.row} Col ${outOfBoundsRack.col}. Move or delete it first.`,
      })
      setTimeout(() => setSaveMessage(null), 4000)
      return
    }

    setGridRows(newRows)
    setGridCols(newCols)
    setHasChanges(true)
    setSaveMessage({
      type: 'success',
      text: `Grid scale adjusted to ${newRows}×${newCols} (${newRows * newCols} slots). Click 'Save Layout' to persist.`,
    })
    setTimeout(() => setSaveMessage(null), 3000)
  }

  // ─── 3D Pick, Place & Swap Handlers ──────────────────────────
  const handleRackClick = (rack: RackSummary) => {
    if (hasMovedRef.current) return

    if (!isEditMode) {
      onSelectRack(rack)
      return
    }

    // 1. If no rack is currently lifted: Lift this rack!
    if (pickedUpRackId === null) {
      setPickedUpRackId(rack.id)
      return
    }

    // 2. If clicking the SAME rack that is lifted: Put it back down (cancel)
    if (pickedUpRackId === rack.id) {
      setPickedUpRackId(null)
      return
    }

    // 3. If clicking a DIFFERENT rack while one is lifted: SWAP POSITIONS (e.g. A01 <-> C04)!
    const sourceRack = localRacks.find((r) => r.id === pickedUpRackId)
    const targetRack = rack

    if (sourceRack && targetRack) {
      const sourceRow = sourceRack.row
      const sourceCol = sourceRack.col
      const targetRow = targetRack.row
      const targetCol = targetRack.col

      const targetLetter = targetRow.replace('Row ', '').trim()
      const sourceLetter = sourceRow.replace('Row ', '').trim()

      const targetSlotCode = `${targetLetter}${targetCol < 10 ? '0' + targetCol : targetCol}`
      const sourceSlotCode = `${sourceLetter}${sourceCol < 10 ? '0' + sourceCol : sourceCol}`

      const updated = localRacks.map((r) => {
        if (r.id === sourceRack.id) {
          return {
            ...r,
            row: targetRow,
            col: targetCol,
            name: `Rack ${targetSlotCode}`,
          }
        }
        if (r.id === targetRack.id) {
          return {
            ...r,
            row: sourceRow,
            col: sourceCol,
            name: `Rack ${sourceSlotCode}`,
          }
        }
        return r
      })

      setLocalRacks(updated)
      setPickedUpRackId(null)
      setHasChanges(true)
      setSaveMessage({
        type: 'success',
        text: `🔄 Swapped ${sourceRack.name} ↔ ${targetRack.name}! Click 'Save Layout' to persist.`,
      })
      setTimeout(() => setSaveMessage(null), 3500)
    }
  }

  const handleEmptySlotClick = (cell: { rowLetter: string; col: number; slotCode: string }) => {
    if (hasMovedRef.current) return

    if (pickedUpRackId !== null) {
      const targetRack = localRacks.find((r) => r.id === pickedUpRackId)
      if (!targetRack) return

      const updated = localRacks.map((r) => {
        if (r.id === pickedUpRackId) {
          return {
            ...r,
            row: `Row ${cell.rowLetter}`,
            col: cell.col,
            name: `Rack ${cell.slotCode}`,
          }
        }
        return r
      })

      setLocalRacks(updated)
      setPickedUpRackId(null)
      setHasChanges(true)
      setSaveMessage({
        type: 'success',
        text: `Moved ${targetRack.name} to Row ${cell.rowLetter} Col ${cell.col}!`,
      })
      setTimeout(() => setSaveMessage(null), 2500)
    } else {
      setAddRackName(`Rack ${cell.slotCode}`)
      setAddRackTotalU(42)
      setShowAddModal({ row: `Row ${cell.rowLetter}`, col: cell.col })
    }
  }

  // ─── Save Layout to Backend ──────────────────────────────────
  const handleSaveLayout = async () => {
    try {
      setSaving(true)
      setSaveMessage(null)

      await updateRoomLayout(roomId, gridRows, gridCols)

      const positions = localRacks.map((r) => ({
        rack_id: r.id,
        row: r.row,
        col: r.col,
      }))
      await batchUpdateRackPositions(roomId, positions)

      setHasChanges(false)
      setSaveMessage({ type: 'success', text: '✓ 3D Room Layout saved successfully to database!' })
      onLayoutSaved?.()
      setTimeout(() => setSaveMessage(null), 3500)
    } catch (err: any) {
      console.error('Failed to save room layout:', err)
      setSaveMessage({
        type: 'error',
        text: err?.message || 'Failed to save layout to server.',
      })
    } finally {
      setSaving(false)
    }
  }

  // ─── Reset Layout ────────────────────────────────────────────
  const handleResetLayout = () => {
    setLocalRacks(racks)
    setPickedUpRackId(null)
    setHasChanges(false)
    setSaveMessage({ type: 'success', text: 'Layout changes reset to original.' })
    setTimeout(() => setSaveMessage(null), 2500)
  }

  // ─── Create New Rack ─────────────────────────────────────────
  const handleConfirmAddRack = async () => {
    if (!showAddModal || !addRackName.trim()) return
    try {
      setIsAddingRack(true)
      const res = await createRack(roomId, {
        name: addRackName.trim(),
        row: showAddModal.row,
        col: showAddModal.col,
        total_u: addRackTotalU,
        room_id: roomId,
      })

      const newRackSummary: RackSummary = {
        id: res.id,
        name: res.name,
        row: res.row,
        col: res.col,
        total_u: res.total_u,
        used_u: 0,
        usage_percent: 0,
        power_kw: 1.2,
        inlet_temp_c: 24.5,
        device_count: 0,
        status: 'healthy',
        highest_severity: 0,
      }

      setLocalRacks((prev) => [...prev, newRackSummary])
      setShowAddModal(null)
      setHasChanges(true)
      onLayoutSaved?.()
      setSaveMessage({ type: 'success', text: `Created ${res.name} at ${showAddModal.row} Col ${showAddModal.col}!` })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err?.message || 'Failed to create rack.' })
    } finally {
      setIsAddingRack(false)
    }
  }

  // ─── Delete Rack ─────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    try {
      setIsDeleting(true)
      await deleteRack(roomId, deleteConfirm.id)
      setLocalRacks((prev) => prev.filter((r) => r.id !== deleteConfirm.id))
      if (pickedUpRackId === deleteConfirm.id) setPickedUpRackId(null)
      setDeleteConfirm(null)
      setHasChanges(true)
      onLayoutSaved?.()
      setSaveMessage({ type: 'success', text: `Deleted ${deleteConfirm.name}.` })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err?.message || 'Failed to delete rack.' })
    } finally {
      setIsDeleting(false)
    }
  }

  const pickedUpRack = localRacks.find((r) => r.id === pickedUpRackId)

  return (
    <div className={`relative rounded-[3px] bg-[#161c20] border border-[#394650] shadow-2xl overflow-hidden flex flex-col ${fullPage ? 'min-h-[720px] h-[750px]' : 'min-h-[580px] h-[600px]'}`}>
      {/* ─── Top Main Bar: View Modes & Edit Toggle ────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left Side: View Mode Toggles (or Edit Mode Indicator) */}
        <div className="pointer-events-auto flex items-center gap-2">
          {!isEditMode ? (
            <div className="flex items-center gap-1 p-1 rounded-[3px] bg-[#20282f]/95 border border-[#394650] backdrop-blur shadow-lg">
              <button
                type="button"
                onClick={() => setViewMode('3d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-mono font-medium transition-all cursor-pointer ${
                  viewMode === '3d'
                    ? 'bg-[#34424b] text-[#8bd7d1] border border-[#50626f] shadow-sm'
                    : 'text-[#85a6b1] hover:text-[#caedde]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3D View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('status')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-mono font-medium transition-all cursor-pointer ${
                  viewMode === 'status'
                    ? 'bg-[#34424b] text-[#8bd7d1] border border-[#50626f] shadow-sm'
                    : 'text-[#85a6b1] hover:text-[#caedde]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Status</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('temp')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-mono font-medium transition-all cursor-pointer ${
                  viewMode === 'temp'
                    ? 'bg-[#34424b] text-[#8bd7d1] border border-[#50626f] shadow-sm'
                    : 'text-[#85a6b1] hover:text-[#caedde]'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span>Temp</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('power')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-mono font-medium transition-all cursor-pointer ${
                  viewMode === 'power'
                    ? 'bg-[#34424b] text-[#8bd7d1] border border-[#50626f] shadow-sm'
                    : 'text-[#85a6b1] hover:text-[#caedde]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Power</span>
              </button>
            </div>
          ) : (
            /* Edit Mode Scale Controls Toolbar */
            <div className="flex items-center gap-2 p-1.5 rounded-[3px] bg-[#20282f]/95 border border-[#8bd7d1]/50 backdrop-blur shadow-2xl">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-[#273139] border border-[#8bd7d1]/40 text-[#8bd7d1] text-xs font-bold font-mono tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-[#8bd7d1] animate-spin" style={{ animationDuration: '4s' }} />
                <span>3D EDIT MODE</span>
              </div>

              <div className="h-4 w-px bg-[#394650]" />

              {/* Scale Presets */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-[#85a6b1] text-[11px] font-mono mr-1 hidden sm:inline">Scale:</span>
                {[
                  { r: 3, c: 3, label: '3×3' },
                  { r: 3, c: 4, label: '3×4' },
                  { r: 4, c: 4, label: '4×4' },
                  { r: 5, c: 5, label: '5×5' },
                ].map((p) => {
                  const isActive = gridRows === p.r && gridCols === p.c
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleSetScale(p.r, p.c)}
                      className={`px-2 py-1 rounded-[2px] font-mono text-[11px] font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#34424b] text-[#8bd7d1] border border-[#8bd7d1]'
                          : 'bg-[#273139] text-[#85a6b1] hover:text-[#caedde] hover:bg-[#34424b] border border-[#394650]'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>

              <div className="h-4 w-px bg-[#394650]" />

              {/* Custom Row / Col Adjuster */}
              <div className="flex items-center gap-1 text-[11px] font-mono text-[#85a6b1]">
                <span>R:</span>
                <button
                  type="button"
                  onClick={() => handleSetScale(gridRows - 1, gridCols)}
                  disabled={gridRows <= 2}
                  className="px-1.5 py-0.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-[#caedde] disabled:opacity-40 cursor-pointer"
                >
                  -
                </button>
                <span className="font-bold text-[#caedde] px-0.5">{gridRows}</span>
                <button
                  type="button"
                  onClick={() => handleSetScale(gridRows + 1, gridCols)}
                  disabled={gridRows >= 8}
                  className="px-1.5 py-0.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-[#caedde] disabled:opacity-40 cursor-pointer"
                >
                  +
                </button>

                <span className="ml-1">C:</span>
                <button
                  type="button"
                  onClick={() => handleSetScale(gridRows, gridCols - 1)}
                  disabled={gridCols <= 2}
                  className="px-1.5 py-0.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-[#caedde] disabled:opacity-40 cursor-pointer"
                >
                  -
                </button>
                <span className="font-bold text-[#caedde] px-0.5">{gridCols}</span>
                <button
                  type="button"
                  onClick={() => handleSetScale(gridRows, gridCols + 1)}
                  disabled={gridCols >= 8}
                  className="px-1.5 py-0.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-[#caedde] disabled:opacity-40 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Edit Mode Actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          {isEditMode && (
            /* Edit Actions: Save, Reset, Done */
            <div className="flex items-center gap-1.5 p-1 rounded-[3px] bg-[#20282f]/95 border border-[#394650] backdrop-blur shadow-2xl">
              {hasChanges && (
                <button
                  type="button"
                  onClick={handleResetLayout}
                  className="px-3 py-1.5 rounded-[2px] text-xs font-mono text-[#85a6b1] hover:text-[#caedde] hover:bg-[#34424b] transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveLayout}
                disabled={saving || !hasChanges}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[2px] text-xs font-mono font-bold transition-all cursor-pointer ${
                  hasChanges
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/40 animate-pulse'
                    : 'bg-[#273139] text-[#85a6b1]/50 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{saving ? 'Saving...' : 'Save Layout'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditMode(false)
                  setPickedUpRackId(null)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-mono font-medium bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-[#caedde] transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-[#8bd7d1]" />
                <span>Done</span>
              </button>
            </div>
          )}

          {/* 360 Rotation Controls */}
          <div className="flex items-center gap-1 p-1 rounded-[3px] bg-[#20282f]/95 border border-[#394650] backdrop-blur shadow-lg">
            <button
              type="button"
              onClick={handleRotateLeft}
              className="p-1.5 text-[#85a6b1] hover:text-[#caedde] hover:bg-[#34424b] rounded-[2px] transition-colors cursor-pointer"
              title="Rotate Left 45° (⟲)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div
              className="flex items-center gap-1 px-2 py-1 text-xs font-mono font-medium text-[#caedde] bg-[#273139] rounded-[2px] border border-[#394650] select-none cursor-pointer hover:border-[#8bd7d1]"
              onClick={() => setRotationAngle(0)}
              title="Reset rotation to 0°"
            >
              <Compass className="w-3 h-3 text-[#85a6b1]" />
              <span>{Math.round(rotationAngle)}°</span>
            </div>
            <button
              type="button"
              onClick={handleRotateRight}
              className="p-1.5 text-[#85a6b1] hover:text-[#caedde] hover:bg-[#34424b] rounded-[2px] transition-colors cursor-pointer"
              title="Rotate Right 45° (⟳)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Notification / Instruction Strip ────────────────────────── */}
      {saveMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 transition-all duration-300">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur shadow-2xl border ${
              saveMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
                : 'bg-rose-950/90 text-rose-300 border-rose-500/50'
            }`}
          >
            {saveMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{saveMessage.text}</span>
          </div>
        </div>
      )}

      {/* Micro-hint banner when in Edit Mode */}
      {isEditMode && !saveMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-cyan-500/30 text-xs text-zinc-300 backdrop-blur shadow-lg">
            {pickedUpRack ? (
              <>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-cyan-300 font-bold">{pickedUpRack.name}</span>
                <span>is lifted! Click an empty slot to MOVE, or click another rack (e.g. C04) to SWAP positions.</span>
              </>
            ) : (
              <>
                <span className="text-cyan-400 font-bold">3D Move & Swap:</span>
                <span>Click any rack to lift it, then click an empty slot or another rack to swap.</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Main Isometric SVG Room Canvas ─────────────────────────── */}
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
          viewBox="0 0 1080 620"
          className="w-full h-full transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            {/* Room Floor Tiles Pattern */}
            <pattern id="floorTilesGrid" width="40" height="20" patternUnits="userSpaceOnUse">
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

            <filter id="beaconGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Dynamic Back Walls */}
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
            fill="url(#floorTilesGrid)"
            stroke={isEditMode ? '#0891b2' : '#222222'}
            strokeWidth={isEditMode ? '1.5' : '1'}
          />

          {/* Rotated Cold Aisle Mat */}
          <polygon
            points={roomGeometry.aislePoints}
            fill="url(#aisleTiles)"
            opacity="0.85"
            stroke="#2b2b2b"
            strokeWidth="0.8"
          />

          {/* ─── Empty 3D Isometric Slots in Edit Mode ──────────────── */}
          {isEditMode &&
            emptyCells.map((cell) => {
              const isHovered = hoveredEmptySlot === cell.slotCode
              const isReadyToPlace = pickedUpRackId !== null

              return (
                <g
                  key={`empty-${cell.slotCode}`}
                  onClick={() => handleEmptySlotClick(cell)}
                  onMouseEnter={() => setHoveredEmptySlot(cell.slotCode)}
                  onMouseLeave={() => setHoveredEmptySlot(null)}
                  className="cursor-pointer transition-all duration-200"
                >
                  {/* Isometric Slot Floor Polygon */}
                  <polygon
                    points={cell.polygon}
                    fill={
                      isHovered
                        ? isReadyToPlace
                          ? 'rgba(16, 185, 129, 0.3)'
                          : 'rgba(6, 182, 212, 0.25)'
                        : isReadyToPlace
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(255, 255, 255, 0.03)'
                    }
                    stroke={
                      isHovered
                        ? isReadyToPlace
                          ? '#10b981'
                          : '#06b6d4'
                        : isReadyToPlace
                        ? '#10b981'
                        : '#3f3f46'
                    }
                    strokeWidth={isHovered || isReadyToPlace ? '2' : '1'}
                    strokeDasharray={isReadyToPlace ? '4 3' : '3 3'}
                  />

                  {/* Slot Coordinate Label (Rotated / Centered in 3D Tile) */}
                  {(() => {
                    const slotW = Math.round(Math.max(34, 44 * autoScale))
                    const slotH = Math.round(Math.max(13, 16 * autoScale))
                    const slotFont = Math.max(7.5, Math.round(9 * autoScale))
                    return (
                      <g transform={`translate(${cell.x - slotW / 2}, ${cell.y - slotH / 2})`}>
                        <rect
                          width={slotW}
                          height={slotH}
                          rx={Math.max(3, Math.round(4 * autoScale))}
                          fill={isHovered ? '#0891b2' : '#141414'}
                          fillOpacity="0.85"
                          stroke={isReadyToPlace ? '#10b981' : '#333333'}
                          strokeWidth="1"
                        />
                        <text
                          x={slotW / 2}
                          y={slotH * 0.72}
                          textAnchor="middle"
                          fill={isHovered ? '#ffffff' : isReadyToPlace ? '#34d399' : '#a1a1aa'}
                          fontSize={slotFont}
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {isReadyToPlace ? `+ PLACE` : cell.slotCode}
                        </text>
                      </g>
                    )
                  })()}
                </g>
              )
            })}

          {/* ─── 3D Racks Rendered with Depth Sorting ───────────────── */}
          {allRacksSorted.map(
            ({
              rack,
              x,
              y,
              floorY,
              isPickedUp,
              topPolygon,
              visibleSideFaces,
            }) => {
              const isSelected = selectedRackId === rack.id
              const isHovered = hoveredRackId === rack.id && isEditMode
              const isDimmed = !isEditMode && statusFilter !== null && rack.status !== statusFilter
              const statusColor = getStatusColor(rack.status)

              let badgeText = rack.name.replace('Rack ', '')
              if (!isEditMode) {
                if (viewMode === 'temp') badgeText = `${rack.inlet_temp_c}°C`
                if (viewMode === 'power') badgeText = `${rack.power_kw}kW`
                if (viewMode === 'status') badgeText = rack.status.toUpperCase()
              } else if (isPickedUp) {
                badgeText = 'PLACING...'
              }

              return (
                <g
                  key={rack.id}
                  onClick={() => handleRackClick(rack)}
                  onMouseEnter={() => setHoveredRackId(rack.id)}
                  onMouseLeave={() => setHoveredRackId(null)}
                  className={`cursor-pointer transition-opacity duration-200 ${
                    isDimmed ? 'opacity-30' : 'opacity-100'
                  }`}
                >
                  {/* Picked-up 3D Elevation Line & Floor Shadow */}
                  {isPickedUp ? (
                    <>
                      {/* Floor Shadow Ring */}
                      <ellipse
                        cx={x}
                        cy={floorY + Math.round(8 * autoScale)}
                        rx={Math.round(30 * autoScale)}
                        ry={Math.round(14 * autoScale)}
                        fill="#06b6d4"
                        fillOpacity="0.3"
                        stroke="#22d3ee"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        filter="url(#beaconGlow)"
                      />
                      {/* Vertical Elevation Guide Line */}
                      <line
                        x1={x}
                        y1={floorY + Math.round(6 * autoScale)}
                        x2={x}
                        y2={y + Math.round(6 * autoScale)}
                        stroke="#22d3ee"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        filter="url(#beaconGlow)"
                      />
                    </>
                  ) : (
                    /* Normal Base Shadow */
                    <ellipse
                      cx={x}
                      cy={y + Math.round(8 * autoScale)}
                      rx={Math.round(24 * autoScale)}
                      ry={Math.round(11 * autoScale)}
                      fill="#000000"
                      fillOpacity="0.8"
                    />
                  )}

                  {/* Selection Halo Ring */}
                  {(isSelected || isPickedUp) && (
                    <ellipse
                      cx={x}
                      cy={y + Math.round(10 * autoScale)}
                      rx={Math.round(34 * autoScale)}
                      ry={Math.round(16 * autoScale)}
                      fill={isPickedUp ? '#06b6d4' : '#ffffff'}
                      fillOpacity={isPickedUp ? 0.25 : 0.1}
                      stroke={isPickedUp ? '#22d3ee' : '#ffffff'}
                      strokeWidth="2"
                      filter="url(#beaconGlow)"
                    />
                  )}

                  {/* Visible 3D Side Faces */}
                  {visibleSideFaces.map((face, fIdx) => (
                    <polygon
                      key={`face-${fIdx}`}
                      points={face.points}
                      fill={
                        isPickedUp
                          ? fIdx === 0
                            ? '#0e7490'
                            : '#083344'
                          : isSelected
                          ? fIdx === 0
                            ? '#2e2e2e'
                            : '#222222'
                          : face.shade
                      }
                      stroke={
                        isPickedUp
                          ? '#22d3ee'
                          : isHovered
                          ? '#06b6d4'
                          : isSelected
                          ? '#ffffff'
                          : '#333333'
                      }
                      strokeWidth={isPickedUp || isHovered || isSelected ? '2' : '1'}
                    />
                  ))}

                  {/* Top Face */}
                  <polygon
                    points={topPolygon}
                    fill={
                      isPickedUp
                        ? '#0891b2'
                        : isSelected
                        ? '#3f3f46'
                        : '#262626'
                    }
                    stroke={
                      isPickedUp
                        ? '#67e8f9'
                        : isHovered
                        ? '#06b6d4'
                        : isSelected
                        ? '#ffffff'
                        : '#404040'
                    }
                    strokeWidth={isPickedUp || isHovered || isSelected ? '2' : '1'}
                  />

                  {/* Status LED Beacon */}
                  <circle
                    cx={x + Math.round(4 * autoScale)}
                    cy={y - rackHeight + Math.round(7 * autoScale)}
                    r={Math.max(3, Math.round((isSelected || isPickedUp ? 5 : 3.8) * autoScale))}
                    fill={isPickedUp ? '#22d3ee' : statusColor}
                    filter="url(#beaconGlow)"
                    className="animate-pulse"
                  />

                  {/* Floating Billboard Label */}
                  {(() => {
                    const badgeW = Math.round(Math.max(46, 62 * autoScale))
                    const badgeH = Math.round(Math.max(14, 18 * autoScale))
                    const badgeFont = Math.max(8.5, Math.round(10 * autoScale))
                    return (
                      <g
                        transform={`translate(${x - badgeW / 2}, ${
                          y - rackHeight - badgeH - Math.round(6 * autoScale)
                        })`}
                      >
                        <rect
                          width={badgeW}
                          height={badgeH}
                          rx={Math.max(4, Math.round(6 * autoScale))}
                          fill={
                            isPickedUp
                              ? '#06b6d4'
                              : isSelected
                              ? '#ffffff'
                              : '#141414'
                          }
                          fillOpacity="0.95"
                          stroke={
                            isPickedUp
                              ? '#67e8f9'
                              : isSelected
                              ? '#ffffff'
                              : rack.status === 'critical'
                              ? '#e82127'
                              : rack.status === 'warning'
                              ? '#f59e0b'
                              : '#333333'
                          }
                          strokeWidth="1"
                        />
                        <text
                          x={badgeW / 2}
                          y={badgeH * 0.72}
                          textAnchor="middle"
                          fill={isPickedUp ? '#000000' : isSelected ? '#000000' : '#ffffff'}
                          fontSize={badgeFont}
                          fontWeight="700"
                          letterSpacing="0.5"
                        >
                          {badgeText}
                        </text>
                      </g>
                    )
                  })()}

                  {/* Quick Action Pill on Hover in Edit Mode */}
                  {isEditMode && isHovered && !isPickedUp && (
                    <g
                      transform={`translate(${x - 50}, ${
                        y - rackHeight - Math.round(Math.max(14, 18 * autoScale)) - 34
                      })`}
                      className="pointer-events-auto"
                    >
                      <rect
                        width="100"
                        height="22"
                        rx="8"
                        fill="#18181b"
                        stroke="#3f3f46"
                        strokeWidth="1"
                        filter="url(#beaconGlow)"
                      />
                      {/* Pick up button */}
                      <text
                        x="24"
                        y="15"
                        fill="#38bdf8"
                        fontSize="10"
                        fontWeight="bold"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPickedUpRackId(rack.id)
                        }}
                      >
                        🖐️ Move
                      </text>
                      {/* View Elevation button */}
                      {onViewRackElevation && (
                        <text
                          x="60"
                          y="15"
                          fill="#34d399"
                          fontSize="10"
                          fontWeight="bold"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            onViewRackElevation(rack)
                          }}
                        >
                          ↗️ 42U
                        </text>
                      )}
                      {/* Delete icon */}
                      <text
                        x="86"
                        y="15"
                        fill="#f43f5e"
                        fontSize="10"
                        fontWeight="bold"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteConfirm(rack)
                        }}
                      >
                        🗑️
                      </text>
                    </g>
                  )}
                </g>
              )
            }
          )}

          {/* Front Perimeter Curbs */}
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

      {/* ─── Bottom Status Legend & Zoom Controls ────────────────── */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Status Legend */}
        <div className="pointer-events-auto flex items-center gap-3 px-3 py-1.5 rounded-[3px] bg-[#20282f]/95 border border-[#394650] backdrop-blur text-xs font-mono">
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'healthy' ? null : 'healthy')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-[2px] transition-colors cursor-pointer ${
              statusFilter === 'healthy' ? 'bg-[#34424b] text-[#caedde]' : 'text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
            <span>Healthy ({statusCounts.healthy})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'warning' ? null : 'warning')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-[2px] transition-colors cursor-pointer ${
              statusFilter === 'warning' ? 'bg-[#34424b] text-[#caedde]' : 'text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
            <span>Warning ({statusCounts.warning})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'critical' ? null : 'critical')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-[2px] transition-colors cursor-pointer ${
              statusFilter === 'critical' ? 'bg-[#34424b] text-[#caedde]' : 'text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shadow-sm" />
            <span>Critical ({statusCounts.critical})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'offline' ? null : 'offline')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-[2px] transition-colors cursor-pointer ${
              statusFilter === 'offline' ? 'bg-[#34424b] text-[#caedde]' : 'text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#50626f]" />
            <span>Offline ({statusCounts.offline})</span>
          </button>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="pointer-events-auto flex items-center gap-1 p-1 rounded-[3px] bg-[#20282f]/95 border border-[#394650] backdrop-blur shadow-lg">
          <span className="text-[11px] font-mono text-[#85a6b1]/70 px-2 select-none hidden md:inline">
            Drag to rotate 360°
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 text-[#85a6b1] hover:text-[#caedde] hover:bg-[#34424b] rounded-[2px] transition-colors cursor-pointer"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 text-[#85a6b1] hover:text-[#caedde] hover:bg-[#34424b] rounded-[2px] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-[#85a6b1] hover:text-[#caedde] hover:bg-[#34424b] rounded-[2px] transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── Add Rack Modal ────────────────────────────────────────── */}
      {showAddModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[3px] bg-[#20282f] border border-[#394650] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#394650]">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#8bd7d1]" />
                <h3 className="text-sm font-bold text-[#caedde] font-mono">Add Rack in 3D Slot</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(null)}
                className="text-[#85a6b1] hover:text-[#caedde]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div>
                <label className="text-[11px] font-semibold text-[#85a6b1]">Position</label>
                <div className="text-xs font-mono text-[#8bd7d1] font-bold bg-[#161c20] px-3 py-1.5 rounded-[2px] border border-[#394650] mt-1">
                  {showAddModal.row} • Column {showAddModal.col}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#85a6b1]">Rack Name</label>
                <input
                  type="text"
                  value={addRackName}
                  onChange={(e) => setAddRackName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-[2px] bg-[#273139] border border-[#394650] text-xs text-[#caedde] placeholder:text-[#85a6b1]/50 focus:outline-none focus:border-[#8bd7d1]"
                  placeholder="e.g. Rack A03"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#85a6b1]">Total U Capacity</label>
                <select
                  value={addRackTotalU}
                  onChange={(e) => setAddRackTotalU(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-1.5 rounded-[2px] bg-[#273139] border border-[#394650] text-xs text-[#caedde] focus:outline-none focus:border-[#8bd7d1]"
                >
                  <option value={42}>42U (Standard)</option>
                  <option value={48}>48U (High Density)</option>
                  <option value={24}>24U (Half Rack)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#394650]">
              <button
                type="button"
                onClick={() => setShowAddModal(null)}
                className="px-3 py-1.5 rounded-[2px] text-xs font-mono text-[#85a6b1] hover:text-[#caedde] hover:bg-[#34424b]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddRack}
                disabled={isAddingRack || !addRackName.trim()}
                className="px-4 py-1.5 rounded-[2px] text-xs font-mono font-bold bg-[#34424b] hover:bg-[#414a50] border border-[#8bd7d1] text-[#8bd7d1] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isAddingRack ? 'Adding...' : 'Add to Floor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─────────────────────────────── */}
      {deleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[3px] bg-[#20282f] border border-[#394650] p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#394650]">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-[#caedde] font-mono">Delete Rack</h3>
            </div>

            <p className="text-xs text-[#85a6b1] font-mono leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-[#caedde]">{deleteConfirm.name}</span> from the room?
              This will also unmount all associated devices.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#394650]">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-3 py-1.5 rounded-[2px] text-xs font-mono text-[#85a6b1] hover:text-[#caedde] hover:bg-[#34424b]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-[2px] text-xs font-mono font-bold bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 transition-colors cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Rack'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
