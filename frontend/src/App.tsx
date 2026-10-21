import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft, Pencil, Box, LayoutGrid } from 'lucide-react'
import type { RoomOverview, RackSummary, RackElevation as RackElevationType, Device } from './types'
import { fetchRoomOverview, fetchRackElevation, unmountDevice, fetchUnassignedHosts } from './api/client'
import { Sidebar, type NavTab } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { IsometricRoom } from './components/floorplan/IsometricRoom'
import { DataCenter3DView } from './components/floorplan/DataCenter3DView'
import { RackDetailCard } from './components/floorplan/RackDetailCard'
import { RecentAlerts } from './components/floorplan/RecentAlerts'
import { RackInventoryNav } from './components/rack/RackInventoryNav'
import { RackElevation } from './components/rack/RackElevation'
import { DeviceDetailPanel } from './components/rack/DeviceDetailPanel'
import { MountDeviceModal } from './components/rack/MountDeviceModal'
import { UnassignedHostsDrawer } from './components/rack/UnassignedHostsDrawer'

// Dedicated Tab Views
import { OverviewView } from './components/views/OverviewView'
import { RacksView } from './components/views/RacksView'
import { DevicesView } from './components/views/DevicesView'
import { AlertsView } from './components/views/AlertsView'
import { ReportsView } from './components/views/ReportsView'
import { DevicePageView } from './components/views/DevicePageView'
import { IPAMView } from './components/views/IPAMView'

const VALID_TABS: NavTab[] = ['overview', 'floor_plan', 'racks', 'devices', 'ipam', 'alerts', 'reports']

export function App() {
  const [activeNav, setActiveNav] = useState<NavTab>(() => {
    const saved = localStorage.getItem('dc_vision_active_tab') as NavTab | null
    return saved && VALID_TABS.includes(saved) ? saved : 'overview'
  })
  const [returnNav, setReturnNav] = useState<NavTab>(() => {
    const saved = localStorage.getItem('dc_vision_active_tab') as NavTab | null
    return saved && VALID_TABS.includes(saved) ? saved : 'overview'
  })
  const [currentView, setCurrentView] = useState<'floor_plan' | 'rack_elevation' | 'floor_plan_editor' | 'device_page'>('floor_plan')
  const [searchQuery, setSearchQuery] = useState('')

  // Persist active navigation tab to localStorage on change
  useEffect(() => {
    localStorage.setItem('dc_vision_active_tab', activeNav)
  }, [activeNav])

  // Floor plan data
  const [overview, setOverview] = useState<RoomOverview | null>(null)
  const [selectedRackSummary, setSelectedRackSummary] = useState<RackSummary | null>(null)

  // Rack elevation data
  const [activeRackId, setActiveRackId] = useState<number | null>(null)
  const [rackElevation, setRackElevation] = useState<RackElevationType | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [rackTypeFilter, setRackTypeFilter] = useState<string | null>(null)
  const [rackSearchFilter, setRackSearchFilter] = useState('')
  const [floorPlanMode, setFloorPlanMode] = useState<'3d_twin' | 'isometric'>('3d_twin')

  // Mount modal state
  const [isMountModalOpen, setIsMountModalOpen] = useState(false)
  const [mountTargetU, setMountTargetU] = useState(1)

  // Full Device Page Modal State (Latest Data + Custom Inventory)
  const [devicePageId, setDevicePageId] = useState<number | null>(null)

  // Theme State (High-Contrast Dark vs Clean Light Theme)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('dc_vision_theme') as 'dark' | 'light') || 'dark'
  })
  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('dc_vision_theme', next)
  }

  // Load Room Overview
  const loadOverview = useCallback(() => {
    fetchRoomOverview()
      .then((data) => {
        setOverview(data)
        // Select Rack B03 by default if none selected
        if (!selectedRackSummary && data.racks.length > 0) {
          const b03 = data.racks.find((r) => r.name.includes('B03')) || data.racks[0]
          setSelectedRackSummary(b03)
        }
      })
      .catch((err) => console.error('Failed to load overview:', err))
  }, [selectedRackSummary])

  // Load Rack Elevation
  const loadRackElevation = useCallback((rackId: number, targetDeviceId?: number) => {
    fetchRackElevation(rackId)
      .then((data) => {
        setRackElevation(data)
        if (targetDeviceId) {
          const match = data.devices.find((d) => d.id === targetDeviceId)
          if (match) {
            setSelectedDevice(match)
            return
          }
        }
        if (data.devices.length > 0) {
          const warningDevice = data.devices.find((d) => d.zabbix_status?.status === 'warning')
          setSelectedDevice(warningDevice || data.devices[0])
        } else {
          setSelectedDevice(null)
        }
      })
      .catch((err) => console.error('Failed to load rack elevation:', err))
  }, [])

  // Unassigned Hosts Drawer State & Count
  const [isUnassignedDrawerOpen, setIsUnassignedDrawerOpen] = useState(false)
  const [unassignedCount, setUnassignedCount] = useState<number>(0)

  const loadUnassignedCount = useCallback(() => {
    fetchUnassignedHosts()
      .then((data) => setUnassignedCount(data.total_unassigned))
      .catch(() => {})
  }, [])

  // Initial load & Polling interval
  useEffect(() => {
    loadOverview()
    loadUnassignedCount()
    const timer = setInterval(() => {
      loadOverview()
      loadUnassignedCount()
      if (currentView === 'rack_elevation' && activeRackId) {
        loadRackElevation(activeRackId)
      }
    }, 20000)
    return () => clearInterval(timer)
  }, [loadOverview, loadRackElevation, loadUnassignedCount, currentView, activeRackId])

  // Top-level Navigation Switcher
  const handleSelectTab = (tab: NavTab) => {
    setActiveNav(tab)
    // Clear rack elevation so views are never blocked
    setCurrentView('floor_plan')
  }

  // Navigate to Rack Elevation View
  const handleViewRackElevation = (rack: RackSummary) => {
    setReturnNav(activeNav)
    setActiveRackId(rack.id)
    loadRackElevation(rack.id)
    setCurrentView('rack_elevation')
  }

  // Navigate back to floor plan / racks / overview
  const handleBack = useCallback(() => {
    setCurrentView('floor_plan')
    setActiveNav(returnNav)
    loadOverview()
  }, [returnNav, loadOverview])

  // Handle open device in rack from Devices inventory view
  const handleOpenDeviceInRack = (rackId: number, deviceId: number) => {
    setReturnNav('devices')
    setActiveRackId(rackId)
    loadRackElevation(rackId, deviceId)
    setCurrentView('rack_elevation')
  }

  // Navigate to full-fledged Device Page
  const handleOpenDevicePage = (deviceId: number) => {
    setDevicePageId(deviceId)
    setCurrentView('device_page')
  }

  // Unmount device
  const handleUnmountDevice = async (deviceId: number) => {
    if (!confirm('Are you sure you want to unmount this device from the rack?')) return
    try {
      await unmountDevice(deviceId)
      if (activeRackId) loadRackElevation(activeRackId)
      setSelectedDevice(null)
    } catch (err: any) {
      alert(err.message || 'Failed to unmount device')
    }
  }

  // Open Mount Modal on empty slot click
  const handleEmptySlotClick = (u: number) => {
    setMountTargetU(u)
    setIsMountModalOpen(true)
  }

  // Filtered racks based on global search query
  const filteredRacks = useMemo(() => {
    if (!overview?.racks) return []
    if (!searchQuery.trim()) return overview.racks
    const q = searchQuery.toLowerCase()
    return overview.racks.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.row.toLowerCase().includes(q)
    )
  }, [overview?.racks, searchQuery])

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const list: { label: string; onClick?: () => void }[] = [
      { label: overview?.site_name || 'Bangkok DC' },
    ]

    if (currentView === 'rack_elevation' && rackElevation) {
      list.push({
        label: overview?.room_name || 'Room A',
        onClick: handleBack,
      })
      list.push({ label: rackElevation.name })
    } else if (currentView === 'floor_plan_editor') {
      list.push({
        label: overview?.room_name || 'Room A',
        onClick: () => {
          setCurrentView('floor_plan')
          setActiveNav('floor_plan')
        },
      })
      list.push({
        label: 'Floor Plan',
        onClick: () => {
          setCurrentView('floor_plan')
          setActiveNav('floor_plan')
        },
      })
      list.push({ label: 'Editor' })
    } else {
      list.push({
        label: overview?.room_name || 'Room A',
        onClick: activeNav !== 'overview' && activeNav !== 'floor_plan' ? () => handleSelectTab('overview') : undefined,
      })
      if (activeNav === 'overview') {
        list.push({ label: 'Overview' })
      } else if (activeNav === 'floor_plan') {
        list.push({ label: 'Floor Plan' })
      } else if (activeNav === 'racks') {
        list.push({ label: 'Racks (12)' })
      } else if (activeNav === 'devices') {
        list.push({ label: 'Devices' })
      } else if (activeNav === 'ipam') {
        list.push({ label: 'IPAM Subnets' })
      } else if (activeNav === 'alerts') {
        list.push({ label: 'Alerts' })
      } else if (activeNav === 'reports') {
        list.push({ label: 'Reports' })
      }
    }
    return list
  }, [overview, currentView, rackElevation, activeNav, handleBack])

  return (
    <div className={`flex h-screen w-screen bg-[#161c20] text-[#caedde] font-sans overflow-hidden ${theme === 'light' ? 'light-theme' : ''}`}>
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeNav}
        onSelectTab={handleSelectTab}
        alertCount={overview?.total_alerts || 0}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          breadcrumbs={breadcrumbs}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isLive={true}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenUnassigned={() => setIsUnassignedDrawerOpen(true)}
          unassignedCount={unassignedCount}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Full-Fledged Dedicated Device Page (Latest Data + Hardware Model + PostgreSQL CMDB) */}
          {currentView === 'device_page' && devicePageId ? (
            <DevicePageView
              deviceId={devicePageId}
              onBack={() => {
                if (activeRackId) {
                  setCurrentView('rack_elevation')
                } else {
                  setCurrentView('floor_plan')
                  setActiveNav(returnNav)
                }
              }}
              onDeviceUpdated={() => {
                loadOverview()
                if (activeRackId) loadRackElevation(activeRackId)
              }}
            />
          ) : currentView === 'rack_elevation' && rackElevation ? (
            <div className="max-w-[1600px] mx-auto space-y-4 select-none">
              {/* Rack Header Sub-bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[#394650]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#caedde] hover:text-white px-2.5 py-1 rounded-[2px] bg-[#34424b] border border-[#50626f] transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-[#8bd7d1]" />
                    <span>RETURN</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white font-mono tracking-tight">
                      {rackElevation.name}
                    </h2>
                    <span className="px-2 py-0.2 rounded-[2px] text-[10px] font-mono bg-[#34424b] text-[#8bd7d1] border border-[#50626f]">
                      ROW {rackElevation.row} / COL {rackElevation.col}
                    </span>
                  </div>
                </div>

                {/* Top Rack Quick Stats */}
                <div className="flex items-center gap-5 text-xs font-mono text-[#85a6b1]">
                  <div className="text-right">
                    <span className="text-[#85a6b1] block text-[9px] uppercase">Slot Capacity</span>
                    <span className="font-bold text-[#caedde]">
                      {rackElevation.used_u} / {rackElevation.total_u} U
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#85a6b1] block text-[9px] uppercase">Equipment</span>
                    <span className="font-bold text-[#caedde]">
                      {rackElevation.devices.length} Units
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#85a6b1] block text-[9px] uppercase">Power Load</span>
                    <span className="font-bold text-amber-400">{rackElevation.power_kw} kW</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#85a6b1] block text-[9px] uppercase">Inlet Temp</span>
                    <span className="font-bold text-[#8bd7d1]">
                      {rackElevation.inlet_temp_c} °C
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Column Rack Layout: Inventory Nav (Left), 42U Cabinet (Center), Details (Right) */}
              <div className="flex items-start justify-between gap-4">
                {/* Left: Inventory Nav Filter */}
                <RackInventoryNav
                  devices={rackElevation.devices}
                  selectedType={rackTypeFilter}
                  onSelectType={setRackTypeFilter}
                  searchFilter={rackSearchFilter}
                  onSearchChange={setRackSearchFilter}
                />

                {/* Center: 42U Rack Elevation Cabinet */}
                <div className="flex-1 flex justify-center">
                  <RackElevation
                    rack={rackElevation}
                    selectedDeviceId={selectedDevice?.id || null}
                    onSelectDevice={(dev) => setSelectedDevice(dev)}
                    onEmptySlotClick={handleEmptySlotClick}
                    typeFilter={rackTypeFilter}
                    searchFilter={rackSearchFilter}
                  />
                </div>

                {/* Right: Device Telemetry & Detail Panel */}
                <DeviceDetailPanel
                  device={selectedDevice}
                  rackDevices={rackElevation.devices}
                  onSelectDevice={(dev) => setSelectedDevice(dev)}
                  onUnmountDevice={handleUnmountDevice}
                  onOpenDevicePage={handleOpenDevicePage}
                />
              </div>
            </div>
          ) : activeNav === 'overview' ? (
            /* TAB 1: Executive Overview Dashboard */
            <OverviewView
              overview={overview}
              onNavigateToFloorPlan={(rackId) => {
                if (rackId && overview?.racks) {
                  const match = overview.racks.find((r) => r.id === rackId)
                  if (match) setSelectedRackSummary(match)
                }
                setActiveNav('floor_plan')
                setCurrentView('floor_plan')
              }}
              onNavigateToRackElevation={handleViewRackElevation}
              onNavigateToAlerts={() => handleSelectTab('alerts')}
              onNavigateToDevices={() => handleSelectTab('devices')}
            />
          ) : currentView === 'floor_plan_editor' ? (
            /* 3D Floor Plan Editor View */
            <div className="max-w-[1600px] mx-auto space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('floor_plan')
                      setActiveNav('floor_plan')
                      loadOverview()
                    }}
                    className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-[#141414] border border-[#262626] hover:border-zinc-500 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Floor Plan</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      3D Floor Plan Editor
                    </h2>
                    <span className="text-xs font-mono font-semibold text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                      ROOM A • ISOMETRIC 3D
                    </span>
                  </div>
                </div>
              </div>

              <IsometricRoom
                racks={filteredRacks}
                selectedRackId={selectedRackSummary?.id || null}
                onSelectRack={(rack) => setSelectedRackSummary(rack)}
                statusCounts={
                  overview?.status_counts || {
                    healthy: 10,
                    warning: 1,
                    critical: 1,
                    offline: 0,
                  }
                }
                roomId={1}
                initialEditMode={true}
                fullPage={true}
                onLayoutSaved={() => loadOverview()}
                onViewRackElevation={handleViewRackElevation}
              />
            </div>
          ) : activeNav === 'floor_plan' ? (
            /* TAB 2: Dedicated 2.5D Isometric Floor Plan View */
            <div className="max-w-[1600px] mx-auto space-y-5">
              {/* Floor Plan Sub-header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#394650]">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-mono">
                    <span>Data Center Floor Plan</span>
                    <span className="text-xs font-mono font-semibold text-[#8bd7d1] bg-[#1a2329] px-2.5 py-0.5 rounded-[2px] border border-[#394650]">
                      ROOM A • {overview?.total_racks || 12} RACKS
                    </span>
                  </h2>
                  <p className="text-xs text-[#85a6b1] mt-0.5 font-mono">
                    {floorPlanMode === '3d_twin'
                      ? 'WebGL 3D Digital Twin • Drag to orbit 360° • Click rack to open 42U Elevation'
                      : '2.5D spatial layout • Click any rack box to inspect telemetry and slot capacity'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Mode Toggle: 3D Digital Twin vs 2D Isometric */}
                  <div className="flex items-center p-0.5 rounded-[2px] bg-[#1a2329] border border-[#394650]">
                    <button
                      type="button"
                      onClick={() => setFloorPlanMode('3d_twin')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-mono transition-all cursor-pointer ${
                        floorPlanMode === '3d_twin'
                          ? 'bg-[#34424b] text-[#8bd7d1] font-bold border border-[#50626f] shadow-md'
                          : 'text-[#85a6b1] hover:text-white'
                      }`}
                    >
                      <Box className="w-3.5 h-3.5 text-cyan-400" />
                      <span>3D Digital Twin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFloorPlanMode('isometric')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-mono transition-all cursor-pointer ${
                        floorPlanMode === 'isometric'
                          ? 'bg-[#34424b] text-[#8bd7d1] font-bold border border-[#50626f] shadow-md'
                          : 'text-[#85a6b1] hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-[#8bd7d1]" />
                      <span>Isometric 2D</span>
                    </button>
                  </div>

                  {/* Edit Floor Plan Button */}
                  <button
                    type="button"
                    onClick={() => setCurrentView('floor_plan_editor')}
                    className="flex items-center gap-2 text-xs font-mono font-semibold text-[#caedde] hover:text-white px-3 py-1.5 rounded-[2px] bg-[#273139] border border-[#394650] hover:border-[#8bd7d1] transition-all cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#8bd7d1]" />
                    <span>Edit 2D Layout</span>
                  </button>
                </div>
              </div>

              {/* Main Content Area: 3D WebGL Digital Twin vs 2D Isometric Plan */}
              {floorPlanMode === '3d_twin' ? (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-start">
                  {/* Three.js 3D WebGL Digital Twin (3 cols) */}
                  <div className="xl:col-span-3">
                    <DataCenter3DView
                      racks={filteredRacks}
                      selectedRackId={selectedRackSummary?.id || null}
                      onSelectRack={(rack) => setSelectedRackSummary(rack)}
                      onViewRackElevation={handleViewRackElevation}
                      gridRows={3}
                      gridCols={4}
                      roomTempTarget={overview?.room_temp_c || 24.5}
                    />
                  </div>

                  {/* Right Column: Selected Rack Card + Recent Alerts */}
                  <div className="space-y-4">
                    <RackDetailCard
                      rack={selectedRackSummary}
                      onViewRackElevation={handleViewRackElevation}
                    />
                    <RecentAlerts
                      alerts={overview?.recent_alerts || []}
                      onViewAll={() => handleSelectTab('alerts')}
                      onSelectAlert={() => handleSelectTab('alerts')}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                  {/* 2.5D Isometric Room Canvas (2 cols) */}
                  <div className="xl:col-span-2">
                    <IsometricRoom
                      racks={filteredRacks}
                      selectedRackId={selectedRackSummary?.id || null}
                      onSelectRack={(rack) => setSelectedRackSummary(rack)}
                      statusCounts={
                        overview?.status_counts || {
                          healthy: 10,
                          warning: 1,
                          critical: 1,
                          offline: 0,
                        }
                      }
                      roomId={1}
                      onLayoutSaved={() => loadOverview()}
                      onViewRackElevation={handleViewRackElevation}
                    />
                  </div>

                  {/* Right Column: Selected Rack Card + Recent Alerts */}
                  <div className="space-y-6">
                    <RackDetailCard
                      rack={selectedRackSummary}
                      onViewRackElevation={handleViewRackElevation}
                    />
                    <RecentAlerts
                      alerts={overview?.recent_alerts || []}
                      onViewAll={() => handleSelectTab('alerts')}
                      onSelectAlert={() => handleSelectTab('alerts')}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : activeNav === 'racks' ? (
            /* TAB 3: All Racks 12-Grid View */
            <RacksView
              racks={filteredRacks}
              onSelectRack={handleViewRackElevation}
            />
          ) : activeNav === 'devices' ? (
            /* TAB 4: Devices Inventory View */
            <DevicesView
              racks={overview?.racks || []}
              onOpenDeviceInRack={handleOpenDeviceInRack}
              onOpenDevicePage={handleOpenDevicePage}
              onOpenUnassigned={() => setIsUnassignedDrawerOpen(true)}
              unassignedCount={unassignedCount}
            />
          ) : activeNav === 'ipam' ? (
            /* TAB 5: IPAM Lite Subnets & IP Grid View */
            <IPAMView />
          ) : activeNav === 'alerts' ? (
            /* TAB 6: Live Zabbix Alerts View */
            <AlertsView alerts={overview?.recent_alerts || []} />
          ) : activeNav === 'reports' ? (
            /* TAB 7: Reports & Datacenter Analytics */
            <ReportsView overview={overview} />
          ) : null}
        </main>
      </div>

      {/* Mount Device Modal */}
      {activeRackId && (
        <MountDeviceModal
          rackId={activeRackId}
          initialStartU={mountTargetU}
          isOpen={isMountModalOpen}
          onClose={() => setIsMountModalOpen(false)}
          onSuccess={() => {
            if (activeRackId) loadRackElevation(activeRackId)
          }}
        />
      )}

      {/* Zabbix Unassigned Hosts Ingestion Drawer */}
      <UnassignedHostsDrawer
        isOpen={isUnassignedDrawerOpen}
        onClose={() => setIsUnassignedDrawerOpen(false)}
        racks={overview?.racks || []}
        onDeviceAssigned={() => {
          loadOverview()
          loadUnassignedCount()
          if (activeRackId) loadRackElevation(activeRackId)
        }}
      />
    </div>
  )
}

export default App
