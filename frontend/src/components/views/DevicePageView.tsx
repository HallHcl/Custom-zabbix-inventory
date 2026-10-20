import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Server,
  Activity,
  Layers,
  Thermometer,
  Shield,
  RefreshCw,
  Search,
  Save,
  Wifi,
  Cpu,
  CheckCircle2,
  AlertOctagon,
  Trash2,
  Box,
} from 'lucide-react'
import type { DeviceOverview, ZabbixLatestItem } from '../../types'
import { fetchDeviceOverview, updateDeviceInventory } from '../../api/client'
import { ChassisVisualCard } from '../rack/ChassisVisualCard'

interface DevicePageViewProps {
  deviceId: number
  onBack: () => void
  onDeviceUpdated?: () => void
}

type TabKey = 'latest_data' | 'chassis_visual' | 'inventory' | 'network' | 'alerts'

export function DevicePageView({ deviceId, onBack, onDeviceUpdated }: DevicePageViewProps) {
  const [data, setData] = useState<DeviceOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('latest_data')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Zabbix Latest Data Filter State (Task 4)
  const [metricSearch, setMetricSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Dynamic Custom Inventory Edit State (Task 5)
  const [isEditingInventory, setIsEditingInventory] = useState(false)
  const [customFields, setCustomFields] = useState<Record<string, any>>({})
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [savingInventory, setSavingInventory] = useState(false)

  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true)
    setError(null)
    try {
      const res = await fetchDeviceOverview(deviceId)
      setData(res)
      setCustomFields(res.custom_fields || {})
    } catch (err: any) {
      setError(err.message || 'Failed to query telemetry & equipment details')
    } finally {
      if (showLoadingState) setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(true)
  }, [deviceId])

  const handleManualRefresh = () => {
    setIsRefreshing(true)
    loadData(false)
  }

  const handleSaveInventory = async () => {
    if (!data) return
    setSavingInventory(true)
    try {
      await updateDeviceInventory(data.device_id, {
        custom_fields: customFields,
        brand: customFields['brand'],
        vendor: customFields['vendor'],
        version: customFields['version'],
        user: customFields['user'],
        role: customFields['role'],
      })
      setIsEditingInventory(false)
      await loadData(false)
      if (onDeviceUpdated) onDeviceUpdated()
    } catch (err: any) {
      alert('Failed to save dynamic inventory: ' + err.message)
    } finally {
      setSavingInventory(false)
    }
  }

  const handleAddField = () => {
    if (!newKey.trim()) return
    setCustomFields((prev) => ({ ...prev, [newKey.trim()]: newValue.trim() }))
    setNewKey('')
    setNewValue('')
  }

  const handleRemoveField = (k: string) => {
    setCustomFields((prev) => {
      const copy = { ...prev }
      delete copy[k]
      return copy
    })
  }

  // Categories list
  const categories = [
    'All',
    'Processor & CPU',
    'Memory & Cache',
    'Network & Interfaces',
    'Storage & Filesystems',
    'Power & Sensors',
    'System & OS',
  ]

  // Filtered Zabbix Items
  const filteredItems = (data?.latest_data_items || []).filter((item: ZabbixLatestItem) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false
    if (!metricSearch.trim()) return true
    const q = metricSearch.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      item.key_.toLowerCase().includes(q) ||
      (item.lastvalue && item.lastvalue.toLowerCase().includes(q))
    )
  })

  if (loading && !data) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 select-none text-[#85a6b1] font-mono">
        <Activity className="w-8 h-8 animate-pulse text-[#8bd7d1] mb-3" />
        <h3 className="text-sm font-bold text-white tracking-wide">CONNECTING TO ZABBIX 7.0 (192.168.1.85)</h3>
        <p className="text-xs text-[#85a6b1] mt-1">Aggregating live telemetry and PostgreSQL CMDB inventory...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4 font-mono select-none">
        <button
          onClick={onBack}
          className="px-3 py-1.5 rounded-xs bg-[#20282f] border border-[#394650] text-[#8bd7d1] text-xs flex items-center gap-1.5 hover:bg-[#34424b] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Previous View
        </button>
        <div className="p-4 rounded-xs bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          <p className="font-bold">Error loading device:</p>
          <p>{error || 'Device not found'}</p>
        </div>
      </div>
    )
  }

  const endU = data.start_u + data.height_u - 1

  return (
    <div className="max-w-[1700px] mx-auto space-y-4 select-none font-mono">
      {/* ─── BREADCRUMBS & TOP BAR ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#394650]">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={onBack}
            className="px-2.5 py-1 rounded-xs bg-[#20282f] border border-[#394650] text-[#8bd7d1] hover:bg-[#34424b] transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Rack
          </button>
          <span className="text-[#50626f]">/</span>
          <span className="text-[#85a6b1]">BKK-DC1</span>
          <span className="text-[#50626f]">/</span>
          <span className="text-[#85a6b1]">{data.room_name}</span>
          <span className="text-[#50626f]">/</span>
          <span className="text-[#caedde] font-bold">{data.rack_name}</span>
          <span className="text-[#50626f]">/</span>
          <span className="text-white font-bold px-1.5 py-0.5 rounded-xs bg-[#273139] border border-[#50626f]">
            Slot U{data.start_u}-U{endU} ({data.height_u}U, {data.position_face})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {data.zabbix_host_id ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-[#162a22] border border-emerald-800 text-emerald-300 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zabbix Host ID: #{data.zabbix_host_id} (192.168.1.85)</span>
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-xs bg-[#2b251b] border border-amber-800 text-amber-300 text-xs">
              Standalone DCIM Inventory (Simulated Metrics)
            </div>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-1 rounded-xs bg-[#20282f] border border-[#394650] text-[#8bd7d1] hover:bg-[#34424b] transition-colors cursor-pointer text-xs flex items-center gap-1.5 font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Metrics
          </button>
        </div>
      </div>

      {/* ─── QUICK KPI STATUS BANNER ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xs bg-[#20282f] border border-[#394650] flex items-center gap-3">
          <div className="p-2 rounded-xs bg-[#161c20] text-[#8bd7d1] border border-[#394650]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-[#85a6b1] block uppercase tracking-wider">CPU UTILIZATION</span>
            <span className="text-sm font-bold text-white">
              {data.cpu_utilization !== undefined ? `${data.cpu_utilization}%` : '--'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xs bg-[#20282f] border border-[#394650] flex items-center gap-3">
          <div className="p-2 rounded-xs bg-[#161c20] text-[#85a6b1] border border-[#394650]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-[#85a6b1] block uppercase tracking-wider">MEMORY USAGE</span>
            <span className="text-sm font-bold text-white">
              {data.memory_utilization !== undefined ? `${data.memory_utilization}%` : '--'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xs bg-[#20282f] border border-[#394650] flex items-center gap-3">
          <div className="p-2 rounded-xs bg-[#161c20] text-amber-400 border border-[#394650]">
            <Thermometer className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-[#85a6b1] block uppercase tracking-wider">TEMPERATURE</span>
            <span className="text-sm font-bold text-amber-400">
              {data.temperature_c !== undefined ? `${data.temperature_c}°C` : '--'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xs bg-[#20282f] border border-[#394650] flex items-center gap-3">
          <div className="p-2 rounded-xs bg-[#161c20] text-[#8bd7d1] border border-[#394650]">
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-[#85a6b1] block uppercase tracking-wider">MANAGEMENT IP</span>
            <span className="text-sm font-bold text-[#caedde] truncate block max-w-[130px]">
              {data.ip_address || 'Unassigned'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xs bg-[#20282f] border border-[#394650] flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="p-2 rounded-xs bg-[#161c20] text-rose-400 border border-[#394650]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-[#85a6b1] block uppercase tracking-wider">ACTIVE ALERTS</span>
            <span className={`text-sm font-bold ${data.active_alerts?.length ? 'text-amber-400' : 'text-emerald-400'}`}>
              {data.active_alerts?.length ? `${data.active_alerts.length} Issues` : 'Nominal (0)'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── TAB NAVIGATION ─── */}
      <div className="flex items-center gap-1 border-b border-[#394650] bg-[#20282f] px-3 pt-2">
        <button
          onClick={() => setActiveTab('latest_data')}
          className={`px-3 py-2 text-xs font-medium rounded-t-xs transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeTab === 'latest_data'
              ? 'border-[#8bd7d1] text-[#8bd7d1] bg-[#182026]'
              : 'border-transparent text-[#85a6b1] hover:text-[#caedde]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Zabbix Latest Data
          <span className="px-1.5 py-0.2 rounded-xs bg-[#161c20] text-[10px] text-[#85a6b1]">
            {data.latest_data_items?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chassis_visual')}
          className={`px-3 py-2 text-xs font-medium rounded-t-xs transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeTab === 'chassis_visual'
              ? 'border-[#8bd7d1] text-[#8bd7d1] bg-[#182026]'
              : 'border-transparent text-[#85a6b1] hover:text-[#caedde]'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          Hardware Chassis &amp; Model
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-3 py-2 text-xs font-medium rounded-t-xs transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeTab === 'inventory'
              ? 'border-[#8bd7d1] text-[#8bd7d1] bg-[#182026]'
              : 'border-transparent text-[#85a6b1] hover:text-[#caedde]'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          PostgreSQL Custom Inventory
          <span className="px-1.5 py-0.2 rounded-xs bg-[#161c20] text-[10px] text-[#85a6b1]">
            {Object.keys(data.custom_fields || {}).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className={`px-3 py-2 text-xs font-medium rounded-t-xs transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeTab === 'network'
              ? 'border-[#8bd7d1] text-[#8bd7d1] bg-[#182026]'
              : 'border-transparent text-[#85a6b1] hover:text-[#caedde]'
          }`}
        >
          <Wifi className="w-3.5 h-3.5" />
          Port &amp; IP Allocations
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-3 py-2 text-xs font-medium rounded-t-xs transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
            activeTab === 'alerts'
              ? 'border-[#8bd7d1] text-[#8bd7d1] bg-[#182026]'
              : 'border-transparent text-[#85a6b1] hover:text-[#caedde]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Active Problems &amp; Triggers
        </button>
      </div>

      {/* ─── TAB CONTENT PANELS ─── */}
      <div className="bg-[#182026] border border-[#394650] rounded-xs p-4 min-h-[450px]">
        {/* ─── TAB 1: ZABBIX LATEST DATA (Task 4) ─── */}
        {activeTab === 'latest_data' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#2d3a43]">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-xs rounded-xs transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#34424b] text-[#8bd7d1] font-bold border border-[#50626f]'
                        : 'bg-[#20282f] text-[#85a6b1] hover:text-[#caedde] border border-[#394650]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Instant Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 text-[#85a6b1] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={metricSearch}
                  onChange={(e) => setMetricSearch(e.target.value)}
                  placeholder="Filter metric name, key, or value..."
                  className="w-full bg-[#20282f] border border-[#394650] rounded-xs pl-8 pr-3 py-1.5 text-xs text-[#caedde] placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                />
              </div>
            </div>

            {/* Metrics Matrix Table */}
            <div className="overflow-x-auto border border-[#2d3a43] rounded-xs">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#20282f] text-[#85a6b1] uppercase text-[10px] tracking-wider border-b border-[#2d3a43]">
                  <tr>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Zabbix Key</th>
                    <th className="py-2.5 px-3 text-right">Last Value</th>
                    <th className="py-2.5 px-3 text-right">Change Delta</th>
                    <th className="py-2.5 px-3 text-right">Last Checked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26323a]">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#85a6b1]">
                        No telemetry items found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#20282f]/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded-2xs bg-[#20282f] border border-[#394650] text-[9px] text-[#8bd7d1]">
                            {item.category || 'General'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#85a6b1] text-[11px] font-mono">
                          {item.key_}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#caedde]">
                          {item.lastvalue !== null && item.lastvalue !== undefined ? (
                            <span>
                              {item.lastvalue} {item.units || ''}
                            </span>
                          ) : (
                            <span className="text-[#85a6b1]">--</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[11px]">
                          {item.change_delta ? (
                            <span
                              className={`font-semibold ${
                                item.change_delta.startsWith('+')
                                  ? 'text-amber-400'
                                  : item.change_delta.startsWith('-')
                                  ? 'text-emerald-400'
                                  : 'text-[#85a6b1]'
                              }`}
                            >
                              {item.change_delta}
                            </span>
                          ) : (
                            <span className="text-[#50626f]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#85a6b1] text-[11px]">
                          {item.lastclock
                            ? new Date(parseInt(item.lastclock) * 1000).toLocaleTimeString()
                            : 'Real-time'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 2: HARDWARE CHASSIS VISUALS (Task 2) ─── */}
        {activeTab === 'chassis_visual' && (
          <ChassisVisualCard
            deviceType={data.device_type}
            model={data.model}
            manufacturer={data.manufacturer}
            heightU={data.height_u}
            chassisSpecs={data.chassis_specs}
          />
        )}

        {/* ─── TAB 3: POSTGRESQL CUSTOM INVENTORY (Task 5) ─── */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d3a43]">
              <div>
                <h4 className="text-sm font-bold text-white">Dynamic Asset Fields (PostgreSQL CMDB)</h4>
                <p className="text-xs text-[#85a6b1] mt-0.5">
                  Decoupled from Zabbix to allow unlimited, flexible enterprise inventory schema.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isEditingInventory ? (
                  <>
                    <button
                      onClick={() => setIsEditingInventory(false)}
                      className="px-3 py-1 rounded-xs bg-[#20282f] border border-[#394650] text-[#85a6b1] text-xs hover:bg-[#34424b] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveInventory}
                      disabled={savingInventory}
                      className="px-3 py-1 rounded-xs bg-[#8bd7d1] text-[#161c20] font-bold text-xs hover:bg-[#caedde] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingInventory ? 'Saving...' : 'Save to PostgreSQL'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingInventory(true)}
                    className="px-3 py-1 rounded-xs bg-[#20282f] border border-[#394650] text-[#8bd7d1] text-xs hover:bg-[#34424b] transition-colors cursor-pointer font-bold"
                  >
                    Edit / Add Dynamic Fields
                  </button>
                )}
              </div>
            </div>

            {/* In-place Field Adder */}
            {isEditingInventory && (
              <div className="p-3 bg-[#20282f] border border-[#394650] rounded-xs space-y-2">
                <span className="text-xs font-bold text-[#8bd7d1] block">+ Add New Custom Inventory Field</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="Field Name (e.g. Warranty_Expiry, Contract_PO, SLA)"
                    className="flex-1 bg-[#161c20] border border-[#394650] rounded-xs px-2.5 py-1.5 text-xs text-[#caedde] placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                  />
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Value (e.g. 2028-12-31, PO-9942, 24x7x4)"
                    className="flex-1 bg-[#161c20] border border-[#394650] rounded-xs px-2.5 py-1.5 text-xs text-[#caedde] placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                  />
                  <button
                    onClick={handleAddField}
                    className="px-3 py-1.5 bg-[#34424b] text-[#8bd7d1] rounded-xs border border-[#50626f] text-xs font-bold hover:bg-[#414a50] transition-colors cursor-pointer shrink-0"
                  >
                    Add Field
                  </button>
                </div>
              </div>
            )}

            {/* Custom Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(customFields).map(([key, val]) => (
                <div
                  key={key}
                  className="p-3 rounded-xs bg-[#20282f] border border-[#394650] flex flex-col justify-between space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#85a6b1] uppercase tracking-wider font-bold">
                      {key.replace(/_/g, ' ')}
                    </span>
                    {isEditingInventory && (
                      <button
                        onClick={() => handleRemoveField(key)}
                        className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {isEditingInventory ? (
                    <input
                      type="text"
                      value={String(val || '')}
                      onChange={(e) =>
                        setCustomFields((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="bg-[#161c20] border border-[#394650] rounded-xs px-2 py-1 text-xs text-white focus:outline-none focus:border-[#8bd7d1]"
                    />
                  ) : (
                    <span className="text-xs font-bold text-white break-all">
                      {String(val || '--')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: NETWORK & PORT ALLOCATIONS ─── */}
        {activeTab === 'network' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white pb-2 border-b border-[#2d3a43]">
              Network &amp; Rack Interconnect Mappings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xs bg-[#20282f] border border-[#394650] space-y-2">
                <span className="text-[10px] font-bold text-[#8bd7d1] uppercase block">
                  Primary Data Network (VLAN 102 - Backbone)
                </span>
                <div className="space-y-1 text-[#caedde]">
                  <div>IP Address: <span className="font-bold text-white">{data.ip_address || '10.220.10.x'}</span></div>
                  <div>Subnet Mask: 255.255.255.0 (/24)</div>
                  <div>Default Gateway: 10.220.10.254</div>
                  <div>Switch Uplink: <span className="font-bold text-[#8bd7d1]">DC1-CORE-SW-01 (Port 100GE1/0/1)</span></div>
                </div>
              </div>

              <div className="p-3 rounded-xs bg-[#20282f] border border-[#394650] space-y-2">
                <span className="text-[10px] font-bold text-[#8bd7d1] uppercase block">
                  Out-of-Band IPMI / iDRAC Management
                </span>
                <div className="space-y-1 text-[#caedde]">
                  <div>Management IP: <span className="font-bold text-white">{data.ip_address ? `${data.ip_address.substring(0, data.ip_address.lastIndexOf('.'))}.250` : '10.220.10.250'}</span></div>
                  <div>VLAN: 99 (Isolated Out-of-band MGMT)</div>
                  <div>Controller: iDRAC9 Enterprise (Virtual Media &amp; KVM over IP)</div>
                  <div>Management Port: Dedicated 1GbE RJ-45</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: ACTIVE PROBLEMS & TRIGGERS ─── */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white pb-2 border-b border-[#2d3a43]">
              Zabbix Host Problem Triggers
            </h4>

            {data.active_alerts && data.active_alerts.length > 0 ? (
              <div className="space-y-2">
                {data.active_alerts.map((alert: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-xs bg-[#261d20] border border-rose-900/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                      <div>
                        <div className="font-bold text-rose-200">{alert.description}</div>
                        <div className="text-[10px] text-[#85a6b1] mt-0.5">Trigger ID: #{alert.triggerid}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-2xs bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold">
                      Severity: {alert.priority >= 4 ? 'HIGH / DISASTER' : 'WARNING'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#20282f] border border-[#394650] rounded-xs text-[#85a6b1]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h5 className="text-xs font-bold text-white">All Zabbix Triggers Nominal</h5>
                <p className="text-[11px] text-[#85a6b1] mt-0.5">
                  No active problems or threshold breaches detected for this host on Zabbix (192.168.1.85).
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
