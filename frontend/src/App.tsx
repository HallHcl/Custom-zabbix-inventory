import { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { RoomOverview, RackSummary, RackElevation as RackElevationType, Device } from './types'
import { fetchRoomOverview, fetchRackElevation, unmountDevice } from './api/client'
import { Sidebar, type NavTab } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { RoomStatsCards } from './components/floorplan/RoomStatsCards'
import { IsometricRoom } from './components/floorplan/IsometricRoom'
import { RackDetailCard } from './components/floorplan/RackDetailCard'
import { RecentAlerts } from './components/floorplan/RecentAlerts'
import { RackInventoryNav } from './components/rack/RackInventoryNav'
import { RackElevation } from './components/rack/RackElevation'
import { DeviceDetailPanel } from './components/rack/DeviceDetailPanel'
import { MountDeviceModal } from './components/rack/MountDeviceModal'

// Dedicated Tab Views
import { RacksView } from './components/views/RacksView'
import { DevicesView } from './components/views/DevicesView'
import { AlertsView } from './components/views/AlertsView'
import { ReportsView } from './components/views/ReportsView'

export function App() {
  const [activeNav, setActiveNav] = useState<NavTab>('overview')
  const [currentView, setCurrentView] = useState<'floor_plan' | 'rack_elevation'>('floor_plan')
  const [searchQuery, setSearchQuery] = useState('')

  // Floor plan data
  const [overview, setOverview] = useState<RoomOverview | null>(null)
  const [selectedRackSummary, setSelectedRackSummary] = useState<RackSummary | null>(null)

  // Rack elevation data
  const [activeRackId, setActiveRackId] = useState<number | null>(null)
  const [rackElevation, setRackElevation] = useState<RackElevationType | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [rackTypeFilter, setRackTypeFilter] = useState<string | null>(null)
  const [rackSearchFilter, setRackSearchFilter] = useState('')

  // Mount modal state
  const [isMountModalOpen, setIsMountModalOpen] = useState(false)
  const [mountTargetU, setMountTargetU] = useState(1)

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

  // Initial load & Polling interval
  useEffect(() => {
    loadOverview()
    const timer = setInterval(() => {
      loadOverview()
      if (currentView === 'rack_elevation' && activeRackId) {
        loadRackElevation(activeRackId)
      }
    }, 20000)
    return () => clearInterval(timer)
  }, [loadOverview, loadRackElevation, currentView, activeRackId])

  // Top-level Navigation Switcher
  const handleSelectTab = (tab: NavTab) => {
    setActiveNav(tab)
    // Reset to base view so no previous rack elevation locks the UI
    setCurrentView('floor_plan')
  }

  // Navigate to Rack Elevation View
  const handleViewRackElevation = (rack: RackSummary) => {
    setActiveRackId(rack.id)
    loadRackElevation(rack.id)
    setCurrentView('rack_elevation')
  }

  // Navigate back to floor plan / racks
  const handleBack = () => {
    setCurrentView('floor_plan')
    loadOverview()
  }

  // Handle open device in rack from Devices inventory view
  const handleOpenDeviceInRack = (rackId: number, deviceId: number) => {
    setActiveRackId(rackId)
    loadRackElevation(rackId, deviceId)
    setActiveNav('racks')
    setCurrentView('rack_elevation')
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
    } else {
      list.push({
        label: overview?.room_name || 'Room A',
        onClick: activeNav !== 'overview' && activeNav !== 'floor_plan' ? () => handleSelectTab('overview') : undefined,
      })
      if (activeNav === 'racks') {
        list.push({ label: 'Racks (12)' })
      } else if (activeNav === 'devices') {
        list.push({ label: 'Devices' })
      } else if (activeNav === 'alerts') {
        list.push({ label: 'Alerts' })
      } else if (activeNav === 'reports') {
        list.push({ label: 'Reports' })
      }
    }
    return list
  }, [overview, currentView, rackElevation, activeNav])

  return (
    <div className="flex h-screen w-screen bg-[#050505] text-zinc-100 font-sans overflow-hidden">
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
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Devices Inventory View */}
          {activeNav === 'devices' ? (
            <DevicesView
              racks={overview?.racks || []}
              onOpenDeviceInRack={handleOpenDeviceInRack}
            />
          ) : activeNav === 'alerts' ? (
            /* TAB 2: Live Zabbix Alerts View */
            <AlertsView alerts={overview?.recent_alerts || []} />
          ) : activeNav === 'reports' ? (
            /* TAB 3: Reports & Datacenter Analytics */
            <ReportsView overview={overview} />
          ) : currentView === 'rack_elevation' && rackElevation ? (
            /* 42U Rack Elevation View (when inspecting a rack) */
            <div className="max-w-[1600px] mx-auto space-y-5">
              {/* Rack Header Sub-bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[#222222]">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-[#141414] border border-[#262626] hover:border-zinc-500 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {rackElevation.name}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Row {rackElevation.row} • Col {rackElevation.col}
                    </span>
                  </div>
                </div>

                {/* Top Rack Quick Stats */}
                <div className="flex items-center gap-6 text-xs text-zinc-400">
                  <div>
                    <span className="text-zinc-500 block">Space</span>
                    <span className="font-semibold text-white">
                      {rackElevation.used_u} / {rackElevation.total_u} U Used
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Devices</span>
                    <span className="font-semibold text-white">
                      {rackElevation.devices.length} Mounted
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Total Power</span>
                    <span className="font-semibold text-white">{rackElevation.power_kw} kW</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Inlet Temp</span>
                    <span className="font-semibold text-white">
                      {rackElevation.inlet_temp_c} °C
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Column Rack Layout: Inventory Nav (Left), 42U Cabinet (Center), Details (Right) */}
              <div className="flex items-start justify-between gap-6">
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
                />
              </div>
            </div>
          ) : activeNav === 'racks' ? (
            /* TAB 4: All Racks 12-Grid View */
            <RacksView
              racks={filteredRacks}
              onSelectRack={handleViewRackElevation}
            />
          ) : (
            /* TAB 5: Default 2.5D Isometric Floor Plan Overview */
            <div className="max-w-[1600px] mx-auto space-y-6">
              {/* Top Stats 4 Cards */}
              <RoomStatsCards
                totalRacks={overview?.total_racks || 12}
                totalDevices={overview?.total_devices || 186}
                totalAlerts={overview?.total_alerts || 2}
                roomTemp={overview?.room_temp_c || 24.5}
              />

              {/* Main Grid: 2.5D Isometric Room (Left) + Detail Card & Alerts (Right) */}
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
            </div>
          )}
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
    </div>
  )
}

export default App
