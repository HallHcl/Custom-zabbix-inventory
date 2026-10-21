import { useEffect, useRef, useState } from 'react'
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
} from 'lucide-react'
import type { RackSummary } from '../../types'

interface DataCenter3DViewProps {
  racks: RackSummary[]
  selectedRackId: number | null
  onSelectRack: (rack: RackSummary) => void
  onViewRackElevation?: (rack: RackSummary) => void
  gridRows?: number
  gridCols?: number
  roomTempTarget?: number
}

type ColorMode = 'status' | 'temp' | 'power'

export function DataCenter3DView({
  racks,
  selectedRackId,
  onSelectRack,
  onViewRackElevation,
  gridRows = 3,
  gridCols = 4,
  roomTempTarget = 24.5,
}: DataCenter3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const reqIdRef = useRef<number | null>(null)

  // Interactive meshes map
  const rackMeshesMapRef = useRef<Map<THREE.Mesh, RackSummary>>(new Map())
  const beaconMeshesRef = useRef<{ mesh: THREE.Mesh; rack: RackSummary; baseColor: THREE.Color }[]>([])

  // UI state
  const [colorMode, setColorMode] = useState<ColorMode>('status')
  const [autoRotate, setAutoRotate] = useState<boolean>(false)
  const [hoveredRack, setHoveredRack] = useState<RackSummary | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  // Parse row index from name like "Row A", "A", etc.
  const getRowIndex = (rowStr: string): number => {
    const clean = rowStr.replace(/row\s*/i, '').trim().toUpperCase()
    if (clean.length === 1) {
      return clean.charCodeAt(0) - 65 // 'A' -> 0, 'B' -> 1, 'C' -> 2
    }
    const num = parseInt(clean, 10)
    return isNaN(num) ? 0 : num - 1
  }

  // Get color for rack status / temp / power
  const getRackColor = (rack: RackSummary, mode: ColorMode): { hex: string; threeColor: THREE.Color } => {
    if (mode === 'status') {
      if (rack.status === 'critical') return { hex: '#ef4444', threeColor: new THREE.Color(0xef4444) }
      if (rack.status === 'warning') return { hex: '#f59e0b', threeColor: new THREE.Color(0xf59e0b) }
      if (rack.status === 'offline') return { hex: '#64748b', threeColor: new THREE.Color(0x64748b) }
      return { hex: '#10b981', threeColor: new THREE.Color(0x10b981) }
    }
    if (mode === 'temp') {
      const t = rack.inlet_temp_c || roomTempTarget
      if (t >= 27) return { hex: '#ef4444', threeColor: new THREE.Color(0xef4444) }
      if (t >= 25.5) return { hex: '#f97316', threeColor: new THREE.Color(0xf97316) }
      if (t >= 24) return { hex: '#8bd7d1', threeColor: new THREE.Color(0x8bd7d1) }
      return { hex: '#00bceb', threeColor: new THREE.Color(0x00bceb) }
    }
    // Power mode
    const kw = rack.power_kw || 1.2
    if (kw >= 3.0) return { hex: '#ef4444', threeColor: new THREE.Color(0xef4444) }
    if (kw >= 2.0) return { hex: '#f59e0b', threeColor: new THREE.Color(0xf59e0b) }
    if (kw >= 1.5) return { hex: '#38bdf8', threeColor: new THREE.Color(0x38bdf8) }
    return { hex: '#10b981', threeColor: new THREE.Color(0x10b981) }
  }

  // Helper to create sharp billboard text canvas
  const createTextSprite = (text: string, subtext?: string) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 96
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Background pill
    ctx.fillStyle = 'rgba(48, 56, 65, 0.92)'
    ctx.strokeStyle = '#7aa5d2'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(8, 8, 240, 80, 16)
    ctx.fill()
    ctx.stroke()

    // Title text
    ctx.font = 'bold 30px "JetBrains Mono", monospace'
    ctx.fillStyle = '#eeeeee'
    ctx.textAlign = 'center'
    ctx.fillText(text, 128, 44)

    // Subtext
    if (subtext) {
      ctx.font = 'bold 20px "JetBrains Mono", monospace'
      ctx.fillStyle = '#9bb7d4'
      ctx.fillText(subtext, 128, 72)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(1.4, 0.52, 1)
    return sprite
  }

  // Three.js Scene Setup & Lifecycle
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 900
    const height = container.clientHeight || 600

    // 1. Scene & Fog (Custom Palette #303841)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x303841)
    scene.fog = new THREE.FogExp2(0x303841, 0.012)
    sceneRef.current = scene

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000)
    camera.position.set(12, 14, 18)
    cameraRef.current = camera

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.innerHTML = ''
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxPolarAngle = Math.PI / 2 - 0.04 // Don't flip under the floor
    controls.minDistance = 4
    controls.maxDistance = 45
    controls.target.set(0, 1.2, 0)
    controlsRef.current = controls

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xdcf8f6, 0.8)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4)
    mainLight.position.set(10, 18, 12)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 1024
    mainLight.shadow.mapSize.height = 1024
    scene.add(mainLight)

    const cyanFill = new THREE.DirectionalLight(0x00bceb, 0.8)
    cyanFill.position.set(-14, 8, -10)
    scene.add(cyanFill)

    const magentaAccent = new THREE.PointLight(0x818cf8, 1.5, 30)
    magentaAccent.position.set(0, 8, 0)
    scene.add(magentaAccent)

    // 6. Raised Floor Construction
    const roomW = gridCols * 2.8 + 6
    const roomD = gridRows * 3.4 + 6

    // Floor Base Slab
    const floorGeo = new THREE.PlaneGeometry(roomW, roomD)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x242c33,
      roughness: 0.65,
      metalness: 0.25,
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0
    floor.receiveShadow = true
    scene.add(floor)

    // Grid Floor Overlay
    const gridHelper = new THREE.GridHelper(Math.max(roomW, roomD), Math.round(Math.max(roomW, roomD) * 1.5), 0x47555e, 0x364048)
    gridHelper.position.y = 0.01
    scene.add(gridHelper)

    // Cold Aisle Walkway Runners
    for (let r = 0; r < gridRows; r++) {
      const zPos = (r - (gridRows - 1) / 2) * 3.4
      const runnerGeo = new THREE.PlaneGeometry(gridCols * 2.6 + 1.2, 1.2)
      const runnerMat = new THREE.MeshBasicMaterial({
        color: 0x3a4b5c,
        transparent: true,
        opacity: 0.85,
      })
      const runner = new THREE.Mesh(runnerGeo, runnerMat)
      runner.rotation.x = -Math.PI / 2
      runner.position.set(0, 0.015, zPos + 1.2)
      scene.add(runner)
    }

    // 7. CRAC (Computer Room Air Conditioning) Units on Sides
    const cracMat = new THREE.MeshStandardMaterial({ color: 0x37414b, roughness: 0.4, metalness: 0.5 })
    const cracGrillMat = new THREE.MeshBasicMaterial({ color: 0x7aa5d2 })

    const addCracUnit = (x: number, z: number, rotationY: number, label: string) => {
      const cracGroup = new THREE.Group()
      cracGroup.position.set(x, 0, z)
      cracGroup.rotation.y = rotationY

      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 1.2), cracMat)
      body.position.y = 1.6
      body.castShadow = true
      body.receiveShadow = true
      cracGroup.add(body)

      // Air Intake Grill
      const grill = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.8), cracGrillMat)
      grill.position.set(0, 1.6, 0.61)
      cracGroup.add(grill)

      // Digital Temp readout
      const sprite = createTextSprite(label, '18.5°C')
      if (sprite) {
        sprite.position.set(0, 3.6, 0)
        cracGroup.add(sprite)
      }

      scene.add(cracGroup)
    }

    // Place CRAC units along the room flanks
    addCracUnit(-roomW / 2 + 1.4, -2, Math.PI / 2, 'CRAC-01')
    addCracUnit(-roomW / 2 + 1.4, 2, Math.PI / 2, 'CRAC-02')
    addCracUnit(roomW / 2 - 1.4, -2, -Math.PI / 2, 'CRAC-03')
    addCracUnit(roomW / 2 - 1.4, 2, -Math.PI / 2, 'CRAC-04')

    // 8. Server Racks Assembly
    rackMeshesMapRef.current.clear()
    beaconMeshesRef.current = []

    const rackBoxGeo = new THREE.BoxGeometry(1.2, 2.6, 1.4)
    const rackFrameMat = new THREE.MeshStandardMaterial({
      color: 0x242c33,
      roughness: 0.5,
      metalness: 0.6,
    })
    const frontVentsMat = new THREE.MeshStandardMaterial({
      color: 0x37414b,
      roughness: 0.8,
      metalness: 0.2,
    })

    racks.forEach((rack) => {
      const rIdx = getRowIndex(rack.row)
      const cIdx = (rack.col || 1) - 1

      // Coordinates in room
      const xPos = (cIdx - (gridCols - 1) / 2) * 2.4
      const zPos = (rIdx - (gridRows - 1) / 2) * 3.4

      const rackGroup = new THREE.Group()
      rackGroup.position.set(xPos, 0, zPos)

      // Main Cabinet Body
      const cabinet = new THREE.Mesh(rackBoxGeo, rackFrameMat.clone())
      cabinet.position.y = 1.3
      cabinet.castShadow = true
      cabinet.receiveShadow = true
      rackGroup.add(cabinet)

      // Link mesh to Rack object for raycasting
      rackMeshesMapRef.current.set(cabinet, rack)

      // Front Face (Server slots preview)
      const frontMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.4), frontVentsMat)
      frontMesh.position.set(0, 1.3, 0.705)
      rackGroup.add(frontMesh)

      // Selected Outline / Underglow
      if (rack.id === selectedRackId) {
        const selGeo = new THREE.BoxGeometry(1.3, 0.08, 1.5)
        const selMat = new THREE.MeshBasicMaterial({ color: 0x7aa5d2 })
        const selMesh = new THREE.Mesh(selGeo, selMat)
        selMesh.position.set(0, 0.04, 0)
        rackGroup.add(selMesh)
      }

      // Top Status Beacon (LED Alert Sphere)
      const { threeColor } = getRackColor(rack, colorMode)
      const beaconGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 16)
      const beaconMat = new THREE.MeshStandardMaterial({
        color: threeColor,
        emissive: threeColor,
        emissiveIntensity: 1.5,
        roughness: 0.1,
      })
      const beacon = new THREE.Mesh(beaconGeo, beaconMat)
      beacon.position.set(0, 2.68, 0)
      rackGroup.add(beacon)

      beaconMeshesRef.current.push({
        mesh: beacon,
        rack,
        baseColor: threeColor,
      })

      // If Critical, add a small local PointLight
      if (rack.status === 'critical') {
        const alertLight = new THREE.PointLight(0xef4444, 2.0, 4)
        alertLight.position.set(0, 2.8, 0)
        rackGroup.add(alertLight)
      }

      // Floating 3D Text Label
      const labelSprite = createTextSprite(rack.name, `${rack.used_u}/${rack.total_u}U`)
      if (labelSprite) {
        labelSprite.position.set(0, 3.2, 0)
        rackGroup.add(labelSprite)
      }

      scene.add(rackGroup)
    })

    // 9. Raycasting for Interaction
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(Array.from(rackMeshesMapRef.current.keys()))

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const rack = rackMeshesMapRef.current.get(hitMesh)
        if (rack) {
          setHoveredRack(rack)
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
      const intersects = raycaster.intersectObjects(Array.from(rackMeshesMapRef.current.keys()))

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh
        const rack = rackMeshesMapRef.current.get(hitMesh)
        if (rack) {
          onSelectRack(rack)
          if (onViewRackElevation) {
            onViewRackElevation(rack)
          }
        }
      }
    }

    renderer.domElement.addEventListener('mousemove', onPointerMove)
    renderer.domElement.addEventListener('click', onPointerClick)

    // 10. Animation Loop
    let clock = new THREE.Clock()
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      // Beacon LED pulse for warning/critical
      beaconMeshesRef.current.forEach(({ mesh, rack }) => {
        if (rack.status === 'critical') {
          const intensity = 1.0 + Math.sin(elapsed * 6) * 0.8
          ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.max(0.4, intensity)
        } else if (rack.status === 'warning') {
          const intensity = 0.8 + Math.sin(elapsed * 3) * 0.4
          ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity
        }
      })

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current)
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousemove', onPointerMove)
      renderer.domElement.removeEventListener('click', onPointerClick)
      renderer.dispose()
      container.innerHTML = ''
    }
  }, [racks, selectedRackId, gridRows, gridCols, colorMode, roomTempTarget])

  // Sync autoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
      controlsRef.current.autoRotateSpeed = 1.2
    }
  }, [autoRotate])

  // Controls Handlers
  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(12, 14, 18)
      controlsRef.current.target.set(0, 1.2, 0)
      controlsRef.current.update()
    }
  }

  const handleTopDownCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 24, 0.01)
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }

  const handleZoom = (delta: number) => {
    if (cameraRef.current) {
      cameraRef.current.position.multiplyScalar(delta)
    }
  }

  return (
    <div className="relative w-full h-[680px] bg-[#0c1116] rounded-[2px] border border-[#223240] overflow-hidden select-none">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top HUD Controls Ribbon */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        {/* Left: Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-[2px] bg-[#161f26]/90 border border-[#304250] shadow-xl pointer-events-auto backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setColorMode('status')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-[2px] transition-colors cursor-pointer ${
              colorMode === 'status'
                ? 'bg-[#34424b] text-[#8bd7d1] font-bold border border-[#50626f]'
                : 'text-[#85a6b1] hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Zabbix Alert Status</span>
          </button>
          <button
            type="button"
            onClick={() => setColorMode('temp')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-[2px] transition-colors cursor-pointer ${
              colorMode === 'temp'
                ? 'bg-[#34424b] text-[#8bd7d1] font-bold border border-[#50626f]'
                : 'text-[#85a6b1] hover:text-white'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>Inlet Heatmap</span>
          </button>
          <button
            type="button"
            onClick={() => setColorMode('power')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-[2px] transition-colors cursor-pointer ${
              colorMode === 'power'
                ? 'bg-[#34424b] text-[#8bd7d1] font-bold border border-[#50626f]'
                : 'text-[#85a6b1] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Power Load</span>
          </button>
        </div>

        {/* Right: Camera Action Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-[2px] bg-[#161f26]/90 border border-[#304250] shadow-xl pointer-events-auto backdrop-blur-sm">
          <button
            type="button"
            onClick={handleResetCamera}
            title="Reset Perspective"
            className="p-1.5 text-[#85a6b1] hover:text-white hover:bg-[#273139] rounded-[2px] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleTopDownCamera}
            title="Top-Down View"
            className="p-1.5 text-[#85a6b1] hover:text-white hover:bg-[#273139] rounded-[2px] transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(0.85)}
            title="Zoom In"
            className="p-1.5 text-[#85a6b1] hover:text-white hover:bg-[#273139] rounded-[2px] transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleZoom(1.15)}
            title="Zoom Out"
            className="p-1.5 text-[#85a6b1] hover:text-white hover:bg-[#273139] rounded-[2px] transition-colors cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? 'Pause Rotation' : 'Auto Rotate'}
            className={`p-1.5 rounded-[2px] transition-colors cursor-pointer ${
              autoRotate
                ? 'bg-[#47555e] text-[#7aa5d2] border border-[#7aa5d2]'
                : 'text-[#85a6b1] hover:text-white hover:bg-[#273139]'
            }`}
          >
            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bottom Status Legend & Hint */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono pointer-events-none">
        <div className="px-3 py-1.5 rounded-[2px] bg-[#161f26]/90 border border-[#304250] text-[#caedde] flex items-center gap-4 shadow-xl backdrop-blur-sm pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[11px]">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            <span className="text-[11px]">Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
            <span className="text-[11px] font-bold text-rose-300">Critical / Alarm</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-[#304250] pl-3 text-[#85a6b1] text-[10px]">
            <span>Drag mouse to Orbit • Scroll to Zoom • Click Rack to open 42U Elevation</span>
          </div>
        </div>

        <div className="px-2.5 py-1 rounded-[2px] bg-[#161f26]/90 border border-[#304250] text-[#7aa5d2] text-[11px] font-mono shadow-xl backdrop-blur-sm">
          {racks.length} RACKS • WEBGL 3D DIGITAL TWIN
        </div>
      </div>

      {/* Interactive Hover HUD Tooltip */}
      {hoveredRack && tooltipPos && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-[120%] p-3 rounded-[2px] bg-[#303841]/95 border border-[#7aa5d2]/70 shadow-[0_8px_25px_rgba(0,0,0,0.8)] text-xs font-mono backdrop-blur-md transition-opacity duration-150 min-w-[220px]"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#47555e] mb-2">
            <span className="font-bold text-[#eeeeee] text-sm">{hoveredRack.name}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                hoveredRack.status === 'critical'
                  ? 'bg-rose-950 text-rose-300 border border-rose-700'
                  : hoveredRack.status === 'warning'
                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
              }`}
            >
              {hoveredRack.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#caedde]">
            <div>
              <span className="text-[#85a6b1] block text-[9px]">Location</span>
              <span className="text-[#eeeeee]">
                {hoveredRack.row} / Col {hoveredRack.col}
              </span>
            </div>
            <div>
              <span className="text-[#85a6b1] block text-[9px]">Capacity</span>
              <span className="text-[#eeeeee]">
                {hoveredRack.used_u} / {hoveredRack.total_u} U ({hoveredRack.usage_percent}%)
              </span>
            </div>
            <div>
              <span className="text-[#85a6b1] block text-[9px]">Inlet Temp</span>
              <span className="text-[#7aa5d2] font-bold">{hoveredRack.inlet_temp_c} °C</span>
            </div>
            <div>
              <span className="text-[#85a6b1] block text-[9px]">Power Load</span>
              <span className="text-amber-400 font-bold">{hoveredRack.power_kw} kW</span>
            </div>
          </div>

          <div className="mt-2 pt-1.5 border-t border-[#47555e] text-[10px] text-[#7aa5d2] flex items-center justify-between">
            <span>Click rack to inspect</span>
            <ChevronRight className="w-3 h-3 text-[#7aa5d2]" />
          </div>
        </div>
      )}
    </div>
  )
}
