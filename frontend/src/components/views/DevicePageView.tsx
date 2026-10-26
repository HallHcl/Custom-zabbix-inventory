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
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif]">
        <Activity className="w-8 h-8 animate-pulse text-[#0071E3] mb-3" />
        <h3 className="text-sm font-semibold text-[#1d1d1f] tracking-wide">CONNECTING TO ZABBIX 7.0 (192.168.1.85)</h3>
        <p className="text-xs text-zinc-500 mt-1">Aggregating live telemetry and PostgreSQL CMDB inventory...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4 font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif] select-none">
        <button
          onClick={onBack}
          className="h-[36px] px-3.5 rounded-[10px] bg-white hover:bg-black/[0.04] border-[0.5px] border-black/10 text-zinc-700 hover:text-[#1d1d1f] text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Previous View
        </button>
        <div className="p-4 rounded-[14px] bg-rose-50 border-[0.5px] border-rose-200 text-rose-800 text-xs">
          <p className="font-bold">Error loading device:</p>
          <p>{error || 'Device not found'}</p>
        </div>
      </div>
    )
  }

  const endU = data.start_u + data.height_u - 1

  return (
    <div className="max-w-[1700px] mx-auto space-y-6 select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif] text-[#1d1d1f]">
      {/* ─── BREADCRUMBS & TOP BAR ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b-[0.5px] border-black/10">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={onBack}
            className="h-[34px] px-3 rounded-[10px] bg-white hover:bg-black/[0.04] border-[0.5px] border-black/10 text-zinc-700 hover:text-[#1d1d1f] transition-all cursor-pointer flex items-center gap-1.5 font-semibold shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Rack
          </button>
          <span className="text-zinc-300">/</span>
          <span className="text-zinc-500">BKK-DC1</span>
          <span className="text-zinc-300">/</span>
          <span className="text-zinc-500">{data.room_name}</span>
          <span className="text-zinc-300">/</span>
          <span className="text-[#1d1d1f] font-semibold">{data.rack_name}</span>
          <span className="text-zinc-300">/</span>
          <span className="text-[#1d1d1f] font-semibold px-2 py-0.5 rounded-[8px] bg-black/[0.04] border-[0.5px] border-black/10">
            Slot U{data.start_u}-U{endU} ({data.height_u}U, {data.position_face})
          </span>
          {data.brand_info && (
            <span
              className={`px-2 py-0.5 rounded-[6px] border text-[10px] font-mono font-bold tracking-wider uppercase shadow-xs ${
                data.brand_info.badge_class || 'bg-black/[0.04] border-black/10 text-[#0071E3]'
              }`}
            >
              {data.brand_info.tag}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {data.zabbix_host_id ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-emerald-50 border-[0.5px] border-emerald-200 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zabbix Host ID: #{data.zabbix_host_id} (192.168.1.85)</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-[10px] bg-amber-50 border-[0.5px] border-amber-200 text-amber-800 text-xs font-medium">
              Standalone DCIM Inventory (Simulated Metrics)
            </div>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-[34px] px-3.5 rounded-[10px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs flex items-center gap-1.5 font-semibold shadow-xs shadow-[#0071E3]/25 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Metrics
          </button>
        </div>
      </div>

      {/* ─── QUICK KPI STATUS BANNER ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-[10px] bg-[#0071E3]/10 text-[#0071E3] border-[0.5px] border-[#0071E3]/20">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">CPU UTILIZATION</span>
            <span className="text-base font-bold text-[#1d1d1f]">
              {data.cpu_utilization !== undefined ? `${data.cpu_utilization}%` : '--'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-[10px] bg-purple-500/10 text-purple-600 border-[0.5px] border-purple-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">MEMORY USAGE</span>
            <span className="text-base font-bold text-[#1d1d1f]">
              {data.memory_utilization !== undefined ? `${data.memory_utilization}%` : '--'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-[10px] bg-amber-500/10 text-amber-600 border-[0.5px] border-amber-500/20">
            <Thermometer className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">TEMPERATURE</span>
            <span className="text-base font-bold text-amber-600">
              {data.temperature_c !== undefined ? `${data.temperature_c}°C` : '--'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-[10px] bg-emerald-500/10 text-emerald-600 border-[0.5px] border-emerald-500/20">
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">MANAGEMENT IP</span>
            <span className="text-sm font-bold text-[#1d1d1f] truncate block max-w-[130px]">
              {data.ip_address || 'Unassigned'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="p-2.5 rounded-[10px] bg-rose-500/10 text-rose-600 border-[0.5px] border-rose-500/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">ACTIVE ALERTS</span>
            <span className={`text-sm font-bold ${data.active_alerts?.length ? 'text-amber-600' : 'text-emerald-600'}`}>
              {data.active_alerts?.length ? `${data.active_alerts.length} Issues` : 'Nominal (0)'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── TAB NAVIGATION ─── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-[14px] bg-black/[0.04] border-[0.5px] border-black/10 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('latest_data')}
          className={`h-[36px] px-4 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'latest_data'
              ? 'bg-white text-[#1d1d1f] shadow-xs'
              : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.03]'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-[#0071E3]" />
          Zabbix Latest Data
          <span className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold ${
            activeTab === 'latest_data' ? 'bg-black/[0.06] text-zinc-800' : 'bg-black/[0.04] text-zinc-500'
          }`}>
            {data.latest_data_items?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chassis_visual')}
          className={`h-[36px] px-4 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'chassis_visual'
              ? 'bg-white text-[#1d1d1f] shadow-xs'
              : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.03]'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-purple-600" />
          Hardware Chassis &amp; Model
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`h-[36px] px-4 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-white text-[#1d1d1f] shadow-xs'
              : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.03]'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-indigo-600" />
          PostgreSQL Custom Inventory
          <span className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold ${
            activeTab === 'inventory' ? 'bg-black/[0.06] text-zinc-800' : 'bg-black/[0.04] text-zinc-500'
          }`}>
            {Object.keys(data.custom_fields || {}).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className={`h-[36px] px-4 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'network'
              ? 'bg-white text-[#1d1d1f] shadow-xs'
              : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.03]'
          }`}
        >
          <Wifi className="w-3.5 h-3.5 text-emerald-600" />
          Port &amp; IP Allocations
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`h-[36px] px-4 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'alerts'
              ? 'bg-white text-[#1d1d1f] shadow-xs'
              : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.03]'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-rose-600" />
          Active Problems &amp; Triggers
        </button>
      </div>

      {/* ─── TAB CONTENT PANELS ─── */}
      <div className="bg-white/75 backdrop-blur-2xl saturate-180 border-[0.5px] border-black/10 rounded-[20px] p-6 shadow-sm min-h-[480px]">
        {/* ─── TAB 1: ZABBIX LATEST DATA (Task 4) ─── */}
        {activeTab === 'latest_data' && (
          <div className="space-y-5">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b-[0.5px] border-black/10">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`h-[32px] px-3.5 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#0071E3] text-white shadow-xs'
                        : 'bg-black/[0.04] text-zinc-600 hover:text-black border-[0.5px] border-black/10 hover:bg-black/[0.06]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Instant Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={metricSearch}
                  onChange={(e) => setMetricSearch(e.target.value)}
                  placeholder="Filter metric name, key, or value..."
                  className="w-full h-[36px] bg-black/[0.04] border-[0.5px] border-black/10 rounded-[10px] pl-9 pr-3 text-xs text-[#1d1d1f] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
                />
              </div>
            </div>

            {/* Metrics Matrix Table */}
            <div className="overflow-x-auto border-[0.5px] border-black/10 rounded-[14px] shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/[0.02] text-zinc-500 uppercase text-[11px] font-semibold tracking-wider border-b-[0.5px] border-black/10 select-none">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Item Name</th>
                    <th className="py-3 px-3 font-semibold">Category</th>
                    <th className="py-3 px-3 font-semibold">Zabbix Key</th>
                    <th className="py-3 px-4 text-right font-semibold">Last Value</th>
                    <th className="py-3 px-3 text-right font-semibold">Change Delta</th>
                    <th className="py-3 px-4 text-right font-semibold">Last Checked</th>
                  </tr>
                </thead>
                <tbody className="divide-y-[0.5px] divide-black/5">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-zinc-400">
                        No telemetry items found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-black/[0.02] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#1d1d1f]">
                          {item.name}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-[6px] bg-black/[0.04] border-[0.5px] border-black/10 text-[10px] font-medium text-zinc-700">
                            {item.category || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-zinc-500 text-[11px] font-mono">
                          {item.key_}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#1d1d1f]">
                          {item.lastvalue !== null && item.lastvalue !== undefined ? (
                            <span>
                              {item.lastvalue} {item.units || ''}
                            </span>
                          ) : (
                            <span className="text-zinc-400">--</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-[11px]">
                          {item.change_delta ? (
                            <span
                              className={`font-semibold ${
                                item.change_delta.startsWith('+')
                                  ? 'text-amber-600'
                                  : item.change_delta.startsWith('-')
                                  ? 'text-emerald-600'
                                  : 'text-zinc-500'
                              }`}
                            >
                              {item.change_delta}
                            </span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-500 text-[11px]">
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
            brandInfo={data.brand_info}
          />
        )}

        {/* ─── TAB 3: POSTGRESQL CUSTOM INVENTORY (Task 5) ─── */}
        {activeTab === 'inventory' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-[0.5px] border-black/10">
              <div>
                <h4 className="text-sm font-semibold text-[#1d1d1f]">Dynamic Asset Fields (PostgreSQL CMDB)</h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Decoupled from Zabbix to allow unlimited, flexible enterprise inventory schema.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isEditingInventory ? (
                  <>
                    <button
                      onClick={() => setIsEditingInventory(false)}
                      className="h-[34px] px-3.5 rounded-[10px] bg-white hover:bg-black/[0.04] border-[0.5px] border-black/10 text-zinc-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveInventory}
                      disabled={savingInventory}
                      className="h-[34px] px-4 rounded-[10px] bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-[#0071E3]/20 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingInventory ? 'Saving...' : 'Save to PostgreSQL'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingInventory(true)}
                    className="h-[34px] px-4 rounded-[10px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-[#0071E3]/20"
                  >
                    Edit / Add Dynamic Fields
                  </button>
                )}
              </div>
            </div>

            {/* In-place Field Adder */}
            {isEditingInventory && (
              <div className="p-4 bg-black/[0.02] border-[0.5px] border-black/10 rounded-[14px] space-y-3">
                <span className="text-xs font-semibold text-[#0071E3] block">+ Add New Custom Inventory Field</span>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="Field Name (e.g. Warranty_Expiry, Contract_PO, SLA)"
                    className="flex-1 h-[36px] bg-white border-[0.5px] border-black/10 rounded-[10px] px-3 text-xs text-[#1d1d1f] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                  />
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Value (e.g. 2028-12-31, PO-9942, 24x7x4)"
                    className="flex-1 h-[36px] bg-white border-[0.5px] border-black/10 rounded-[10px] px-3 text-xs text-[#1d1d1f] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                  />
                  <button
                    onClick={handleAddField}
                    className="h-[36px] px-4 bg-[#0071E3] text-white rounded-[10px] text-xs font-semibold hover:bg-[#0077ED] shadow-xs shadow-[#0071E3]/20 transition-all cursor-pointer shrink-0"
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
                  className="p-3.5 rounded-[12px] bg-black/[0.02] border-[0.5px] border-black/10 shadow-xs flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                      {key.replace(/_/g, ' ')}
                    </span>
                    {isEditingInventory && (
                      <button
                        onClick={() => handleRemoveField(key)}
                        className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
                      className="h-[32px] bg-white border-[0.5px] border-black/10 rounded-[8px] px-2.5 text-xs text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-[#1d1d1f] break-all">
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
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-[#1d1d1f] pb-3 border-b-[0.5px] border-black/10">
              Network &amp; Rack Interconnect Mappings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-[16px] bg-black/[0.02] border-[0.5px] border-black/10 shadow-xs space-y-2.5">
                <span className="text-[11px] font-semibold text-[#0071E3] uppercase tracking-wider block">
                  Primary Data Network (VLAN 102 - Backbone)
                </span>
                <div className="space-y-1.5 text-zinc-600">
                  <div>IP Address: <span className="font-semibold text-[#1d1d1f]">{data.ip_address || '10.220.10.x'}</span></div>
                  <div>Subnet Mask: <span className="font-semibold text-[#1d1d1f]">255.255.255.0 (/24)</span></div>
                  <div>Default Gateway: <span className="font-semibold text-[#1d1d1f]">10.220.10.254</span></div>
                  <div>Switch Uplink: <span className="font-semibold text-[#0071E3]">DC1-CORE-SW-01 (Port 100GE1/0/1)</span></div>
                </div>
              </div>

              <div className="p-4 rounded-[16px] bg-black/[0.02] border-[0.5px] border-black/10 shadow-xs space-y-2.5">
                <span className="text-[11px] font-semibold text-[#0071E3] uppercase tracking-wider block">
                  Out-of-Band IPMI / iDRAC Management
                </span>
                <div className="space-y-1.5 text-zinc-600">
                  <div>Management IP: <span className="font-semibold text-[#1d1d1f]">{data.ip_address ? `${data.ip_address.substring(0, data.ip_address.lastIndexOf('.'))}.250` : '10.220.10.250'}</span></div>
                  <div>VLAN: <span className="font-semibold text-[#1d1d1f]">99 (Isolated Out-of-band MGMT)</span></div>
                  <div>Controller: <span className="font-semibold text-[#1d1d1f]">iDRAC9 Enterprise (Virtual Media &amp; KVM over IP)</span></div>
                  <div>Management Port: <span className="font-semibold text-[#1d1d1f]">Dedicated 1GbE RJ-45</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: ACTIVE PROBLEMS & TRIGGERS ─── */}
        {activeTab === 'alerts' && (
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-[#1d1d1f] pb-3 border-b-[0.5px] border-black/10">
              Zabbix Host Problem Triggers
            </h4>

            {data.active_alerts && data.active_alerts.length > 0 ? (
              <div className="space-y-2.5">
                {data.active_alerts.map((alert: any, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-[14px] bg-rose-50/80 border-[0.5px] border-rose-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                      <div>
                        <div className="font-semibold text-rose-950">{alert.description}</div>
                        <div className="text-[10px] text-rose-600 mt-0.5 font-mono">Trigger ID: #{alert.triggerid}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-[6px] bg-rose-100 text-rose-800 border-[0.5px] border-rose-300 text-[10px] font-bold">
                      Severity: {alert.priority >= 4 ? 'HIGH / DISASTER' : 'WARNING'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center bg-black/[0.02] border-[0.5px] border-black/10 rounded-[16px]">
                <CheckCircle2 className="w-9 h-9 text-emerald-600 mx-auto mb-2" />
                <h5 className="text-xs font-semibold text-[#1d1d1f]">All Zabbix Triggers Nominal</h5>
                <p className="text-[11px] text-zinc-500 mt-1">
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
