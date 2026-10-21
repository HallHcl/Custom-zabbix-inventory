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
} from 'lucide-react'
import type { RackSummary } from '../../types'
import { useTwinStore } from '../../store/useTwinStore'
import { useTheme } from '../../lib/theme'

export type ColorMode = '3d' | 'status' | 'temp' | 'power'

interface DataCenter3DViewProps {
  racks: RackSummary[]
  selectedRackId: number | null
  onSelectRack: (rack: RackSummary) => void
  onViewRackElevation?: (rack: RackSummary) => void
  gridRows?: number
  gridCols?: number
  roomTempTarget?: number
  mode?: ColorMode
  onModeChange?: (mode: ColorMode) => void
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const reqIdRef = useRef<number | null>(null)

  // Zustand Store Telemetry & Theme
  const racksTelemetry = useTwinStore((s) => s.racksTelemetry)
  const { theme } = useTheme()

  // Track rack meshes for dynamic updates without full scene tear-down
  const rackEntriesRef = useRef<Map<number, RackMeshEntry>>(new Map())
  const raycastMeshesMapRef = useRef<Map<THREE.Mesh, RackSummary>>(new Map())

  // Zero-Reload Smooth Spatial Zoom Engine Refs
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(14, 16, 20))
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 0))
  const isZoomingRef = useRef<boolean>(false)

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
      ctx.fillStyle = 'rgba(18, 24, 38, 0.90)'
      ctx.strokeStyle = borderColor
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.roundRect(8, 8, 240, 80, 16)
      ctx.fill()
      ctx.stroke()

      // Title
      ctx.font = 'bold 26px "JetBrains Mono", monospace'
      ctx.fillStyle = '#ffffff'
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
    []
  )

  // Theme-aware palette configuration
  const themeSceneColors = useMemo(() => {
    switch (theme) {
      case 'cupertino-frost':
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
      default:
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
    const roomW = gridCols * 2.8 + 8
    const roomD = gridRows * 3.6 + 8

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
    for (let r = 0; r < gridRows; r++) {
      const zPos = (r - (gridRows - 1) / 2) * 3.6
      const runnerGeo = new THREE.PlaneGeometry(gridCols * 2.6 + 2, 1.3)
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

    // 7. Raycasting Setup
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(Array.from(raycastMeshesMapRef.current.keys()))

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const r = raycastMeshesMapRef.current.get(hitMesh)
        if (r) {
          setHoveredRack(r)
          setTooltipPos({ x: e.clientX, y: e.clientY })
          container.style.cursor = 'pointer'
          return
        }
      }
      setHoveredRack(null)
      setTooltipPos(null)
      container.style.cursor = 'grab'
    }

    const onPointerClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(Array.from(raycastMeshesMapRef.current.keys()))

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const r = raycastMeshesMapRef.current.get(hitMesh)
        if (r) {
          onSelectRack(r)
          onViewRackElevation?.(r)
        }
      }
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
          onSelectRack(r)
          const entry = rackEntriesRef.current.get(r.id)
          if (entry) {
            const p = entry.group.position
            targetCamPosRef.current.set(p.x, 1.55, p.z + 3.0)
            targetLookAtRef.current.set(p.x, 1.35, p.z)
            isZoomingRef.current = true
          }
          useTwinStore.getState().setSpatialLevel('rack', String(r.id), r.name)
          onViewRackElevation?.(r)
        }
      }
    }

    renderer.domElement.addEventListener('mousemove', onPointerMove)
    renderer.domElement.addEventListener('click', onPointerClick)
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
      renderer.domElement.removeEventListener('mousemove', onPointerMove)
      renderer.domElement.removeEventListener('click', onPointerClick)
      renderer.domElement.removeEventListener('dblclick', onPointerDblClick)
      renderer.dispose()
      container.innerHTML = ''
    }
  }, [themeSceneColors, gridRows, gridCols, onSelectRack, onViewRackElevation])

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

    const rackBoxGeo = new THREE.BoxGeometry(1.2, 2.6, 1.4)
    const frontVentGeo = new THREE.PlaneGeometry(1.08, 2.45)
    const beaconGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.14, 16)
    const underglowGeo = new THREE.BoxGeometry(1.3, 0.06, 1.5)
    const hazardRingGeo = new THREE.RingGeometry(0.9, 1.25, 32)

    racks.forEach((rack, index) => {
      // Calculate row & col grid coordinates
      const rowClean = rack.row.replace(/row\s*/i, '').trim().toUpperCase()
      const rIdx = rowClean.length === 1 ? rowClean.charCodeAt(0) - 65 : Math.floor(index / gridCols)
      const cIdx = (rack.col || (index % gridCols) + 1) - 1

      const xPos = (cIdx - (gridCols - 1) / 2) * 2.5
      const zPos = (rIdx - (gridRows - 1) / 2) * 3.6

      const rackGroup = new THREE.Group()
      rackGroup.position.set(xPos, 0, zPos)

      const visData = getRackVisualData(rack, activeMode)

      // 1. Cabinet Body Material (Glassmorphic dark chassis with metric-accent edge)
      const cabinetMat = new THREE.MeshStandardMaterial({
        color: 0x161c24,
        roughness: 0.35,
        metalness: 0.7,
        emissive: visData.threeColor,
        emissiveIntensity: activeMode === 'temp' || activeMode === 'power' ? 0.22 : 0.08,
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
        color: 0x1f2833,
        roughness: 0.4,
        metalness: 0.8,
        emissive: visData.threeColor,
        emissiveIntensity: 0.4,
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
  }, [racks, activeMode, selectedRackId, gridRows, gridCols, getRackVisualData, createTextSprite])

  // Auto-Zoom Camera to Selected Rack when selectedRackId changes
  useEffect(() => {
    if (selectedRackId) {
      const entry = rackEntriesRef.current.get(selectedRackId)
      if (entry) {
        const p = entry.group.position
        targetCamPosRef.current.set(p.x, 1.55, p.z + 3.0)
        targetLookAtRef.current.set(p.x, 1.35, p.z)
        isZoomingRef.current = true
      }
    }
  }, [selectedRackId])

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
      const zPos = (rIdx - (gridRows - 1) / 2) * 3.6
      targetCamPosRef.current.set(-9, 2.5, zPos + 1.25)
      targetLookAtRef.current.set(0, 1.3, zPos + 1.25)
      isZoomingRef.current = true
      useTwinStore.getState().setSpatialLevel('row', rowChar.toLowerCase(), `Row ${clean}`)
    },
    [gridRows]
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
    <div className="relative w-full h-[680px] bg-[var(--bg-base)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden select-none shadow-2xl">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Floating Heatmap & Camera Ribbon */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Left: Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl glass-panel-elevated shadow-xl pointer-events-auto">
          <button
            type="button"
            onClick={() => handleModeChange('status')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${
              activeMode === 'status'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Status</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('temp')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${
              activeMode === 'temp'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>ASHRAE Thermal</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('power')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${
              activeMode === 'power'
                ? 'bg-amber-500 text-black shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Power & Watts</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all cursor-pointer ${
              activeMode === '3d'
                ? 'bg-cyan-500 text-black shadow-sm font-bold'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Volumetric Space</span>
          </button>
        </div>

        {/* Center: Spatial Level Quick-Fly Capsule (Apple VisionOS / Tesla Style) */}
        <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl glass-panel-elevated shadow-xl pointer-events-auto text-xs font-mono">
          <button
            type="button"
            onClick={zoomToSite}
            className="px-2.5 py-1 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            title="Fly camera to Site Panoramic View"
          >
            Site
          </button>
          <button
            type="button"
            onClick={zoomToRoom}
            className="px-2.5 py-1 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors cursor-pointer font-bold text-[var(--accent-primary)]"
            title="Fly camera to Data Hall View"
          >
            Hall-A
          </button>
          <button
            type="button"
            onClick={() => zoomToRow('A')}
            className="px-2.5 py-1 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            title="Fly camera down Row A Cold Aisle Corridor"
          >
            Row A
          </button>
          <button
            type="button"
            onClick={() => zoomToRow('B')}
            className="px-2.5 py-1 rounded-lg text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            title="Fly camera down Row B Cold Aisle Corridor"
          >
            Row B
          </button>
        </div>

        {/* Right: Camera Action Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-xl glass-panel-elevated shadow-xl pointer-events-auto">
          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset Perspective Orbit"
            className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)] rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleTopDownCamera}
            title="Top-Down CAD Floor Plan View"
            className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)] rounded-lg transition-colors cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(0.82)}
            title="Zoom In"
            className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)] rounded-lg transition-colors cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.18)}
            title="Zoom Out"
            className="p-2 text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)] rounded-lg transition-colors cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Pause Orbit' : 'Auto Orbit 360°'}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              autoRotate
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-surface)]'
            }`}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono pointer-events-none">
        <div className="px-4 py-2 rounded-xl glass-panel-elevated flex items-center gap-4 shadow-xl pointer-events-auto">
          {activeMode === 'temp' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                <span className="text-[11px] text-[var(--text-secondary)]">&lt; 20°C Overcooled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-[11px] text-emerald-400 font-bold">20-25°C ASHRAE Recommended</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                <span className="text-[11px] text-amber-300">25-27°C Allowable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_#f43f5e]" />
                <span className="text-[11px] font-bold text-rose-400">&gt; 27°C Hot Spot Critical</span>
              </div>
            </>
          ) : activeMode === 'power' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-[11px] text-[var(--text-secondary)]">&lt; 65% Normal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                <span className="text-[11px] text-amber-300">65-85% High Load</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_#f43f5e]" />
                <span className="text-[11px] font-bold text-rose-400">&gt; 85% Overloaded</span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-[var(--border-subtle)] pl-3">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span className="text-[10px] text-rose-400 font-semibold">Red Ring = Single PDU Risk</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-[11px] text-emerald-400 font-semibold">Healthy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                <span className="text-[11px] text-amber-300 font-semibold">Warning</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_#f43f5e]" />
                <span className="text-[11px] font-bold text-rose-400">Critical Alarm</span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-[var(--border-subtle)] pl-3 text-[var(--text-muted)] text-[10px]">
                <span>Click Cabinet to open 42U Elevation</span>
              </div>
            </>
          )}
        </div>

        <div className="px-3 py-1.5 rounded-xl glass-panel-elevated text-[var(--text-secondary)] text-[11px] font-mono shadow-xl pointer-events-auto flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>{racks.length} Cabinets • WebGL 3D Twin</span>
        </div>
      </div>

      {/* Interactive Hover HUD Tooltip */}
      {hoveredRack && tooltipPos && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-[120%] p-3.5 rounded-xl glass-panel-elevated border border-[var(--accent-primary)]/50 shadow-2xl text-xs font-mono backdrop-blur-xl min-w-[240px] animate-in fade-in zoom-in-95 duration-100"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-subtle)] mb-2">
            <span className="font-bold text-[var(--text-bright)] text-sm">{hoveredRack.name}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                hoveredRack.status === 'critical'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : hoveredRack.status === 'warning'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {hoveredRack.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[var(--text-muted)] block text-[9px]">Location</span>
              <span className="text-[var(--text-bright)]">
                Row {hoveredRack.row} / Col {hoveredRack.col}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[9px]">Capacity</span>
              <span className="text-[var(--text-bright)]">
                {hoveredRack.used_u} / {hoveredRack.total_u} U
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[9px]">Inlet Temp</span>
              <span className="text-cyan-400 font-bold">{hoveredRack.inlet_temp_c} °C</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] block text-[9px]">Power Load</span>
              <span className="text-amber-400 font-bold">{hoveredRack.power_kw} kW</span>
            </div>
          </div>

          <div className="mt-2.5 pt-1.5 border-t border-[var(--border-subtle)] text-[10px] text-[var(--accent-primary)] flex items-center justify-between">
            <span>Click to zoom & inspect 42U</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      )}
    </div>
  )
}
