import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  RotateCcw,
  Compass,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Thermometer,
  Zap,
  ShieldAlert,
  ChevronRight,
  Eye,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Move,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type { RackSummary } from '../../types'
import { useTwinStore } from '../../store/useTwinStore'
import { useTheme } from '../../lib/theme'
import { batchUpdateRackPositions } from '../../api/client'

export type ColorMode = '3d' | 'status' | 'temp' | 'power'

interface DataCenter3DViewProps {
  racks: RackSummary[]
  selectedRackId: number | null
  onSelectRack: (rack: RackSummary | null) => void
  onViewRackElevation?: (rack: RackSummary) => void
  gridRows?: number
  gridCols?: number
  roomTempTarget?: number
  mode?: ColorMode
  onModeChange?: (mode: ColorMode) => void
  viewportControl?: React.ReactNode
  telemetrySlot?: React.ReactNode
  onLayoutUpdated?: () => void
  roomId?: number | string
  isEditMode?: boolean
  onAddRackClick?: (slot: { row: string; col: number }) => void
  onDeleteRackClick?: (rack: RackSummary) => void
}

interface RackMeshEntry {
  group: THREE.Group
  cabinet: THREE.Mesh
  frontMesh: THREE.Mesh
  fillMesh: THREE.Mesh
  beacon: THREE.Mesh
  underglow: THREE.Mesh
  hazardRing: THREE.Mesh | null
  labelSprite: THREE.Sprite | null
  rack: RackSummary
}

export const DataCenter3DView: React.FC<DataCenter3DViewProps> = ({
  racks,
  selectedRackId,
  onSelectRack,
  onViewRackElevation,
  gridRows = 3,
  gridCols = 8,
  roomTempTarget = 22.0,
  mode,
  onModeChange,
  viewportControl,
  telemetrySlot,
  onLayoutUpdated,
  roomId = 1,
  isEditMode = false,
  onAddRackClick,
  onDeleteRackClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const reqIdRef = useRef<number | null>(null)

  // Zustand Store Telemetry & Theme
  const racksTelemetry = useTwinStore((s) => s.racksTelemetry)
  const { theme, isTeslaDark } = useTheme()
  const isLight = theme === 'cupertino-frost'

  // Track rack meshes for dynamic updates without full scene tear-down
  const rackEntriesRef = useRef<Map<number, RackMeshEntry>>(new Map())
  const raycastMeshesMapRef = useRef<Map<THREE.Mesh, RackSummary>>(new Map())

  // Fresh prop refs to avoid tearing down Three.js listeners
  const racksRef = useRef<RackSummary[]>(racks)
  racksRef.current = racks
  const onLayoutUpdatedRef = useRef(onLayoutUpdated)
  onLayoutUpdatedRef.current = onLayoutUpdated
  const onSelectRackRef = useRef(onSelectRack)
  onSelectRackRef.current = onSelectRack
  const isEditModeRef = useRef(isEditMode)
  isEditModeRef.current = isEditMode
  const onAddRackClickRef = useRef(onAddRackClick)
  onAddRackClickRef.current = onAddRackClick
  const onDeleteRackClickRef = useRef(onDeleteRackClick)
  onDeleteRackClickRef.current = onDeleteRackClick

  // Track empty slot meshes for click-to-add in edit mode
  const emptySlotMeshesMapRef = useRef<Map<THREE.Mesh, { row: string; col: number }>>(new Map())
  const emptySlotGroupsRef = useRef<THREE.Group[]>([])
  const hoveredSlotMeshRef = useRef<THREE.Mesh | null>(null)
  const [hoveredEmptySlot, setHoveredEmptySlot] = useState<{ row: string; col: number } | null>(null)

  // Derive maximum rack row & col for auto-fitting 3D scene
  const { maxRackRow, maxRackCol } = useMemo(() => {
    let mRow = 1
    let mCol = 1
    for (const r of racks) {
      const rowClean = r.row.replace(/row\s*/i, '').trim().toUpperCase()
      const rIdx = rowClean.length === 1 ? rowClean.charCodeAt(0) - 65 + 1 : 1
      if (rIdx > mRow) mRow = rIdx
      if (r.col > mCol) mCol = r.col
    }
    return { maxRackRow: mRow, maxRackCol: mCol }
  }, [racks])

  const effectiveGridRows = Math.max(gridRows, maxRackRow)
  const effectiveGridCols = Math.max(gridCols, maxRackCol)

  // Currently selected rack entity
  const selectedRack = useMemo(
    () => racks.find((r) => r.id === selectedRackId) || null,
    [racks, selectedRackId]
  )

  // Drag & Drop State
  const [isDraggingRack, setIsDraggingRack] = useState<boolean>(false)
  const [dragCandidateCell, setDragCandidateCell] = useState<{ row: string; col: number; occupantName?: string } | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Zero-Reload Smooth Spatial Zoom Engine Refs
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(14, 16, 20))
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 0))
  const isZoomingRef = useRef<boolean>(false)

  // Auto-Save Rack Drop Handler
  const handleDropRack = useCallback(
    async (
      rack: RackSummary,
      targetRow: string,
      targetCol: number,
      originalPos: THREE.Vector3
    ) => {
      const cleanOriginalRow = rack.row.replace(/row\s*/i, '').trim().toUpperCase()
      const occupant = racksRef.current.find(
        (r) =>
          r.id !== rack.id &&
          r.row.replace(/row\s*/i, '').trim().toUpperCase() === targetRow &&
          r.col === targetCol
      )

      let positions: { rack_id: number; row: string; col: number }[] = []
      if (occupant) {
        positions = [
          { rack_id: rack.id, row: `Row ${targetRow}`, col: targetCol },
          { rack_id: occupant.id, row: `Row ${cleanOriginalRow}`, col: rack.col },
        ]
      } else {
        positions = [{ rack_id: rack.id, row: `Row ${targetRow}`, col: targetCol }]
      }

      try {
        await batchUpdateRackPositions(roomId, positions)
        const msg = occupant
          ? `✓ Swapped ${rack.name} with ${occupant.name} (Row ${targetRow} / Col ${targetCol})`
          : `✓ Moved ${rack.name} to Row ${targetRow} / Col ${targetCol}`
        setToastMessage({ text: msg, type: 'success' })
        setTimeout(() => setToastMessage(null), 3500)
        onLayoutUpdatedRef.current?.()
      } catch (err: any) {
        console.error('Failed to move rack in 3D:', err)
        const entry = rackEntriesRef.current.get(rack.id)
        if (entry) entry.group.position.copy(originalPos)
        setToastMessage({ text: err.message || 'Failed to update rack position', type: 'error' })
        setTimeout(() => setToastMessage(null), 4000)
      }
    },
    [roomId]
  )

  // Internal vs controlled mode
  const [internalMode, setInternalMode] = useState<ColorMode>('status')
  const activeMode = mode !== undefined ? mode : internalMode
  const handleModeChange = (newMode: ColorMode) => {
    setInternalMode(newMode)
    onModeChange?.(newMode)
  }

  const [autoRotate, setAutoRotate] = useState<boolean>(false)
  const [hoveredRack, setHoveredRack] = useState<RackSummary | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  // Color Calculation for ASHRAE TC 9.9 Thermal, Power Watts, RU Space, and Status
  const getRackVisualData = useCallback(
    (rack: RackSummary, currentMode: ColorMode) => {
      const telem = racksTelemetry[rack.id.toString()] ||
        Object.values(racksTelemetry).find(
          (t) => t.rack_name.toLowerCase() === rack.name.toLowerCase()
        )

      const inletTemp = telem?.inlet_temp_c ?? rack.inlet_temp_c ?? roomTempTarget
      const powerKw = telem ? telem.total_power_watts / 1000 : rack.power_kw ?? 1.5
      const powerPct = telem?.power_usage_pct ?? Math.round((powerKw / 8.0) * 100)
      const spacePct = rack.usage_percent ?? Math.round(((rack.used_u || 0) / (rack.total_u || 42)) * 100)
      const hasFailoverRisk = telem?.redundancy_failover_risk ?? false

      let hex = '#10b981'
      let subtext = `${rack.used_u}/${rack.total_u} U`
      let subtextColor = '#38bdf8'

      if (currentMode === 'temp') {
        // ASHRAE TC 9.9 Compliance Gradient
        if (inletTemp >= 27.0) {
          hex = '#f43f5e' // Critical Hot Spot
          subtextColor = '#fda4af'
        } else if (inletTemp >= 25.0) {
          hex = '#f59e0b' // Allowable Threshold (Warning)
          subtextColor = '#fde68a'
        } else if (inletTemp >= 20.0) {
          hex = '#10b981' // Optimal Recommended Range
          subtextColor = '#6ee7b7'
        } else {
          hex = '#06b6d4' // Overcooled Cold Front
          subtextColor = '#a5f3fc'
        }
        subtext = `${inletTemp.toFixed(1)} °C`
      } else if (currentMode === 'power') {
        if (powerPct >= 85) {
          hex = '#f43f5e'
          subtextColor = '#fda4af'
        } else if (powerPct >= 65) {
          hex = '#f59e0b'
          subtextColor = '#fde68a'
        } else {
          hex = '#10b981'
          subtextColor = '#6ee7b7'
        }
        subtext = `${powerKw.toFixed(2)} kW`
      } else if (currentMode === '3d') {
        if (spacePct >= 85) {
          hex = '#f43f5e'
          subtextColor = '#fda4af'
        } else if (spacePct >= 70) {
          hex = '#f59e0b'
          subtextColor = '#fde68a'
        } else {
          hex = '#3b82f6'
          subtextColor = '#93c5fd'
        }
        subtext = `${spacePct}% (${rack.used_u}/${rack.total_u}U)`
      } else {
        // Default Status Mode
        if (rack.status === 'critical') {
          hex = '#f43f5e'
          subtextColor = '#fda4af'
          subtext = 'CRITICAL'
        } else if (rack.status === 'warning') {
          hex = '#f59e0b'
          subtextColor = '#fde68a'
          subtext = 'WARNING'
        } else if (rack.status === 'offline') {
          hex = '#64748b'
          subtextColor = '#94a3b8'
          subtext = 'OFFLINE'
        } else {
          hex = '#10b981'
          subtextColor = '#6ee7b7'
          subtext = 'OPTIMAL'
        }
      }

      return {
        hex,
        threeColor: new THREE.Color(hex),
        subtext,
        subtextColor,
        inletTemp,
        powerKw,
        powerPct,
        spacePct,
        hasFailoverRisk,
      }
    },
    [racksTelemetry, roomTempTarget]
  )

  // Crisp billboard label canvas generator
  const createTextSprite = useCallback(
    (name: string, subtext: string, subtextColor: string, borderColor: string) => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 96
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      // Glass surface rounded pill
      ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(18, 24, 38, 0.90)'
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(8, 8, 240, 80, 16)
      ctx.fill()
      ctx.stroke()

      // Title
      ctx.font = 'bold 26px "JetBrains Mono", monospace'
      ctx.fillStyle = isLight ? '#1d1d1f' : '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText(name, 128, 42)

      // Subtext
      ctx.font = 'bold 20px "JetBrains Mono", monospace'
      ctx.fillStyle = subtextColor
      ctx.fillText(subtext, 128, 72)

      const texture = new THREE.CanvasTexture(canvas)
      texture.minFilter = THREE.LinearFilter
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
      const sprite = new THREE.Sprite(material)
      sprite.scale.set(1.4, 0.52, 1)
      return sprite
    },
    [isLight]
  )

  // Empty Slot Badge Sprite for 3D Edit Mode
  const createEmptySlotSprite = useCallback((row: string, col: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = 192
    canvas.height = 76
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.fillStyle = 'rgba(6, 182, 212, 0.16)'
    ctx.strokeStyle = '#06b6d4'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(4, 4, 184, 68, 12)
    ctx.fill()
    ctx.stroke()

    ctx.font = 'bold 22px "JetBrains Mono", monospace'
    ctx.fillStyle = '#67e8f9'
    ctx.textAlign = 'center'
    ctx.fillText(`+ ADD RACK`, 96, 34)

    ctx.font = '16px "JetBrains Mono", monospace'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(`${row} / Col ${col}`, 96, 58)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(1.2, 0.48, 1)
    return sprite
  }, [])

  // Theme-aware palette configuration
  // Theme-aware palette configuration (Default to Apple Light Mode)
  const themeSceneColors = useMemo(() => {
    switch (theme) {
      case 'obsidian-carbon':
        return {
          bg: 0x000000,
          fogDensity: 0.015,
          floor: 0x050505,
          gridMajor: 0x10b981,
          gridMinor: 0x1a2e26,
          runner: 0x064e3b,
          ambient: 0x10b981,
          accentLight: 0x10b981,
        }
      case 'blueprint-tactical':
        return {
          bg: 0x0f172a,
          fogDensity: 0.012,
          floor: 0x1e293b,
          gridMajor: 0x06b6d4,
          gridMinor: 0x164e63,
          runner: 0x0e7490,
          ambient: 0x38bdf8,
          accentLight: 0x06b6d4,
        }
      case 'tesla-midnight':
        return {
          bg: 0x0b0e14,
          fogDensity: 0.012,
          floor: 0x121620,
          gridMajor: 0x3b82f6,
          gridMinor: 0x1e293b,
          runner: 0x1d4ed8,
          ambient: 0xdbeafe,
          accentLight: 0x3b82f6,
        }
      case 'cupertino-frost':
      default:
        return {
          bg: 0xf5f5f7,
          fogDensity: 0.008,
          floor: 0xe5e7eb,
          gridMajor: 0x94a3b8,
          gridMinor: 0xcfd8dc,
          runner: 0xdbeafe,
          ambient: 0xffffff,
          accentLight: 0x0071e3,
        }
    }
  }, [theme])

  // =========================================================================
  // INITIAL THREE.JS SCENE SETUP (Built ONCE)
  // =========================================================================
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 900
    const height = container.clientHeight || 600

    // 1. Scene & Fog
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(themeSceneColors.bg)
    scene.fog = new THREE.FogExp2(themeSceneColors.bg, themeSceneColors.fogDensity)
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000)
    camera.position.set(14, 16, 20)
    cameraRef.current = camera

    // 3. Renderer with High-DPI support
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.innerHTML = ''
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.04
    controls.minDistance = 3
    controls.maxDistance = 50
    controls.target.set(0, 1.2, 0)
    controlsRef.current = controls

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(themeSceneColors.ambient, 0.75)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4)
    mainLight.position.set(12, 22, 14)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 1024
    mainLight.shadow.mapSize.height = 1024
    scene.add(mainLight)

    const fillLight = new THREE.DirectionalLight(themeSceneColors.accentLight, 0.6)
    fillLight.position.set(-16, 10, -12)
    scene.add(fillLight)

    // 6. Raised Data Center Floor Slab
    const roomW = effectiveGridCols * 2.8 + 8
    const roomD = effectiveGridRows * 3.6 + 8

    const floorGeo = new THREE.PlaneGeometry(roomW, roomD)
    const floorMat = new THREE.MeshStandardMaterial({
      color: themeSceneColors.floor,
      roughness: 0.6,
      metalness: 0.3,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Grid Overlay
    const gridHelper = new THREE.GridHelper(
      Math.max(roomW, roomD),
      Math.round(Math.max(roomW, roomD) * 1.5),
      themeSceneColors.gridMajor,
      themeSceneColors.gridMinor
    )
    gridHelper.position.y = 0.01
    scene.add(gridHelper)

    // Cold Aisle Walkway Runners
    for (let r = 0; r < effectiveGridRows; r++) {
      const zPos = (r - (effectiveGridRows - 1) / 2) * 3.6
      const runnerGeo = new THREE.PlaneGeometry(effectiveGridCols * 2.6 + 2, 1.3)
      const runnerMat = new THREE.MeshBasicMaterial({
        color: themeSceneColors.runner,
        transparent: true,
        opacity: 0.45,
      })
      const runner = new THREE.Mesh(runnerGeo, runnerMat)
      runner.rotation.x = -Math.PI / 2
      runner.position.set(0, 0.015, zPos + 1.25)
      scene.add(runner)
    }

    // 7. Raycasting & Drag-Drop Plane Setup
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const planeIntersectPoint = new THREE.Vector3()

    // Glowing target snap tile on the ground
    const dropMarkerGeo = new THREE.PlaneGeometry(1.6, 2.0)
    const dropMarkerMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const dropMarker = new THREE.Mesh(dropMarkerGeo, dropMarkerMat)
    dropMarker.rotation.x = -Math.PI / 2
    dropMarker.position.y = 0.025
    scene.add(dropMarker)

    // Active drag tracking
    const activeDragState = {
      isDown: false,
      isDragging: false,
      startPointer: { x: 0, y: 0 },
      rack: null as RackSummary | null,
      group: null as THREE.Group | null,
      originalPos: new THREE.Vector3(),
      candidateRow: '',
      candidateCol: 1,
    }

    const onPointerDown = (e: MouseEvent) => {
      if (e.button !== 0) return // Left click only
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(Array.from(raycastMeshesMapRef.current.keys()))

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const r = raycastMeshesMapRef.current.get(hitMesh)
        if (r) {
          const entry = rackEntriesRef.current.get(r.id)
          if (entry) {
            activeDragState.isDown = true
            activeDragState.isDragging = false
            activeDragState.startPointer = { x: e.clientX, y: e.clientY }
            activeDragState.rack = r
            activeDragState.group = entry.group
            activeDragState.originalPos.copy(entry.group.position)
            const cleanRow = r.row.replace(/row\s*/i, '').trim().toUpperCase()
            activeDragState.candidateRow = cleanRow
            activeDragState.candidateCol = r.col
            return
          }
        }
      }

      // Track pointer down for empty floor / empty slot click
      activeDragState.isDown = true
      activeDragState.isDragging = false
      activeDragState.startPointer = { x: e.clientX, y: e.clientY }
      activeDragState.rack = null
      activeDragState.group = null
    }

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      // ── Dragging Logic ──
      if (activeDragState.isDown && activeDragState.rack && activeDragState.group) {
        const dist = Math.hypot(e.clientX - activeDragState.startPointer.x, e.clientY - activeDragState.startPointer.y)
        if (!activeDragState.isDragging && dist > 7) {
          activeDragState.isDragging = true
          controls.enabled = false // Disable camera orbit while dragging rack
          container.style.cursor = 'grabbing'
          setHoveredRack(null)
          setHoveredEmptySlot(null)
          setTooltipPos(null)
          setIsDraggingRack(true)
        }

        if (activeDragState.isDragging) {
          raycaster.setFromCamera(mouse, camera)
          if (raycaster.ray.intersectPlane(dragPlane, planeIntersectPoint)) {
            // Lift cabinet slightly off the floor
            activeDragState.group.position.x = planeIntersectPoint.x
            activeDragState.group.position.y = 0.35
            activeDragState.group.position.z = planeIntersectPoint.z

            // Convert to discrete grid coordinates
            const cIdx = Math.max(0, Math.min(effectiveGridCols - 1, Math.round(planeIntersectPoint.x / 2.5 + (effectiveGridCols - 1) / 2)))
            const rIdx = Math.max(0, Math.min(effectiveGridRows - 1, Math.round(planeIntersectPoint.z / 3.6 + (effectiveGridRows - 1) / 2)))
            const targetCol = cIdx + 1
            const targetRow = String.fromCharCode(65 + rIdx)
            activeDragState.candidateRow = targetRow
            activeDragState.candidateCol = targetCol

            const snapX = (cIdx - (effectiveGridCols - 1) / 2) * 2.5
            const snapZ = (rIdx - (effectiveGridRows - 1) / 2) * 3.6

            dropMarker.position.set(snapX, 0.025, snapZ)
            dropMarkerMat.opacity = 0.65

            // Check if slot occupied by another cabinet
            const occupant = racksRef.current.find(
              (r) =>
                r.id !== activeDragState.rack!.id &&
                r.row.replace(/row\s*/i, '').trim().toUpperCase() === targetRow &&
                r.col === targetCol
            )

            if (occupant) {
              dropMarkerMat.color.setHex(0xf59e0b) // Amber for swap
              setDragCandidateCell({ row: targetRow, col: targetCol, occupantName: occupant.name })
            } else {
              dropMarkerMat.color.setHex(0x10b981) // Emerald for empty slot
              setDragCandidateCell({ row: targetRow, col: targetCol })
            }
          }
          return
        }
      }

      // ── Normal Hover Raycasting (Racks first) ──
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(Array.from(raycastMeshesMapRef.current.keys()))

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const r = raycastMeshesMapRef.current.get(hitMesh)
        if (r) {
          setHoveredRack(r)
          setHoveredEmptySlot(null)
          setTooltipPos({ x: e.clientX, y: e.clientY })
          container.style.cursor = 'pointer'
          if (hoveredSlotMeshRef.current) {
            ;(hoveredSlotMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.14
            hoveredSlotMeshRef.current = null
          }
          return
        }
      }

      // ── Empty Slots Hover Raycasting (in Edit Mode) ──
      if (isEditModeRef.current && emptySlotMeshesMapRef.current.size > 0) {
        const slotIntersects = raycaster.intersectObjects(Array.from(emptySlotMeshesMapRef.current.keys()))
        if (slotIntersects.length > 0) {
          const slotMesh = slotIntersects[0].object as THREE.Mesh
          const slot = emptySlotMeshesMapRef.current.get(slotMesh)
          if (slot) {
            setHoveredRack(null)
            setHoveredEmptySlot(slot)
            setTooltipPos({ x: e.clientX, y: e.clientY })
            container.style.cursor = 'pointer'
            if (hoveredSlotMeshRef.current && hoveredSlotMeshRef.current !== slotMesh) {
              ;(hoveredSlotMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.14
            }
            hoveredSlotMeshRef.current = slotMesh
            ;(slotMesh.material as THREE.MeshBasicMaterial).opacity = 0.45
            return
          }
        }
      }

      if (hoveredSlotMeshRef.current) {
        ;(hoveredSlotMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.14
        hoveredSlotMeshRef.current = null
      }
      setHoveredRack(null)
      setHoveredEmptySlot(null)
      setTooltipPos(null)
      container.style.cursor = 'grab'
    }

    const onPointerUp = (e: MouseEvent) => {
      if (!activeDragState.isDown) return
      activeDragState.isDown = false

      controls.enabled = true
      dropMarkerMat.opacity = 0
      setIsDraggingRack(false)
      setDragCandidateCell(null)
      container.style.cursor = 'grab'

      const dist = Math.hypot(e.clientX - activeDragState.startPointer.x, e.clientY - activeDragState.startPointer.y)
      const rack = activeDragState.rack
      const group = activeDragState.group
      const originalPos = activeDragState.originalPos

      // Simple click without dragging (dist <= 7px)
      if (dist <= 7) {
        if (rack) {
          onSelectRackRef.current(rack)
        } else {
          // Check if clicked an empty slot in edit mode
          const rect = renderer.domElement.getBoundingClientRect()
          mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
          mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(mouse, camera)

          if (isEditModeRef.current && emptySlotMeshesMapRef.current.size > 0) {
            const slotIntersects = raycaster.intersectObjects(Array.from(emptySlotMeshesMapRef.current.keys()))
            if (slotIntersects.length > 0) {
              const slotMesh = slotIntersects[0].object as THREE.Mesh
              const slot = emptySlotMeshesMapRef.current.get(slotMesh)
              if (slot) {
                onAddRackClickRef.current?.(slot)
                activeDragState.rack = null
                activeDragState.group = null
                return
              }
            }
          }

          // Clicked empty space outside racks/slots -> deselect
          onSelectRackRef.current(null)
        }
        activeDragState.rack = null
        activeDragState.group = null
        return
      }

      // Drag action completed!
      if (!rack || !group) return
      const cleanOriginalRow = rack.row.replace(/row\s*/i, '').trim().toUpperCase()
      const targetRow = activeDragState.candidateRow
      const targetCol = activeDragState.candidateCol
      const isChanged = targetRow !== cleanOriginalRow || targetCol !== rack.col

      if (isChanged) {
        handleDropRack(rack, targetRow, targetCol, originalPos)
      } else {
        // Return to original position
        group.position.copy(originalPos)
      }

      activeDragState.rack = null
      activeDragState.group = null
    }

    const onPointerDblClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(Array.from(raycastMeshesMapRef.current.keys()))

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const r = raycastMeshesMapRef.current.get(hitMesh)
        if (r) {
          onSelectRackRef.current(r)
          useTwinStore.getState().setSpatialLevel('rack', String(r.id), r.name)
          onViewRackElevation?.(r)
        }
      }
    }

    renderer.domElement.addEventListener('mousedown', onPointerDown)
    renderer.domElement.addEventListener('mousemove', onPointerMove)
    window.addEventListener('mouseup', onPointerUp)
    renderer.domElement.addEventListener('dblclick', onPointerDblClick)

    // 8. 60 FPS Render Loop
    let clock = new THREE.Clock()
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Zero-Reload Smooth Spatial Zoom Camera Lerp
      if (isZoomingRef.current && camera && controls) {
        camera.position.lerp(targetCamPosRef.current, 0.075)
        controls.target.lerp(targetLookAtRef.current, 0.075)
        controls.update()

        const posDist = camera.position.distanceTo(targetCamPosRef.current)
        const lookDist = controls.target.distanceTo(targetLookAtRef.current)

        if (posDist < 0.04 && lookDist < 0.04) {
          camera.position.copy(targetCamPosRef.current)
          controls.target.copy(targetLookAtRef.current)
          isZoomingRef.current = false
        }
      }

      // Pulse hazard rings & critical alarm beacons
      rackEntriesRef.current.forEach((entry) => {
        if (entry.hazardRing) {
          const mat = entry.hazardRing.material as THREE.MeshBasicMaterial
          mat.opacity = 0.4 + Math.sin(elapsed * 5) * 0.35
        }
        if (entry.rack.status === 'critical') {
          const mat = entry.beacon.material as THREE.MeshStandardMaterial
          mat.emissiveIntensity = 1.0 + Math.sin(elapsed * 6) * 0.8
        }
      })

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // 9. Resize Listener
    const handleResize = () => {
      if (!container || !camera || !renderer) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup on unmount
    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current)
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousedown', onPointerDown)
      renderer.domElement.removeEventListener('mousemove', onPointerMove)
      window.removeEventListener('mouseup', onPointerUp)
      renderer.domElement.removeEventListener('dblclick', onPointerDblClick)
      renderer.dispose()
      container.innerHTML = ''
    }
  }, [themeSceneColors, effectiveGridRows, effectiveGridCols, onViewRackElevation, handleDropRack])

  // =========================================================================
  // DYNAMIC RACK MESH CREATION & SHADER UPDATE (No Full Teardown)
  // =========================================================================
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Clean up previous rack groups
    rackEntriesRef.current.forEach((entry) => {
      scene.remove(entry.group)
    })
    rackEntriesRef.current.clear()
    raycastMeshesMapRef.current.clear()

    // Clean up previous empty slot groups in edit mode
    emptySlotGroupsRef.current.forEach((grp) => {
      scene.remove(grp)
    })
    emptySlotGroupsRef.current = []
    emptySlotMeshesMapRef.current.clear()
    hoveredSlotMeshRef.current = null

    const rackBoxGeo = new THREE.BoxGeometry(1.2, 2.6, 1.4)
    const frontVentGeo = new THREE.PlaneGeometry(1.08, 2.45)
    const beaconGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.14, 16)
    const underglowGeo = new THREE.BoxGeometry(1.3, 0.06, 1.5)
    const hazardRingGeo = new THREE.RingGeometry(0.9, 1.25, 32)

    racks.forEach((rack, index) => {
      // Calculate row & col grid coordinates
      const rowClean = rack.row.replace(/row\s*/i, '').trim().toUpperCase()
      const rIdx = rowClean.length === 1 ? rowClean.charCodeAt(0) - 65 : Math.floor(index / effectiveGridCols)
      const cIdx = (rack.col || (index % effectiveGridCols) + 1) - 1

      const xPos = (cIdx - (effectiveGridCols - 1) / 2) * 2.5
      const zPos = (rIdx - (effectiveGridRows - 1) / 2) * 3.6

      const rackGroup = new THREE.Group()
      rackGroup.position.set(xPos, 0, zPos)

      const visData = getRackVisualData(rack, activeMode)

      // 1. Cabinet Body Material (Glassmorphic chassis with metric-accent edge)
      const cabinetMat = new THREE.MeshStandardMaterial({
        color: isLight ? 0xe2e8f0 : 0x161c24,
        roughness: isLight ? 0.3 : 0.35,
        metalness: isLight ? 0.2 : 0.7,
        emissive: visData.threeColor,
        emissiveIntensity: activeMode === 'temp' || activeMode === 'power' ? 0.22 : (isLight ? 0.04 : 0.08),
      })
      const cabinet = new THREE.Mesh(rackBoxGeo, cabinetMat)
      cabinet.position.y = 1.3
      cabinet.castShadow = true
      cabinet.receiveShadow = true
      rackGroup.add(cabinet)

      // Register for raycasting
      raycastMeshesMapRef.current.set(cabinet, rack)

      // 2. Front Face Mesh with Volumetric RU Heat Glow
      const frontMat = new THREE.MeshStandardMaterial({
        color: isLight ? 0xcfd8dc : 0x1f2833,
        roughness: isLight ? 0.35 : 0.4,
        metalness: isLight ? 0.3 : 0.8,
        emissive: visData.threeColor,
        emissiveIntensity: isLight ? 0.2 : 0.4,
      })
      const frontMesh = new THREE.Mesh(frontVentGeo, frontMat)
      frontMesh.position.set(0, 1.3, 0.705)
      rackGroup.add(frontMesh)

      // 3. Volumetric 3D Internal Fill (Shows physical RU height density)
      const fillHeight = Math.max(0.1, (visData.spacePct / 100) * 2.5)
      const fillGeo = new THREE.BoxGeometry(1.02, fillHeight, 0.1)
      const fillMat = new THREE.MeshBasicMaterial({
        color: visData.threeColor,
        transparent: true,
        opacity: activeMode === '3d' ? 0.85 : 0.35,
      })
      const fillMesh = new THREE.Mesh(fillGeo, fillMat)
      fillMesh.position.set(0, fillHeight / 2 + 0.05, 0.69)
      rackGroup.add(fillMesh)

      // 4. LED Alert Beacon Sphere on Top
      const beaconMat = new THREE.MeshStandardMaterial({
        color: visData.threeColor,
        emissive: visData.threeColor,
        emissiveIntensity: rack.status === 'critical' ? 2.0 : 1.2,
        roughness: 0.1,
      })
      const beacon = new THREE.Mesh(beaconGeo, beaconMat)
      beacon.position.set(0, 2.68, 0)
      rackGroup.add(beacon)

      // 5. Selected Underglow
      const isSelected = rack.id === selectedRackId
      const underglowMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x3b82f6 : visData.threeColor,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.25,
      })
      const underglow = new THREE.Mesh(underglowGeo, underglowMat)
      underglow.position.set(0, 0.03, 0)
      rackGroup.add(underglow)

      // 6. Single-Corded Hazard Ring (If PDU Redundancy is broken)
      let hazardRing: THREE.Mesh | null = null
      if (visData.hasFailoverRisk) {
        const hazardMat = new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        })
        hazardRing = new THREE.Mesh(hazardRingGeo, hazardMat)
        hazardRing.rotation.x = -Math.PI / 2
        hazardRing.position.set(0, 0.04, 0)
        rackGroup.add(hazardRing)
      }

      // 7. Billboard Text Label Sprite
      const labelSprite = createTextSprite(
        rack.name,
        visData.subtext,
        visData.subtextColor,
        isSelected ? '#3b82f6' : visData.hex
      )
      if (labelSprite) {
        labelSprite.position.set(0, 3.2, 0)
        rackGroup.add(labelSprite)
      }

      scene.add(rackGroup)

      rackEntriesRef.current.set(rack.id, {
        group: rackGroup,
        cabinet,
        frontMesh,
        fillMesh,
        beacon,
        underglow,
        hazardRing,
        labelSprite,
        rack,
      })
    })

    // ── Build Interactive Empty Slots for 3D Edit Mode ──
    if (isEditMode) {
      const occupiedSlots = new Set(
        racks.map((r) => {
          const rowClean = r.row.replace(/row\s*/i, '').trim().toUpperCase()
          return `${rowClean}_${r.col}`
        })
      )

      const padGeo = new THREE.PlaneGeometry(1.4, 1.8)
      const edgesGeo = new THREE.EdgesGeometry(padGeo)

      for (let r = 0; r < effectiveGridRows; r++) {
        const rowChar = String.fromCharCode(65 + r)
        for (let c = 0; c < effectiveGridCols; c++) {
          const colNum = c + 1
          const key = `${rowChar}_${colNum}`
          if (!occupiedSlots.has(key)) {
            const xPos = (c - (effectiveGridCols - 1) / 2) * 2.5
            const zPos = (r - (effectiveGridRows - 1) / 2) * 3.6

            const slotGroup = new THREE.Group()
            slotGroup.position.set(xPos, 0.02, zPos)

            const padMat = new THREE.MeshBasicMaterial({
              color: 0x06b6d4,
              transparent: true,
              opacity: 0.14,
              side: THREE.DoubleSide,
            })
            const padMesh = new THREE.Mesh(padGeo, padMat)
            padMesh.rotation.x = -Math.PI / 2
            slotGroup.add(padMesh)

            const edgesMat = new THREE.LineBasicMaterial({
              color: 0x22d3ee,
              transparent: true,
              opacity: 0.45,
            })
            const borderLine = new THREE.LineSegments(edgesGeo, edgesMat)
            borderLine.rotation.x = -Math.PI / 2
            slotGroup.add(borderLine)

            const plusSprite = createEmptySlotSprite(`Row ${rowChar}`, colNum)
            if (plusSprite) {
              plusSprite.position.set(0, 0.35, 0)
              slotGroup.add(plusSprite)
            }

            scene.add(slotGroup)
            emptySlotGroupsRef.current.push(slotGroup)
            emptySlotMeshesMapRef.current.set(padMesh, { row: `Row ${rowChar}`, col: colNum })
          }
        }
      }
    }
  }, [racks, activeMode, selectedRackId, effectiveGridRows, effectiveGridCols, getRackVisualData, createTextSprite, isEditMode, createEmptySlotSprite, isLight])

  // Spatial Camera Zoom Presets
  const zoomToSite = useCallback(() => {
    targetCamPosRef.current.set(22, 26, 32)
    targetLookAtRef.current.set(0, 0, 0)
    isZoomingRef.current = true
    useTwinStore.getState().resetSpatialSelection()
  }, [])

  const zoomToRoom = useCallback(() => {
    targetCamPosRef.current.set(14, 16, 20)
    targetLookAtRef.current.set(0, 1.2, 0)
    isZoomingRef.current = true
    useTwinStore.getState().setSpatialLevel('room', 'hall-a', 'Hall-A')
  }, [])

  const zoomToRow = useCallback(
    (rowChar: string) => {
      const clean = rowChar.replace(/row\s*/i, '').trim().toUpperCase()
      const rIdx = clean.charCodeAt(0) - 65
      const zPos = (rIdx - (effectiveGridRows - 1) / 2) * 3.6
      targetCamPosRef.current.set(-9, 2.5, zPos + 1.25)
      targetLookAtRef.current.set(0, 1.3, zPos + 1.25)
      isZoomingRef.current = true
      useTwinStore.getState().setSpatialLevel('row', rowChar.toLowerCase(), `Row ${clean}`)
    },
    [effectiveGridRows]
  )

  const zoomToTopDown = useCallback(() => {
    targetCamPosRef.current.set(0, 26, 0.01)
    targetLookAtRef.current.set(0, 0, 0)
    isZoomingRef.current = true
  }, [])

  // Camera Reset Handler
  const handleResetCamera = () => {
    zoomToRoom()
  }

  // Top-Down CAD View Handler
  const handleTopDownCamera = () => {
    zoomToTopDown()
  }

  // Zoom Handler
  const handleZoom = (delta: number) => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(delta)
    }
  }

  // Sync autoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
      controlsRef.current.autoRotateSpeed = 1.2
    }
  }, [autoRotate])

  return (
    <div className="relative w-full h-[680px] bg-[#f5f5f7] rounded-[20px] border-[0.5px] border-black/10 overflow-hidden select-none shadow-sm">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Heatmap & Camera Ribbon */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
        {/* Left: Viewport Mode Switcher (optional slot) & Heatmap Overlays */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {viewportControl}
          <div className="flex items-center gap-1 p-1 rounded-[12px] bg-white/80 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 shadow-xs">
            <button
              type="button"
              onClick={() => handleModeChange('status')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                activeMode === 'status'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Status</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('temp')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                activeMode === 'temp'
                  ? 'bg-[#ff3b30] text-white shadow-xs'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5" />
              <span>Thermal</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('power')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                activeMode === 'power'
                  ? 'bg-[#ff9500] text-white shadow-xs'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Power</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('3d')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                activeMode === '3d'
                  ? 'bg-[#5856d6] text-white shadow-xs'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Space</span>
            </button>
          </div>
        </div>

        {/* Center: Spatial Level Quick-Fly Capsule (Apple Style) */}
        <div className="hidden lg:flex items-center gap-1 p-1 rounded-[12px] bg-white/80 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 shadow-xs pointer-events-auto text-xs">
          <button
            type="button"
            onClick={zoomToSite}
            className="px-2.5 py-1 rounded-[8px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5 transition-colors cursor-pointer"
            title="Fly camera to Site Panoramic View"
          >
            Site
          </button>
          <button
            type="button"
            onClick={zoomToRoom}
            className="px-2.5 py-1 rounded-[8px] text-[#007AFF] font-bold transition-colors cursor-pointer"
            title="Fly camera to Data Hall View"
          >
            Hall-A
          </button>
          <button
            type="button"
            onClick={() => zoomToRow('A')}
            className="px-2.5 py-1 rounded-[8px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5 transition-colors cursor-pointer"
            title="Fly camera down Row A Cold Aisle Corridor"
          >
            Row A
          </button>
          <button
            type="button"
            onClick={() => zoomToRow('B')}
            className="px-2.5 py-1 rounded-[8px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5 transition-colors cursor-pointer"
            title="Fly camera down Row B Cold Aisle Corridor"
          >
            Row B
          </button>
        </div>

        {/* Right: Camera Action Buttons + Telemetry Slot */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className={`flex items-center gap-1 p-1 border transition-colors ${
            isTeslaDark
              ? 'rounded-[6px] bg-[#111111] border-[#1F1F1F]'
              : 'rounded-[12px] bg-white/80 backdrop-blur-xl saturate-180 border-black/10 shadow-xs'
          }`}>
            <button
              type="button"
              onClick={handleResetCamera}
              title="Reset Perspective Orbit"
              className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                isTeslaDark ? 'text-[#8E8E93] hover:text-[#F5F5F7] hover:bg-[#1a1a1a]' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleTopDownCamera}
              title="Top-Down CAD Floor Plan View"
              className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                isTeslaDark ? 'text-[#8E8E93] hover:text-[#F5F5F7] hover:bg-[#1a1a1a]' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(0.82)}
              title="Zoom In"
              className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                isTeslaDark ? 'text-[#8E8E93] hover:text-[#F5F5F7] hover:bg-[#1a1a1a]' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(1.18)}
              title="Zoom Out"
              className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                isTeslaDark ? 'text-[#8E8E93] hover:text-[#F5F5F7] hover:bg-[#1a1a1a]' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAutoRotate(!autoRotate)}
              title={autoRotate ? 'Pause Orbit' : 'Auto Orbit 360°'}
              className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
                autoRotate
                  ? isTeslaDark ? 'bg-[#3E6AE1] text-white shadow-xs' : 'bg-[#007AFF] text-white shadow-xs'
                  : isTeslaDark ? 'text-[#8E8E93] hover:text-[#F5F5F7] hover:bg-[#1a1a1a]' : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5'
              }`}
            >
              {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>

          {telemetrySlot}
        </div>
      </div>

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs pointer-events-none">
        <div className={`px-4 py-2 border flex items-center gap-4 pointer-events-auto transition-colors ${
          isTeslaDark
            ? 'rounded-[6px] bg-[#111111] border-[#1F1F1F] text-[#F5F5F7]'
            : 'rounded-[12px] bg-white/80 backdrop-blur-xl saturate-180 border-black/10 shadow-xs'
        }`}>
          {activeMode === 'temp' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isTeslaDark ? 'bg-[#3E6AE1]' : 'bg-[#007AFF]'}`} />
                <span className="text-[11px] text-[#86868B]">&lt; 20°C Overcooled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isTeslaDark ? 'bg-[#00C853]' : 'bg-emerald-500'}`} />
                <span className={`text-[11px] font-semibold ${isTeslaDark ? 'text-[#00C853]' : 'text-emerald-600'}`}>20-25°C ASHRAE Recommended</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500]" />
                <span className="text-[11px] text-[#ff9500] font-medium">25-27°C Allowable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isTeslaDark ? 'bg-[#E82127]' : 'bg-rose-500'} animate-pulse`} />
                <span className={`text-[11px] font-bold ${isTeslaDark ? 'text-[#E82127]' : 'text-rose-600'}`}>&gt; 27°C Hot Spot Critical</span>
              </div>
            </>
          ) : activeMode === 'power' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isTeslaDark ? 'bg-[#00C853]' : 'bg-emerald-500'}`} />
                <span className="text-[11px] text-[#86868B]">&lt; 65% Normal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500]" />
                <span className="text-[11px] text-[#ff9500] font-medium">65-85% High Load</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isTeslaDark ? 'bg-[#E82127]' : 'bg-rose-500'} animate-pulse`} />
                <span className={`text-[11px] font-bold ${isTeslaDark ? 'text-[#E82127]' : 'text-rose-600'}`}>&gt; 85% Overloaded</span>
              </div>
              <div className={`flex items-center gap-1.5 border-l pl-3 ${isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'}`}>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span className="text-[10px] text-rose-500 font-semibold">Red Ring = Single PDU Risk</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isTeslaDark ? 'bg-[#00C853]' : 'bg-emerald-500'}`} />
                <span className={`text-[11px] font-semibold ${isTeslaDark ? 'text-[#00C853]' : 'text-emerald-600'}`}>Healthy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff9500]" />
                <span className="text-[11px] text-[#ff9500] font-semibold">Warning</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isTeslaDark ? 'bg-[#E82127]' : 'bg-rose-500'} animate-pulse`} />
                <span className={`text-[11px] font-bold ${isTeslaDark ? 'text-[#E82127]' : 'text-rose-600'}`}>Critical Alarm</span>
              </div>
              <div className={`flex items-center gap-1.5 border-l pl-3 text-[10px] ${
                isTeslaDark ? 'border-[#1F1F1F] text-[#8E8E93]' : 'border-black/10 text-[#86868B]'
              }`}>
                <Move className={`w-3 h-3 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#007AFF]'} animate-pulse`} />
                <span>Drag Cabinet to relocate • Dbl-click for 42U Elevation</span>
              </div>
            </>
          )}
        </div>

        <div className={`px-3.5 py-1.5 border text-[11px] pointer-events-auto flex items-center gap-2 transition-colors ${
          isTeslaDark
            ? 'rounded-[6px] bg-[#111111] border-[#1F1F1F] text-[#8E8E93]'
            : 'rounded-[12px] bg-white/80 backdrop-blur-xl saturate-180 border-black/10 text-[#86868B] shadow-xs'
        }`}>
          <Layers className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#007AFF]'}`} />
          <span>{racks.length} Cabinets • WebGL 3D Twin</span>
        </div>
      </div>

      {/* Floating Drag & Drop Target Helper HUD */}
      {isDraggingRack && dragCandidateCell && (
        <div className={`absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 border flex items-center gap-3 text-xs pointer-events-none transition-colors ${
          isTeslaDark
            ? 'rounded-[6px] bg-[#111111] border-[#1F1F1F] text-[#F5F5F7] shadow-2xl'
            : 'rounded-[12px] bg-white/90 backdrop-blur-xl border-black/10 shadow-2xl text-zinc-900'
        }`}>
          <Move className={`w-4 h-4 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#007AFF]'} animate-pulse`} />
          <span className={isTeslaDark ? 'text-[#F5F5F7]' : 'text-[#1D1D1F]'}>
            Dropping to: <strong className={`${isTeslaDark ? 'text-[#00C853]' : 'text-emerald-600'} font-bold`}>Row {dragCandidateCell.row} / Col {dragCandidateCell.col}</strong>
          </span>
          {dragCandidateCell.occupantName && (
            <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium border ${
              isTeslaDark
                ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              Swapping with {dragCandidateCell.occupantName}
            </span>
          )}
        </div>
      )}

      {/* Auto-Save Toast Feedback */}
      {toastMessage && (
        <div
          className={`absolute top-16 right-4 z-40 px-4 py-2.5 rounded-[12px] backdrop-blur-xl shadow-2xl border text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 ${
            toastMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Interactive Hover HUD Tooltip */}
      {hoveredRack && tooltipPos && !isDraggingRack && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-[120%] p-3.5 rounded-[16px] bg-white/95 border-[0.5px] border-black/10 shadow-2xl text-xs backdrop-blur-2xl min-w-[240px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-black/10 mb-2">
            <span className="font-bold text-[#1D1D1F] text-sm">{hoveredRack.name}</span>
            <span
              className={`px-2 py-0.5 rounded-[6px] text-[10px] uppercase font-bold border ${
                hoveredRack.status === 'critical'
                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                  : hoveredRack.status === 'warning'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
            >
              {hoveredRack.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[#86868B] block text-[9px] uppercase font-medium">Location</span>
              <span className="text-[#1D1D1F] font-semibold">
                Row {hoveredRack.row} / Col {hoveredRack.col}
              </span>
            </div>
            <div>
              <span className="text-[#86868B] block text-[9px] uppercase font-medium">Capacity</span>
              <span className="text-[#1D1D1F] font-semibold">
                {hoveredRack.used_u} / {hoveredRack.total_u} U
              </span>
            </div>
            <div>
              <span className="text-[#86868B] block text-[9px] uppercase font-medium">Inlet Temp</span>
              <span className="text-[#007AFF] font-bold">{hoveredRack.inlet_temp_c} °C</span>
            </div>
            <div>
              <span className="text-[#86868B] block text-[9px] uppercase font-medium">Power Load</span>
              <span className="text-[#ff9500] font-bold">{hoveredRack.power_kw} kW</span>
            </div>
          </div>

          <div className="mt-2.5 pt-1.5 border-t border-black/10 text-[10px] text-[#007AFF] font-semibold flex items-center justify-between">
            <span>Drag to relocate • Dbl-click 42U</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      )}

      {/* Interactive Empty Slot Hover Tooltip in 3D Edit Mode */}
      {hoveredEmptySlot && tooltipPos && !isDraggingRack && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-[130%] px-3.5 py-2 rounded-[12px] bg-white/95 border-[0.5px] border-black/10 shadow-2xl text-xs text-[#007AFF] flex items-center gap-2 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <Plus className="w-3.5 h-3.5 text-[#007AFF] animate-pulse" />
          <span className="font-semibold">Click to place Rack at {hoveredEmptySlot.row} / Col {hoveredEmptySlot.col}</span>
        </div>
      )}

      {/* 3D Edit Mode: Floating Selected Rack Action Bar */}
      {isEditMode && selectedRack && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-[16px] bg-white/90 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-2xl flex items-center gap-4 text-xs animate-in fade-in slide-in-from-bottom-3 pointer-events-auto">
          <div className="flex flex-col">
            <span className="text-[10px] text-[#86868B] uppercase tracking-wider font-semibold">Selected Cabinet</span>
            <span className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
              <span>{selectedRack.name}</span>
              <span className="text-xs text-[#007AFF]">({selectedRack.row} / Col {selectedRack.col})</span>
            </span>
          </div>

          <div className="h-7 w-[1px] bg-black/10" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onViewRackElevation?.(selectedRack)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 transition-colors cursor-pointer text-xs font-semibold"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>42U Elevation</span>
            </button>
            <button
              type="button"
              onClick={() => onDeleteRackClickRef.current?.(selectedRack)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Rack</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectRackRef.current(null)}
              className="p-1.5 text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5 rounded-[8px] transition-colors cursor-pointer"
              title="Deselect"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3D Edit Mode Banner */}
      {isEditMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-[12px] bg-white/90 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-xl flex items-center gap-3 text-xs pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-ping" />
          <span className="text-[#1D1D1F] font-bold tracking-wide">3D LAYOUT EDITOR ACTIVE</span>
          <span className="text-[#86868B] text-[11px] hidden sm:inline">• Drag cabinets to relocate • Click empty slot [+] to add</span>
        </div>
      )}
    </div>
  )
}
