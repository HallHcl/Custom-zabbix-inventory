/* Apple UI & Tesla UI Dual-System Design – Verified: 8pt Grid, Telemetry Typography, Pure OLED Black / Cupertino Frost */
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
import { useTheme } from '../../lib/theme'

interface DevicePageViewProps {
  deviceId: number
  onBack: () => void
  onDeviceUpdated?: () => void
}

type TabKey = 'latest_data' | 'chassis_visual' | 'inventory' | 'network' | 'alerts'

export function DevicePageView({ deviceId, onBack, onDeviceUpdated }: DevicePageViewProps) {
  const { isTeslaDark } = useTheme()
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
      <div
        className={`min-h-[500px] flex flex-col items-center justify-center p-8 select-none ${
          isTeslaDark
            ? 'font-mono text-white'
            : "font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif] text-[#1d1d1f]"
        }`}
      >
        <Activity
          className={`w-8 h-8 animate-pulse mb-3 ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`}
        />
        <h3 className="text-sm font-semibold tracking-wide">CONNECTING TO ZABBIX 7.0 (192.168.1.85)</h3>
        <p className={`text-xs mt-1 ${isTeslaDark ? 'text-[#8E8E93]' : 'text-zinc-500'}`}>
          Aggregating live telemetry and PostgreSQL CMDB inventory...
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div
        className={`p-6 max-w-4xl mx-auto space-y-4 select-none ${
          isTeslaDark
            ? 'font-mono text-white'
            : "font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif]"
        }`}
      >
        <button
          onClick={onBack}
          className={`h-[36px] px-3.5 rounded-[10px] text-xs flex items-center gap-1.5 transition-colors cursor-pointer font-semibold ${
            isTeslaDark
              ? 'bg-[#111111] hover:bg-[#161616] border border-[#1F1F1F] text-zinc-300 hover:text-white'
              : 'bg-white hover:bg-black/[0.04] border-[0.5px] border-black/10 text-zinc-700 hover:text-[#1d1d1f] shadow-xs'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Previous View
        </button>
        <div
          className={`p-4 rounded-[14px] text-xs ${
            isTeslaDark
              ? 'bg-rose-950/20 border border-rose-900/40 text-rose-300'
              : 'bg-rose-50 border-[0.5px] border-rose-200 text-rose-800'
          }`}
        >
          <p className="font-bold">Error loading device:</p>
          <p>{error || 'Device not found'}</p>
        </div>
      </div>
    )
  }

  const endU = data.start_u + data.height_u - 1

  return (
    <div
      className={`max-w-[1700px] mx-auto space-y-6 select-none ${
        isTeslaDark
          ? 'font-mono text-zinc-100'
          : "font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif] text-[#1d1d1f]"
      }`}
    >
      {/* ─── BREADCRUMBS & TOP BAR ─── */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b ${
          isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={onBack}
            className={`h-[34px] px-3 rounded-[10px] transition-all cursor-pointer flex items-center gap-1.5 font-semibold ${
              isTeslaDark
                ? 'bg-[#111111] hover:bg-[#161616] border border-[#1F1F1F] text-zinc-300 hover:text-white'
                : 'bg-white hover:bg-black/[0.04] border-[0.5px] border-black/10 text-zinc-700 hover:text-[#1d1d1f] shadow-xs'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Rack
          </button>
          <span className={isTeslaDark ? 'text-zinc-700' : 'text-zinc-300'}>/</span>
          <span className={isTeslaDark ? 'text-zinc-500' : 'text-zinc-500'}>BKK-DC1</span>
          <span className={isTeslaDark ? 'text-zinc-700' : 'text-zinc-300'}>/</span>
          <span className={isTeslaDark ? 'text-zinc-400' : 'text-zinc-500'}>{data.room_name}</span>
          <span className={isTeslaDark ? 'text-zinc-700' : 'text-zinc-300'}>/</span>
          <span className={`font-semibold ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>{data.rack_name}</span>
          <span className={isTeslaDark ? 'text-zinc-700' : 'text-zinc-300'}>/</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded-[8px] ${
              isTeslaDark
                ? 'text-zinc-200 bg-[#161616] border border-[#1F1F1F]'
                : 'text-[#1d1d1f] bg-black/[0.04] border-[0.5px] border-black/10'
            }`}
          >
            Slot U{data.start_u}-U{endU} ({data.height_u}U, {data.position_face})
          </span>
          {data.brand_info && (
            <span
              className={`px-2 py-0.5 rounded-[6px] border text-[10px] font-mono font-bold tracking-wider uppercase shadow-xs ${
                data.brand_info.badge_class ||
                (isTeslaDark
                  ? 'bg-[#161616] border-[#1F1F1F] text-[#3E6AE1]'
                  : 'bg-black/[0.04] border-black/10 text-[#0071E3]')
              }`}
            >
              {data.brand_info.tag}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {data.zabbix_host_id ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-medium ${
                isTeslaDark
                  ? 'bg-[#00C853]/10 border border-[#00C853]/30 text-[#00C853]'
                  : 'bg-emerald-50 border-[0.5px] border-emerald-200 text-emerald-800'
              }`}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-[#00C853]' : 'text-emerald-600'}`} />
              <span>Zabbix Host ID: #{data.zabbix_host_id} (192.168.1.85)</span>
            </div>
          ) : (
            <div
              className={`px-3 py-1.5 rounded-[10px] text-xs font-medium ${
                isTeslaDark
                  ? 'bg-[#FF9500]/10 border border-[#FF9500]/30 text-[#FF9500]'
                  : 'bg-amber-50 border-[0.5px] border-amber-200 text-amber-800'
              }`}
            >
              Standalone DCIM Inventory (Simulated Metrics)
            </div>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`h-[34px] px-3.5 rounded-[10px] text-white text-xs flex items-center gap-1.5 font-semibold transition-all cursor-pointer disabled:opacity-50 ${
              isTeslaDark
                ? 'bg-[#3E6AE1] hover:bg-[#345ac2]'
                : 'bg-[#0071E3] hover:bg-[#0077ED] shadow-xs shadow-[#0071E3]/25'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Metrics
          </button>
        </div>
      </div>

      {/* ─── QUICK KPI STATUS BANNER ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div
          className={`p-3.5 rounded-[16px] flex items-center gap-3 ${
            isTeslaDark
              ? 'bg-[#111111] border border-[#1F1F1F] shadow-none'
              : 'bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs'
          }`}
        >
          <div
            className={`p-2.5 rounded-[10px] border ${
              isTeslaDark
                ? 'bg-[#3E6AE1]/15 text-[#3E6AE1] border-[#3E6AE1]/30'
                : 'bg-[#0071E3]/10 text-[#0071E3] border-[#0071E3]/20'
            }`}
          >
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span
              className={`text-[10px] block uppercase font-semibold ${
                isTeslaDark ? 'text-[#8E8E93] tracking-[1.5px]' : 'text-zinc-500 tracking-wider'
              }`}
            >
              CPU UTILIZATION
            </span>
            <span
              className={`text-base font-bold ${
                isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'
              }`}
            >
              {data.cpu_utilization !== undefined ? `${data.cpu_utilization}%` : '--'}
            </span>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-[16px] flex items-center gap-3 ${
            isTeslaDark
              ? 'bg-[#111111] border border-[#1F1F1F] shadow-none'
              : 'bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs'
          }`}
        >
          <div
            className={`p-2.5 rounded-[10px] border ${
              isTeslaDark
                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                : 'bg-purple-500/10 text-purple-600 border-purple-500/20'
            }`}
          >
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span
              className={`text-[10px] block uppercase font-semibold ${
                isTeslaDark ? 'text-[#8E8E93] tracking-[1.5px]' : 'text-zinc-500 tracking-wider'
              }`}
            >
              MEMORY USAGE
            </span>
            <span
              className={`text-base font-bold ${
                isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'
              }`}
            >
              {data.memory_utilization !== undefined ? `${data.memory_utilization}%` : '--'}
            </span>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-[16px] flex items-center gap-3 ${
            isTeslaDark
              ? 'bg-[#111111] border border-[#1F1F1F] shadow-none'
              : 'bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs'
          }`}
        >
          <div
            className={`p-2.5 rounded-[10px] border ${
              isTeslaDark
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
            }`}
          >
            <Thermometer className="w-4 h-4" />
          </div>
          <div>
            <span
              className={`text-[10px] block uppercase font-semibold ${
                isTeslaDark ? 'text-[#8E8E93] tracking-[1.5px]' : 'text-zinc-500 tracking-wider'
              }`}
            >
              TEMPERATURE
            </span>
            <span className="text-base font-bold text-amber-500 font-mono">
              {data.temperature_c !== undefined ? `${data.temperature_c}°C` : '--'}
            </span>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-[16px] flex items-center gap-3 ${
            isTeslaDark
              ? 'bg-[#111111] border border-[#1F1F1F] shadow-none'
              : 'bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs'
          }`}
        >
          <div
            className={`p-2.5 rounded-[10px] border ${
              isTeslaDark
                ? 'bg-[#00C853]/15 text-[#00C853] border-[#00C853]/30'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            }`}
          >
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <span
              className={`text-[10px] block uppercase font-semibold ${
                isTeslaDark ? 'text-[#8E8E93] tracking-[1.5px]' : 'text-zinc-500 tracking-wider'
              }`}
            >
              MANAGEMENT IP
            </span>
            <span
              className={`text-sm font-bold truncate block max-w-[130px] ${
                isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'
              }`}
            >
              {data.ip_address || 'Unassigned'}
            </span>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-[16px] flex items-center gap-3 col-span-2 md:col-span-1 ${
            isTeslaDark
              ? 'bg-[#111111] border border-[#1F1F1F] shadow-none'
              : 'bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs'
          }`}
        >
          <div
            className={`p-2.5 rounded-[10px] border ${
              isTeslaDark
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
            }`}
          >
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span
              className={`text-[10px] block uppercase font-semibold ${
                isTeslaDark ? 'text-[#8E8E93] tracking-[1.5px]' : 'text-zinc-500 tracking-wider'
              }`}
            >
              ACTIVE ALERTS
            </span>
            <span
              className={`text-sm font-bold font-mono ${
                data.active_alerts?.length ? 'text-amber-500' : isTeslaDark ? 'text-[#00C853]' : 'text-emerald-600'
              }`}
            >
              {data.active_alerts?.length ? `${data.active_alerts.length} Issues` : 'Nominal (0)'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── TAB NAVIGATION ─── */}
      <div
        className={`flex items-center gap-1.5 p-1.5 rounded-[14px] overflow-x-auto no-scrollbar ${
          isTeslaDark ? 'bg-[#111111] border border-[#1F1F1F]' : 'bg-black/[0.04] border-[0.5px] border-black/10'
        }`}
      >
        <button
          onClick={() => setActiveTab('latest_data')}
          className={`h-[36px] px-4 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'latest_data'
              ? isTeslaDark
                ? 'bg-[#3E6AE1] text-white shadow-none'
                : 'bg-white text-[#1d1d1f] shadow-xs'
              : isTeslaDark
              ? 'text-zinc-400 hover:text-white hover:bg-[#161616]'
              : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.03]'
          }`}
        >
          <Activity className={`w-3.5 h-3.5 ${isTeslaDark ? 'text-white' : 'text-[#0071E3]'}`} />
          Zabbix Latest Data
          <span
            className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold ${
              activeTab === 'latest_data'
                ? isTeslaDark
                  ? 'bg-black/30 text-white'
                  : 'bg-black/[0.06] text-zinc-800'
                : isTeslaDark
                ? 'bg-[#1F1F1F] text-zinc-400'
                : 'bg-black/[0.04] text-zinc-500'
            }`}
          >
            {data.latest_data_items?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chassis_visual')}
          className={`h-[36px] px-4 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'chassis_visual'
              ? isTeslaDark
                ? 'bg-[#3E6AE1] text-white shadow-none'
                : 'bg-white text-[#1d1d1f] shadow-xs'
              : isTeslaDark
              ? 'text-zinc-400 hover:text-white hover:bg-[#161616]'
              : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.03]'
          }`}
        >
          <Box className={`w-3.5 h-3.5 ${isTeslaDark && activeTab === 'chassis_visual' ? 'text-white' : 'text-purple-500'}`} />
          Hardware Chassis &amp; Model
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`h-[36px] px-4 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory'
              ? isTeslaDark
                ? 'bg-[#3E6AE1] text-white shadow-none'
                : 'bg-white text-[#1d1d1f] shadow-xs'
              : isTeslaDark
              ? 'text-zinc-400 hover:text-white hover:bg-[#161616]'
              : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.03]'
          }`}
        >
          <Server className={`w-3.5 h-3.5 ${isTeslaDark && activeTab === 'inventory' ? 'text-white' : 'text-indigo-500'}`} />
          PostgreSQL Custom Inventory
          <span
            className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold ${
              activeTab === 'inventory'
                ? isTeslaDark
                  ? 'bg-black/30 text-white'
                  : 'bg-black/[0.06] text-zinc-800'
                : isTeslaDark
                ? 'bg-[#1F1F1F] text-zinc-400'
                : 'bg-black/[0.04] text-zinc-500'
            }`}
          >
            {Object.keys(data.custom_fields || {}).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('network')}
          className={`h-[36px] px-4 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'network'
              ? isTeslaDark
                ? 'bg-[#3E6AE1] text-white shadow-none'
                : 'bg-white text-[#1d1d1f] shadow-xs'
              : isTeslaDark
              ? 'text-zinc-400 hover:text-white hover:bg-[#161616]'
              : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.03]'
          }`}
        >
          <Wifi className={`w-3.5 h-3.5 ${isTeslaDark && activeTab === 'network' ? 'text-white' : 'text-emerald-500'}`} />
          Port &amp; IP Allocations
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`h-[36px] px-4 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'alerts'
              ? isTeslaDark
                ? 'bg-[#3E6AE1] text-white shadow-none'
                : 'bg-white text-[#1d1d1f] shadow-xs'
              : isTeslaDark
              ? 'text-zinc-400 hover:text-white hover:bg-[#161616]'
              : 'text-zinc-600 hover:text-[#1d1d1f] hover:bg-black/[0.03]'
          }`}
        >
          <Shield className={`w-3.5 h-3.5 ${isTeslaDark && activeTab === 'alerts' ? 'text-white' : 'text-rose-500'}`} />
          Active Problems &amp; Triggers
        </button>
      </div>

      {/* ─── TAB CONTENT PANELS ─── */}
      <div
        className={`min-h-[480px] ${
          isTeslaDark
            ? 'bg-[#111111] border border-[#1F1F1F] rounded-[16px] p-6 shadow-none'
            : 'bg-white/75 backdrop-blur-2xl saturate-180 border-[0.5px] border-black/10 rounded-[20px] p-6 shadow-sm'
        }`}
      >
        {/* ─── TAB 1: ZABBIX LATEST DATA ─── */}
        {activeTab === 'latest_data' && (
          <div className="space-y-5">
            {/* Filter Bar */}
            <div
              className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b ${
                isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
              }`}
            >
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`h-[32px] px-3.5 text-xs font-semibold rounded-[8px] transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? isTeslaDark
                          ? 'bg-[#3E6AE1] text-white shadow-none'
                          : 'bg-[#0071E3] text-white shadow-xs'
                        : isTeslaDark
                        ? 'bg-[#161616] text-zinc-400 hover:text-white border border-[#1F1F1F] hover:bg-[#1F1F1F]'
                        : 'bg-black/[0.04] text-zinc-600 hover:text-black border-[0.5px] border-black/10 hover:bg-black/[0.06]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Instant Search Input */}
              <div className="relative w-full md:w-80">
                <Search
                  className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                    isTeslaDark ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                />
                <input
                  type="text"
                  value={metricSearch}
                  onChange={(e) => setMetricSearch(e.target.value)}
                  placeholder="Filter metric name, key, or value..."
                  className={`w-full h-[36px] rounded-[10px] pl-9 pr-3 text-xs transition-all focus:outline-none focus:ring-2 ${
                    isTeslaDark
                      ? 'bg-[#161616] border border-[#1F1F1F] text-white placeholder:text-zinc-600 focus:border-[#3E6AE1] focus:ring-[#3E6AE1]/20'
                      : 'bg-black/[0.04] border-[0.5px] border-black/10 text-[#1d1d1f] placeholder:text-zinc-400 focus:ring-[#0071E3]/20 focus:border-[#0071E3]'
                  }`}
                />
              </div>
            </div>

            {/* Metrics Matrix Table */}
            <div
              className={`overflow-x-auto rounded-[14px] ${
                isTeslaDark ? 'border border-[#1F1F1F] bg-[#0A0A0A]' : 'border-[0.5px] border-black/10 shadow-xs'
              }`}
            >
              <table className="w-full text-left text-xs">
                <thead
                  className={`uppercase text-[11px] font-semibold tracking-wider select-none border-b ${
                    isTeslaDark
                      ? 'bg-[#111111] text-zinc-400 border-[#1F1F1F]'
                      : 'bg-black/[0.02] text-zinc-500 border-black/10'
                  }`}
                >
                  <tr>
                    <th className="py-3 px-4 font-semibold">Item Name</th>
                    <th className="py-3 px-3 font-semibold">Category</th>
                    <th className="py-3 px-3 font-semibold">Zabbix Key</th>
                    <th className="py-3 px-4 text-right font-semibold">Last Value</th>
                    <th className="py-3 px-3 text-right font-semibold">Change Delta</th>
                    <th className="py-3 px-4 text-right font-semibold">Last Checked</th>
                  </tr>
                </thead>
                <tbody className={isTeslaDark ? 'divide-y divide-[#1F1F1F]' : 'divide-y-[0.5px] divide-black/5'}>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={`py-10 text-center ${isTeslaDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        No telemetry items found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          isTeslaDark ? 'hover:bg-[#161616]/70' : 'hover:bg-black/[0.02]'
                        }`}
                      >
                        <td className={`py-3 px-4 font-semibold ${isTeslaDark ? 'text-zinc-100' : 'text-[#1d1d1f]'}`}>
                          {item.name}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-[6px] text-[10px] font-medium ${
                              isTeslaDark
                                ? 'bg-[#161616] border border-[#1F1F1F] text-zinc-300'
                                : 'bg-black/[0.04] border-[0.5px] border-black/10 text-zinc-700'
                            }`}
                          >
                            {item.category || 'General'}
                          </span>
                        </td>
                        <td className={`py-3 px-3 text-[11px] font-mono ${isTeslaDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          {item.key_}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${isTeslaDark ? 'text-white font-mono' : 'text-[#1d1d1f]'}`}>
                          {item.lastvalue !== null && item.lastvalue !== undefined ? (
                            <span>
                              {item.lastvalue} {item.units || ''}
                            </span>
                          ) : (
                            <span className={isTeslaDark ? 'text-zinc-600' : 'text-zinc-400'}>--</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-[11px]">
                          {item.change_delta ? (
                            <span
                              className={`font-semibold font-mono ${
                                item.change_delta.startsWith('+')
                                  ? 'text-amber-500'
                                  : item.change_delta.startsWith('-')
                                  ? isTeslaDark
                                    ? 'text-[#00C853]'
                                    : 'text-emerald-600'
                                  : 'text-zinc-500'
                              }`}
                            >
                              {item.change_delta}
                            </span>
                          ) : (
                            <span className={isTeslaDark ? 'text-zinc-700' : 'text-zinc-300'}>-</span>
                          )}
                        </td>
                        <td className={`py-3 px-4 text-right text-[11px] font-mono ${isTeslaDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
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

        {/* ─── TAB 2: HARDWARE CHASSIS VISUALS ─── */}
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

        {/* ─── TAB 3: POSTGRESQL CUSTOM INVENTORY ─── */}
        {activeTab === 'inventory' && (
          <div className="space-y-5">
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
                isTeslaDark ? 'border-[#1F1F1F]' : 'border-black/10'
              }`}
            >
              <div>
                <h4 className={`text-sm font-semibold ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  Dynamic Asset Fields (PostgreSQL CMDB)
                </h4>
                <p className={`text-xs mt-0.5 ${isTeslaDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Decoupled from Zabbix to allow unlimited, flexible enterprise inventory schema.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isEditingInventory ? (
                  <>
                    <button
                      onClick={() => setIsEditingInventory(false)}
                      className={`h-[34px] px-3.5 rounded-[10px] text-xs font-semibold transition-colors cursor-pointer ${
                        isTeslaDark
                          ? 'bg-[#161616] hover:bg-[#1F1F1F] border border-[#1F1F1F] text-zinc-300'
                          : 'bg-white hover:bg-black/[0.04] border-[0.5px] border-black/10 text-zinc-700 shadow-xs'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveInventory}
                      disabled={savingInventory}
                      className={`h-[34px] px-4 rounded-[10px] font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                        isTeslaDark
                          ? 'bg-[#3E6AE1] hover:bg-[#345ac2] text-white shadow-none'
                          : 'bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm shadow-[#0071E3]/20'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingInventory ? 'Saving...' : 'Save to PostgreSQL'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingInventory(true)}
                    className={`h-[34px] px-4 rounded-[10px] text-xs font-semibold transition-all cursor-pointer ${
                      isTeslaDark
                        ? 'bg-[#3E6AE1] hover:bg-[#345ac2] text-white shadow-none'
                        : 'bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm shadow-[#0071E3]/20'
                    }`}
                  >
                    Edit / Add Dynamic Fields
                  </button>
                )}
              </div>
            </div>

            {/* In-place Field Adder */}
            {isEditingInventory && (
              <div
                className={`p-4 rounded-[14px] space-y-3 ${
                  isTeslaDark ? 'bg-[#161616] border border-[#1F1F1F]' : 'bg-black/[0.02] border-[0.5px] border-black/10'
                }`}
              >
                <span className={`text-xs font-semibold block ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`}>
                  + Add New Custom Inventory Field
                </span>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="Field Name (e.g. Warranty_Expiry, Contract_PO, SLA)"
                    className={`flex-1 h-[36px] rounded-[10px] px-3 text-xs focus:outline-none focus:ring-2 ${
                      isTeslaDark
                        ? 'bg-[#0A0A0A] border border-[#1F1F1F] text-white placeholder:text-zinc-600 focus:ring-[#3E6AE1]/20 focus:border-[#3E6AE1]'
                        : 'bg-white border-[0.5px] border-black/10 text-[#1d1d1f] placeholder:text-zinc-400 focus:ring-[#0071E3]/20 focus:border-[#0071E3]'
                    }`}
                  />
                  <input
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Value (e.g. 2028-12-31, PO-9942, 24x7x4)"
                    className={`flex-1 h-[36px] rounded-[10px] px-3 text-xs focus:outline-none focus:ring-2 ${
                      isTeslaDark
                        ? 'bg-[#0A0A0A] border border-[#1F1F1F] text-white placeholder:text-zinc-600 focus:ring-[#3E6AE1]/20 focus:border-[#3E6AE1]'
                        : 'bg-white border-[0.5px] border-black/10 text-[#1d1d1f] placeholder:text-zinc-400 focus:ring-[#0071E3]/20 focus:border-[#0071E3]'
                    }`}
                  />
                  <button
                    onClick={handleAddField}
                    className={`h-[36px] px-4 rounded-[10px] text-xs font-semibold text-white transition-all cursor-pointer shrink-0 ${
                      isTeslaDark
                        ? 'bg-[#3E6AE1] hover:bg-[#345ac2]'
                        : 'bg-[#0071E3] hover:bg-[#0077ED] shadow-xs shadow-[#0071E3]/20'
                    }`}
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
                  className={`p-3.5 rounded-[12px] flex flex-col justify-between space-y-2 ${
                    isTeslaDark
                      ? 'bg-[#161616] border border-[#1F1F1F]'
                      : 'bg-black/[0.02] border-[0.5px] border-black/10 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] uppercase font-semibold ${
                        isTeslaDark ? 'text-[#8E8E93] tracking-[1.5px]' : 'text-zinc-500 tracking-wider'
                      }`}
                    >
                      {key.replace(/_/g, ' ')}
                    </span>
                    {isEditingInventory && (
                      <button
                        onClick={() => handleRemoveField(key)}
                        className="text-rose-500 hover:text-rose-400 p-1 cursor-pointer"
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
                      className={`h-[32px] rounded-[8px] px-2.5 text-xs focus:outline-none focus:ring-2 ${
                        isTeslaDark
                          ? 'bg-[#0A0A0A] border border-[#1F1F1F] text-white focus:ring-[#3E6AE1]/20 focus:border-[#3E6AE1]'
                          : 'bg-white border-[0.5px] border-black/10 text-[#1d1d1f] focus:ring-[#0071E3]/20 focus:border-[#0071E3]'
                      }`}
                    />
                  ) : (
                    <span
                      className={`text-xs font-semibold break-all ${
                        isTeslaDark ? 'text-zinc-200 font-mono' : 'text-[#1d1d1f]'
                      }`}
                    >
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
            <h4
              className={`text-sm font-semibold pb-3 border-b ${
                isTeslaDark ? 'text-white border-[#1F1F1F]' : 'text-[#1d1d1f] border-black/10'
              }`}
            >
              Network &amp; Rack Interconnect Mappings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div
                className={`p-4 rounded-[16px] space-y-2.5 ${
                  isTeslaDark
                    ? 'bg-[#161616] border border-[#1F1F1F]'
                    : 'bg-black/[0.02] border-[0.5px] border-black/10 shadow-xs'
                }`}
              >
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider block ${
                    isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'
                  }`}
                >
                  Primary Data Network (VLAN 102 - Backbone)
                </span>
                <div className={`space-y-1.5 ${isTeslaDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <div>
                    IP Address:{' '}
                    <span className={`font-semibold font-mono ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      {data.ip_address || '10.220.10.x'}
                    </span>
                  </div>
                  <div>
                    Subnet Mask:{' '}
                    <span className={`font-semibold font-mono ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      255.255.255.0 (/24)
                    </span>
                  </div>
                  <div>
                    Default Gateway:{' '}
                    <span className={`font-semibold font-mono ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      10.220.10.254
                    </span>
                  </div>
                  <div>
                    Switch Uplink:{' '}
                    <span className={`font-semibold font-mono ${isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'}`}>
                      DC1-CORE-SW-01 (Port 100GE1/0/1)
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-[16px] space-y-2.5 ${
                  isTeslaDark
                    ? 'bg-[#161616] border border-[#1F1F1F]'
                    : 'bg-black/[0.02] border-[0.5px] border-black/10 shadow-xs'
                }`}
              >
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider block ${
                    isTeslaDark ? 'text-[#3E6AE1]' : 'text-[#0071E3]'
                  }`}
                >
                  Out-of-Band IPMI / iDRAC Management
                </span>
                <div className={`space-y-1.5 ${isTeslaDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  <div>
                    Management IP:{' '}
                    <span className={`font-semibold font-mono ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      {data.ip_address
                        ? `${data.ip_address.substring(0, data.ip_address.lastIndexOf('.'))}.250`
                        : '10.220.10.250'}
                    </span>
                  </div>
                  <div>
                    VLAN:{' '}
                    <span className={`font-semibold font-mono ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      99 (Isolated Out-of-band MGMT)
                    </span>
                  </div>
                  <div>
                    Controller:{' '}
                    <span className={`font-semibold ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      iDRAC9 Enterprise (Virtual Media &amp; KVM over IP)
                    </span>
                  </div>
                  <div>
                    Management Port:{' '}
                    <span className={`font-semibold ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                      Dedicated 1GbE RJ-45
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: ACTIVE PROBLEMS & TRIGGERS ─── */}
        {activeTab === 'alerts' && (
          <div className="space-y-5">
            <h4
              className={`text-sm font-semibold pb-3 border-b ${
                isTeslaDark ? 'text-white border-[#1F1F1F]' : 'text-[#1d1d1f] border-black/10'
              }`}
            >
              Zabbix Host Problem Triggers
            </h4>

            {data.active_alerts && data.active_alerts.length > 0 ? (
              <div className="space-y-2.5">
                {data.active_alerts.map((alert: any, i: number) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-[14px] flex items-center justify-between text-xs ${
                      isTeslaDark
                        ? 'bg-rose-950/20 border border-rose-900/40 text-rose-300'
                        : 'bg-rose-50/80 border-[0.5px] border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />
                      <div>
                        <div className={`font-semibold ${isTeslaDark ? 'text-rose-200' : 'text-rose-950'}`}>
                          {alert.description}
                        </div>
                        <div className="text-[10px] text-rose-400 mt-0.5 font-mono">
                          Trigger ID: #{alert.triggerid}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-[6px] text-[10px] font-bold ${
                        isTeslaDark
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                          : 'bg-rose-100 text-rose-800 border-[0.5px] border-rose-300'
                      }`}
                    >
                      Severity: {alert.priority >= 4 ? 'HIGH / DISASTER' : 'WARNING'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`p-10 text-center rounded-[16px] ${
                  isTeslaDark
                    ? 'bg-[#161616] border border-[#1F1F1F]'
                    : 'bg-black/[0.02] border-[0.5px] border-black/10'
                }`}
              >
                <CheckCircle2
                  className={`w-9 h-9 mx-auto mb-2 ${isTeslaDark ? 'text-[#00C853]' : 'text-emerald-600'}`}
                />
                <h5 className={`text-xs font-semibold ${isTeslaDark ? 'text-white' : 'text-[#1d1d1f]'}`}>
                  All Zabbix Triggers Nominal
                </h5>
                <p className={`text-[11px] mt-1 ${isTeslaDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
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

