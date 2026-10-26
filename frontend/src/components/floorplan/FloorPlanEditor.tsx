import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Grid3X3,
  GripVertical,
  Server,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react'
import type { RackSummary, RoomLayout } from '../../types'
import {
  fetchRoomLayout,
  updateRoomLayout,
  batchUpdateRackPositions,
  createRack,
  deleteRack,
} from '../../api/client'

interface FloorPlanEditorProps {
  roomId: number
  onBack: () => void
  onViewRackElevation?: (rack: RackSummary) => void
}

interface DragState {
  rackId: number
  sourceRow: string
  sourceCol: number
  offsetX: number
  offsetY: number
}

// Available grid scale presets
const GRID_PRESETS = [
  { label: '3×3', rows: 3, cols: 3 },
  { label: '3×4', rows: 3, cols: 4 },
  { label: '4×4', rows: 4, cols: 4 },
  { label: '4×5', rows: 4, cols: 5 },
  { label: '5×5', rows: 5, cols: 5 },
  { label: '5×6', rows: 5, cols: 6 },
]

export function FloorPlanEditor({ roomId, onBack, onViewRackElevation }: FloorPlanEditorProps) {
  const [layout, setLayout] = useState<RoomLayout | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Local rack positions (modified by drag before save)
  const [localRacks, setLocalRacks] = useState<RackSummary[]>([])
  const [gridRows, setGridRows] = useState(3)
  const [gridCols, setGridCols] = useState(4)
  const [hasChanges, setHasChanges] = useState(false)

  // Drag state
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{ row: string; col: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // Add rack modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addRackName, setAddRackName] = useState('')
  const [addRackTotalU, setAddRackTotalU] = useState(42)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<RackSummary | null>(null)

  // Load room layout
  const loadLayout = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchRoomLayout(roomId)
      setLayout(data)
      setLocalRacks(data.racks)
      setGridRows(data.grid_rows)
      setGridCols(data.grid_cols)
      setHasChanges(false)
    } catch (err) {
      console.error('Failed to load room layout:', err)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    loadLayout()
  }, [loadLayout])

  // Generate row labels (A, B, C, ...)
  const rowLabels = Array.from({ length: gridRows }, (_, i) => String.fromCharCode(65 + i))

  // Get rack at a specific grid position
  const getRackAt = (row: string, col: number) => {
    return localRacks.find(
      (r) => r.row.replace('Row ', '') === row && r.col === col
    )
  }

  // Status color mapper (Apple Light Mode)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'border-rose-300/80 bg-rose-50/90'
      case 'warning': return 'border-amber-300/80 bg-amber-50/90'
      case 'offline': return 'border-zinc-300/80 bg-zinc-100/90'
      case 'healthy':
      default: return 'border-emerald-300/80 bg-emerald-50/90'
    }
  }

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-rose-500'
      case 'warning': return 'bg-amber-500'
      case 'offline': return 'bg-zinc-400'
      default: return 'bg-emerald-500'
    }
  }

  // ─── Drag & Drop Handlers ─────────────────────────────────
  const handleDragStart = (e: React.DragEvent, rack: RackSummary) => {
    const rowLetter = rack.row.replace('Row ', '')
    setDragState({
      rackId: rack.id,
      sourceRow: rowLetter,
      sourceCol: rack.col,
      offsetX: e.nativeEvent.offsetX,
      offsetY: e.nativeEvent.offsetY,
    })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(rack.id))
    // Make ghost semi-transparent
    const el = e.currentTarget as HTMLElement
    setTimeout(() => {
      if (el) el.style.opacity = '0.4'
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
    setDragState(null)
    setDragOverCell(null)
  }

  const handleDragOver = (e: React.DragEvent, row: string, col: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCell({ row, col })
  }

  const handleDragLeave = () => {
    setDragOverCell(null)
  }

  const handleDrop = (e: React.DragEvent, targetRow: string, targetCol: number) => {
    e.preventDefault()
    setDragOverCell(null)

    if (!dragState) return

    // Check if target cell is already occupied by another rack
    const occupant = getRackAt(targetRow, targetCol)
    if (occupant && occupant.id !== dragState.rackId) {
      // Swap positions
      setLocalRacks((prev) =>
        prev.map((r) => {
          if (r.id === dragState.rackId) {
            return { ...r, row: `Row ${targetRow}`, col: targetCol }
          }
          if (r.id === occupant.id) {
            return { ...r, row: `Row ${dragState.sourceRow}`, col: dragState.sourceCol }
          }
          return r
        })
      )
    } else {
      // Move to empty cell
      setLocalRacks((prev) =>
        prev.map((r) => {
          if (r.id === dragState.rackId) {
            return { ...r, row: `Row ${targetRow}`, col: targetCol }
          }
          return r
        })
      )
    }

    setHasChanges(true)
    setDragState(null)
  }

  // ─── Grid Scale Change ────────────────────────────────────
  const handleGridChange = (newRows: number, newCols: number) => {
    // Check if any racks would be outside the new grid
    const rowLabelsNew = Array.from({ length: newRows }, (_, i) => String.fromCharCode(65 + i))
    const outOfBounds = localRacks.filter((r) => {
      const rowLetter = r.row.replace('Row ', '')
      return !rowLabelsNew.includes(rowLetter) || r.col > newCols
    })

    if (outOfBounds.length > 0) {
      const rackNames = outOfBounds.map((r) => r.name).join(', ')
      alert(
        `Cannot resize to ${newRows}×${newCols}: ${rackNames} would be outside the grid. Move or delete them first.`
      )
      return
    }

    setGridRows(newRows)
    setGridCols(newCols)
    setHasChanges(true)
  }

  // ─── Save Layout ──────────────────────────────────────────
  const handleSave = async () => {
    if (!layout) return

    setSaving(true)
    setSaveMessage(null)

    try {
      // 1. Update grid dimensions if changed
      if (gridRows !== layout.grid_rows || gridCols !== layout.grid_cols) {
        await updateRoomLayout(roomId, gridRows, gridCols)
      }

      // 2. Batch update rack positions
      const positions = localRacks.map((r) => ({
        rack_id: r.id,
        row: r.row,
        col: r.col,
      }))
      await batchUpdateRackPositions(roomId, positions)

      // Reload to get fresh data
      await loadLayout()
      setSaveMessage({ type: 'success', text: 'Layout saved successfully!' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save layout' })
    } finally {
      setSaving(false)
    }
  }

  // ─── Add Rack ─────────────────────────────────────────────
  const handleAddRack = async (targetRow: string, targetCol: number) => {
    if (!layout) return

    const rackName = addRackName.trim() || `Rack ${targetRow}${String(targetCol).padStart(2, '0')}`

    try {
      await createRack(roomId, {
        name: rackName,
        row: `Row ${targetRow}`,
        col: targetCol,
        total_u: addRackTotalU,
        room_id: roomId,
      })
      await loadLayout()
      setShowAddModal(false)
      setAddRackName('')
      setAddRackTotalU(42)
      setSaveMessage({ type: 'success', text: `Rack "${rackName}" created!` })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to create rack')
    }
  }

  // ─── Delete Rack ──────────────────────────────────────────
  const handleDeleteRack = async (rack: RackSummary) => {
    try {
      await deleteRack(roomId, rack.id)
      await loadLayout()
      setDeleteTarget(null)
      setSaveMessage({ type: 'success', text: `Rack "${rack.name}" deleted.` })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to delete rack')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-black/10 border-t-[#007AFF] rounded-full animate-spin" />
          <span className="text-sm font-medium text-[#86868B]">Loading floor plan editor...</span>
        </div>
      </div>
    )
  }

  if (!layout) {
    return (
      <div className="flex items-center justify-center h-96 text-[#86868B]">
        Failed to load room layout.
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-black/10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1F] hover:bg-black/10 px-3.5 py-2 rounded-[12px] bg-black/5 border-[0.5px] border-black/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Floor Plan</span>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[#1D1D1F] tracking-tight">
              Floor Plan Editor
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/5 text-[#86868B] border-[0.5px] border-black/10">
              {layout.room_name} • {gridRows}×{gridCols} Grid
            </span>
            {hasChanges && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 border border-amber-500/30 animate-pulse">
                UNSAVED CHANGES
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save Message */}
          {saveMessage && (
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-[10px] ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {saveMessage.type === 'success' ? <Check className="w-3 h-3 inline mr-1" /> : <AlertTriangle className="w-3 h-3 inline mr-1" />}
              {saveMessage.text}
            </span>
          )}

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-[12px] transition-all cursor-pointer ${
              hasChanges && !saving
                ? 'bg-[#007AFF] hover:bg-[#0071E3] text-white shadow-sm'
                : 'bg-black/5 text-black/30 border-[0.5px] border-black/10 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Layout'}</span>
          </button>
        </div>
      </div>

      {/* Grid Scale Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-[#86868B]">
          <Grid3X3 className="w-4 h-4" />
          <span className="font-semibold">Grid Scale:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {GRID_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleGridChange(preset.rows, preset.cols)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer ${
                gridRows === preset.rows && gridCols === preset.cols
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'bg-black/5 text-[#86868B] border-[0.5px] border-black/10 hover:text-[#1D1D1F] hover:bg-black/10'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-[#86868B] ml-2">
          {localRacks.length} / {gridRows * gridCols} positions filled
        </span>
      </div>

      {/* The Grid */}
      <div ref={gridRef} className="relative">
        {/* Column Headers */}
        <div className="flex ml-12">
          {Array.from({ length: gridCols }, (_, i) => (
            <div
              key={`col-header-${i}`}
              className="flex-1 text-center text-xs font-semibold text-[#86868B] pb-2"
            >
              Col {String(i + 1).padStart(2, '0')}
            </div>
          ))}
        </div>

        {/* Grid Rows */}
        {rowLabels.map((rowLabel) => (
          <div key={rowLabel} className="flex items-stretch">
            {/* Row Label */}
            <div className="w-12 flex items-center justify-center text-xs font-semibold text-[#86868B]">
              Row {rowLabel}
            </div>

            {/* Grid Cells */}
            {Array.from({ length: gridCols }, (_, colIdx) => {
              const col = colIdx + 1
              const rack = getRackAt(rowLabel, col)
              const isDragTarget =
                dragOverCell?.row === rowLabel && dragOverCell?.col === col
              const isDragSource =
                dragState?.sourceRow === rowLabel && dragState?.sourceCol === col

              return (
                <div
                  key={`${rowLabel}-${col}`}
                  className={`flex-1 min-h-[120px] m-1 rounded-[16px] border-2 border-dashed transition-all duration-200 relative ${
                    isDragTarget
                      ? 'border-[#007AFF] bg-[#007AFF]/10 scale-[1.02]'
                      : rack
                        ? `border-solid shadow-xs ${getStatusColor(rack.status)} ${isDragSource ? 'opacity-40' : ''}`
                        : 'border-black/15 bg-white/40 hover:bg-white/80 hover:border-black/30'
                  }`}
                  onDragOver={(e) => handleDragOver(e, rowLabel, col)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, rowLabel, col)}
                >
                  {rack ? (
                    /* ─── Filled Cell: Rack Card ─── */
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, rack)}
                      onDragEnd={handleDragEnd}
                      className="w-full h-full p-3 cursor-grab active:cursor-grabbing group"
                    >
                      {/* Drag handle */}
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-60 transition-opacity">
                        <GripVertical className="w-4 h-4 text-black/40" />
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(rack)
                        }}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-[8px] bg-rose-50 text-rose-600 hover:bg-rose-100 border-[0.5px] border-rose-200 cursor-pointer shadow-xs"
                        title="Delete Rack"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Rack Info */}
                      <div className="flex flex-col items-center justify-center h-full gap-2 pt-2">
                        <div className="p-2.5 rounded-[12px] bg-white border-[0.5px] border-black/10 shadow-xs">
                          <Server className="w-5 h-5 text-[#1D1D1F]" />
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-bold text-[#1D1D1F]">
                            {rack.name.replace('Rack ', '')}
                          </div>
                          <div className="text-[10px] text-[#86868B] mt-0.5">
                            {rack.used_u}/{rack.total_u}U
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(rack.status)}`} />
                          <span className="text-[10px] font-medium text-[#86868B] capitalize">{rack.status}</span>
                        </div>

                        {/* Click to view rack elevation */}
                        {onViewRackElevation && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewRackElevation(rack)
                            }}
                            className="text-[10px] text-[#007AFF] hover:underline font-semibold mt-1 cursor-pointer"
                          >
                            View Elevation →
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ─── Empty Cell: Add Button ─── */
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(true)
                        setAddRackName(`Rack ${rowLabel}${String(col).padStart(2, '0')}`)
                      }}
                      className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity cursor-pointer group"
                    >
                      <div className="p-2 rounded-[10px] bg-white border-[0.5px] border-black/10 shadow-xs group-hover:border-black/30 transition-colors">
                        <Plus className="w-4 h-4 text-[#86868B] group-hover:text-[#1D1D1F]" />
                      </div>
                      <span className="text-[10px] text-[#86868B] group-hover:text-[#1D1D1F] font-semibold">
                        Add Rack
                      </span>
                      {/* ──────── Hidden Add Rack handler ──────── */}
                      <input type="hidden" data-row={rowLabel} data-col={col} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* ─── Add Rack Modal ──────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="bg-white/90 backdrop-blur-2xl border-[0.5px] border-black/10 rounded-[20px] p-6 w-[400px] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1D1D1F]">Add New Rack</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#86868B] mb-1">Rack Name</label>
                <input
                  type="text"
                  value={addRackName}
                  onChange={(e) => setAddRackName(e.target.value)}
                  className="w-full px-3 py-2 rounded-[10px] bg-black/5 border-[0.5px] border-black/10 text-sm text-[#1D1D1F] placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                  placeholder="e.g. Rack A01"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#86868B] mb-1">Total U</label>
                <input
                  type="number"
                  value={addRackTotalU}
                  onChange={(e) => setAddRackTotalU(Number(e.target.value))}
                  min={1}
                  max={60}
                  className="w-full px-3 py-2 rounded-[10px] bg-black/5 border-[0.5px] border-black/10 text-sm text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
                />
              </div>
            </div>

            <div className="text-xs text-[#86868B]">
              Select an empty grid cell to place this rack.
            </div>

            {/* Grid mini-map for placement */}
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
              {rowLabels.map((rowLabel) =>
                Array.from({ length: gridCols }, (_, colIdx) => {
                  const col = colIdx + 1
                  const occupied = getRackAt(rowLabel, col)
                  return (
                    <button
                      key={`mini-${rowLabel}-${col}`}
                      type="button"
                      disabled={!!occupied}
                      onClick={() => handleAddRack(rowLabel, col)}
                      className={`h-10 rounded-[8px] text-[10px] font-bold transition-all cursor-pointer ${
                        occupied
                          ? 'bg-black/5 text-black/30 border-[0.5px] border-black/10 cursor-not-allowed'
                          : 'bg-white text-[#1D1D1F] border-[0.5px] border-black/15 shadow-xs hover:bg-[#007AFF]/10 hover:border-[#007AFF] hover:text-[#007AFF]'
                      }`}
                    >
                      {occupied ? occupied.name.replace('Rack ', '') : `${rowLabel}${String(col).padStart(2, '0')}`}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation ─────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="bg-white/90 backdrop-blur-2xl border-[0.5px] border-black/10 rounded-[20px] p-6 w-[380px] shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-[12px] bg-rose-50 border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1D1D1F]">Delete Rack?</h3>
                <p className="text-xs text-[#86868B] mt-0.5">
                  This will permanently delete <strong className="text-[#1D1D1F]">{deleteTarget.name}</strong> and all its devices.
                </p>
              </div>
            </div>

            {deleteTarget.device_count > 0 && (
              <div className="px-3 py-2 rounded-[10px] bg-amber-50 border border-amber-200 text-xs text-amber-800">
                ⚠️ This rack has {deleteTarget.device_count} device(s) mounted. They will be deleted.
              </div>
            )}

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 rounded-[10px] text-xs font-semibold text-[#1D1D1F] hover:bg-black/10 bg-black/5 border-[0.5px] border-black/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRack(deleteTarget)}
                className="px-4 py-2 rounded-[10px] text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 cursor-pointer shadow-xs"
              >
                Delete Rack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer hint */}
      <div className="text-center text-xs text-[#86868B] py-2">
        Drag racks to rearrange • Click empty cells to add new racks • Save to persist changes
      </div>
    </div>
  )
}
