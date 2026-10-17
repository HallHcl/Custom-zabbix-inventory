import { useState, useEffect } from 'react'
import {
  X,
  Cpu,
  Layers,
  Thermometer,
  Search,
  Plus,
  Save,
  Tag,
  Server,
  Shield,
  Activity,
  Edit2,
  Trash2,
} from 'lucide-react'
import type { DeviceOverview } from '../../types'
import { fetchDeviceOverview, updateDeviceInventory } from '../../api/client'

interface DevicePageModalProps {
  deviceId: number | null
  onClose: () => void
  onDeviceUpdated?: () => void
}

export function DevicePageModal({ deviceId, onClose, onDeviceUpdated }: DevicePageModalProps) {
  const [data, setData] = useState<DeviceOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'latest_data' | 'inventory' | 'tags'>('latest_data')

  // Search filter for Latest Data
  const [metricSearch, setMetricSearch] = useState('')

  // Editing Dynamic Inventory
  const [isEditingInventory, setIsEditingInventory] = useState(false)
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!deviceId) return
    setLoading(true)
    setError(null)
    fetchDeviceOverview(deviceId)
      .then((res) => {
        setData(res)
        setEditFields(res.custom_fields || {})
      })
      .catch((err) => {
        setError(err.message || 'Failed to load device details')
      })
      .finally(() => setLoading(false))
  }, [deviceId])

  if (!deviceId) return null

  const handleSaveInventory = async () => {
    if (!data) return
    setSaving(true)
    try {
      await updateDeviceInventory(data.device_id, {
        custom_fields: editFields,
        brand: editFields['brand'],
        vendor: editFields['vendor'],
        version: editFields['version'],
        user: editFields['user'],
        role: editFields['role'],
      })
      setIsEditingInventory(false)
      // Refresh overview
      const updated = await fetchDeviceOverview(data.device_id)
      setData(updated)
      if (onDeviceUpdated) onDeviceUpdated()
    } catch (err: any) {
      alert('Failed to save inventory: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddField = () => {
    if (!newKey.trim()) return
    setEditFields((prev) => ({ ...prev, [newKey.trim()]: newValue.trim() }))
    setNewKey('')
    setNewValue('')
  }

  const handleRemoveField = (key: string) => {
    setEditFields((prev) => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })
  }

  const filteredItems = (data?.latest_data_items || []).filter((item) => {
    if (!metricSearch) return true
    const q = metricSearch.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      item.key_.toLowerCase().includes(q) ||
      (item.lastvalue && item.lastvalue.toLowerCase().includes(q))
    )
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl overflow-hidden text-zinc-100">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {data?.device_name || 'Loading Device...'}
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {data?.device_type || 'Device'}
                </span>
                {data?.zabbix_host_id && (
                  <span className="px-2 py-0.5 text-[11px] font-mono rounded-md bg-emerald-950/50 text-emerald-400 border border-emerald-800/60">
                    Host ID: {data.zabbix_host_id}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {data?.room_name} • {data?.rack_name} • U{data?.start_u}-U{(data?.start_u || 0) + (data?.height_u || 1) - 1} ({data?.height_u}U, {data?.position_face}) • IP: {data?.ip_address || 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3.5 bg-zinc-950/40 border-b border-zinc-800/80 text-xs">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <Cpu className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-400 block">CPU Utilization</span>
              <span className="font-bold text-white text-sm">
                {data?.cpu_utilization !== undefined ? `${data.cpu_utilization}%` : '--'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <Layers className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-400 block">Memory Used</span>
              <span className="font-bold text-white text-sm">
                {data?.memory_utilization !== undefined ? `${data.memory_utilization}%` : '--'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <Thermometer className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-400 block">Temperature</span>
              <span className="font-bold text-white text-sm">
                {data?.temperature_c !== undefined ? `${data.temperature_c}°C` : '--'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-zinc-400 block">Status / Problems</span>
              <span className="font-bold text-emerald-400 text-sm">
                {data?.active_alerts?.length ? `${data.active_alerts.length} Issues` : 'Healthy (0)'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-800 bg-zinc-900/40">
          <button
            onClick={() => setActiveTab('latest_data')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'latest_data'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Latest Data (Zabbix Telemetry)
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-400">
              {data?.latest_data_items?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'inventory'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Custom Inventory (PostgreSQL)
            <span className="px-1.5 py-0.2 rounded-full bg-zinc-800 text-[10px] text-zinc-400">
              {Object.keys(data?.custom_fields || {}).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tags')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'tags'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Host Tags & Metadata
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-zinc-400">
              <Activity className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
              <p className="text-sm">Fetching real-time telemetry & custom inventory...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm">
              {error}
            </div>
          ) : (
            <>
              {/* TAB 1: LATEST DATA (ZABBIX) */}
              {activeTab === 'latest_data' && (
                <div className="space-y-4">
                  {/* Search Bar for Metrics */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Filter latest metrics by name, key (e.g. cpu, ping, icmp, memory)..."
                        value={metricSearch}
                        onChange={(e) => setMetricSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <span className="text-xs text-zinc-400 font-mono">
                      Showing {filteredItems.length} of {data?.latest_data_items?.length || 0} items
                    </span>
                  </div>

                  {/* Latest Data Table */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-mono text-[11px]">
                        <tr>
                          <th className="py-2.5 px-4">Item Name</th>
                          <th className="py-2.5 px-4">Key</th>
                          <th className="py-2.5 px-4">Last Check</th>
                          <th className="py-2.5 px-4 text-right">Latest Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-sans">
                        {filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-zinc-500">
                              No metrics match your search or no telemetry items assigned to this host.
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((item) => (
                            <tr key={item.itemid} className="hover:bg-zinc-900/40 transition-colors">
                              <td className="py-2.5 px-4 font-medium text-zinc-200">
                                {item.name}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-400">
                                {item.key_}
                              </td>
                              <td className="py-2.5 px-4 text-zinc-500 font-mono text-[10px]">
                                {item.lastclock ? new Date(parseInt(item.lastclock) * 1000).toLocaleTimeString() : 'N/A'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-semibold text-emerald-400">
                                {item.lastvalue !== null && item.lastvalue !== undefined ? (
                                  <span>
                                    {item.lastvalue} {item.units || ''}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600 font-normal">--</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: CUSTOM INVENTORY (POSTGRESQL) */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  {/* Action Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div>
                      <h3 className="text-sm font-bold text-white">Dynamic Asset Fields (PostgreSQL JSONB)</h3>
                      <p className="text-xs text-zinc-400">
                        Custom metadata decoupled from Zabbix's rigid inventory table. Fully customizable.
                      </p>
                    </div>
                    {!isEditingInventory ? (
                      <button
                        onClick={() => {
                          setEditFields(data?.custom_fields || {})
                          setIsEditingInventory(true)
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Inventory
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingInventory(false)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={saving}
                          onClick={handleSaveInventory}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Standard Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Brand
                      </span>
                      <span className="font-semibold text-white text-xs">
                        {data?.custom_fields?.['brand'] || data?.manufacturer || 'Generic'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Vendor
                      </span>
                      <span className="font-semibold text-white text-xs">
                        {data?.custom_fields?.['vendor'] || data?.manufacturer || 'Unspecified'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Version / Firmware
                      </span>
                      <span className="font-semibold text-white text-xs">
                        {data?.custom_fields?.['version'] || 'v1.0.0'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Assigned User / Team
                      </span>
                      <span className="font-semibold text-white text-xs">
                        {data?.custom_fields?.['user'] || 'Unassigned'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Hardware Model
                      </span>
                      <span className="font-semibold text-white text-xs">
                        {data?.model || 'Standard 1U'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                        Serial Number
                      </span>
                      <span className="font-mono font-semibold text-white text-xs">
                        {data?.serial_number || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Fields List & Editor */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-zinc-300">All Dynamic Attributes (JSON):</h4>

                    {!isEditingInventory ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {Object.entries(data?.custom_fields || {}).map(([k, v]) => (
                          <div
                            key={k}
                            className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between text-xs"
                          >
                            <span className="font-mono text-zinc-400 font-medium">{k}</span>
                            <span className="font-semibold text-zinc-200">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          {Object.entries(editFields).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-1/3 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300">
                                {k}
                              </span>
                              <input
                                type="text"
                                value={v}
                                onChange={(e) =>
                                  setEditFields((prev) => ({ ...prev, [k]: e.target.value }))
                                }
                                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                              />
                              <button
                                onClick={() => handleRemoveField(k)}
                                className="p-2 text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add New Field Row */}
                        <div className="p-3 rounded-xl bg-zinc-950/50 border border-dashed border-zinc-700 flex flex-col sm:flex-row items-center gap-2 pt-3">
                          <input
                            type="text"
                            placeholder="New Field Name (e.g. warranty_exp)"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            className="w-full sm:w-1/3 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Value (e.g. 2027-12-31)"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="w-full sm:flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={handleAddField}
                            className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-1 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Field
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: TAGS & METADATA */}
              {activeTab === 'tags' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white">Device Tags & Classification</h3>
                  <div className="flex flex-wrap gap-2">
                    {data?.tags && Object.keys(data.tags).length > 0 ? (
                      Object.entries(data.tags).map(([k, v]) => (
                        <div
                          key={k}
                          className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700/80 flex items-center gap-2 text-xs"
                        >
                          <span className="font-mono text-zinc-400">{k}:</span>
                          <span className="font-semibold text-blue-400">{String(v)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-zinc-500">No tags assigned to this host.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
