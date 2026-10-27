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
  ExternalLink,
  AlertTriangle,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col noc-panel shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#394650] bg-[#273139]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[#20282f] border border-[#394650] text-[#8bd7d1]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#caedde] font-mono tracking-tight">
                  {data?.device_name || 'Loading Equipment...'}
                </h2>
                <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-[2px] bg-[#20282f] text-[#85a6b1] border border-[#394650]">
                  {data?.device_type || 'Device'}
                </span>
                {data?.zabbix_host_id && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-[2px] bg-[#20282f] text-[#8bd7d1] border border-[#394650]">
                    Zabbix Host #{data.zabbix_host_id}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#85a6b1] font-mono mt-0.5">
                {data?.room_name} / {data?.rack_name} • Slot U{data?.start_u}-U{(data?.start_u || 0) + (data?.height_u || 1) - 1} ({data?.height_u}U, {data?.position_face}) • IP: {data?.ip_address || 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {data?.zabbix_host_id && (
              <div className="flex items-center gap-1.5 mr-2">
                <a
                  href={data.zabbix_web_links?.latest_data_url || `http://192.168.1.85:8080/zabbix.php?action=latest.view&filter_hostids%5B%5D=${data.zabbix_host_id}&filter_set=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded-[2px] bg-[#20282f] hover:bg-[#34424b] border border-[#394650] hover:border-[#8bd7d1] text-[#caedde] text-[11px] font-mono flex items-center gap-1 transition-colors"
                  title="Open in Zabbix Latest Data"
                >
                  <Activity className="w-3 h-3 text-[#8bd7d1]" />
                  <span>Zabbix Latest</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#85a6b1]" />
                </a>
                <a
                  href={data.zabbix_web_links?.problems_url || `http://192.168.1.85:8080/zabbix.php?action=problem.view&filter_hostids%5B%5D=${data.zabbix_host_id}&filter_set=1`}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-2 py-1 rounded-[2px] border text-[11px] font-mono flex items-center gap-1 transition-colors ${
                    (data.active_alerts?.length || 0) > 0
                      ? 'bg-rose-950/40 border-rose-700/80 text-rose-300 hover:bg-rose-900/50'
                      : 'bg-[#20282f] border-[#394650] text-[#caedde] hover:bg-[#34424b] hover:border-[#8bd7d1]'
                  }`}
                  title="Open in Zabbix Problems View"
                >
                  <AlertTriangle className={`w-3 h-3 ${(data.active_alerts?.length || 0) > 0 ? 'text-rose-400' : 'text-amber-400'}`} />
                  <span>Problems ({data.active_alerts?.length || 0})</span>
                  <ExternalLink className="w-2.5 h-2.5 text-[#85a6b1]" />
                </a>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-[2px] text-[#85a6b1] hover:text-[#caedde] hover:bg-[#34424b] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-4 py-2.5 bg-[#161c20] border-b border-[#394650] text-xs font-mono">
          <div className="flex items-center gap-2 p-2 rounded-[2px] bg-[#20282f] border border-[#394650]">
            <Cpu className="w-3.5 h-3.5 text-[#8bd7d1] shrink-0" />
            <div>
              <span className="text-[9px] text-[#85a6b1] block uppercase tracking-wider">CPU Load</span>
              <span className="font-bold text-[#caedde] text-xs">
                {data?.cpu_utilization !== undefined ? `${data.cpu_utilization}%` : '--'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-[2px] bg-[#20282f] border border-[#394650]">
            <Layers className="w-3.5 h-3.5 text-[#85a6b1] shrink-0" />
            <div>
              <span className="text-[9px] text-[#85a6b1] block uppercase tracking-wider">Memory Used</span>
              <span className="font-bold text-[#caedde] text-xs">
                {data?.memory_utilization !== undefined ? `${data.memory_utilization}%` : '--'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-[2px] bg-[#20282f] border border-[#394650]">
            <Thermometer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div>
              <span className="text-[9px] text-[#85a6b1] block uppercase tracking-wider">Temperature</span>
              <span className="font-bold text-amber-400 text-xs">
                {data?.temperature_c !== undefined ? `${data.temperature_c}°C` : '--'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-[2px] bg-[#20282f] border border-[#394650]">
            <Shield className="w-3.5 h-3.5 text-[#8bd7d1] shrink-0" />
            <div>
              <span className="text-[9px] text-[#85a6b1] block uppercase tracking-wider">Status Trigger</span>
              <span className="font-bold text-[#8bd7d1] text-xs">
                {data?.active_alerts?.length ? `${data.active_alerts.length} Warnings` : 'Nominal (0)'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 pt-2 border-b border-[#394650] bg-[#273139]">
          <button
            onClick={() => setActiveTab('latest_data')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-t-[2px] transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'latest_data'
                ? 'border-[#8bd7d1] text-[#8bd7d1] bg-[#20282f]'
                : 'border-transparent text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            <Activity className="w-3 h-3" />
            Telemetry Metrics (Zabbix 7.0)
            <span className="px-1 py-0.2 rounded-[2px] bg-[#161c20] text-[9px] text-[#85a6b1] font-mono">
              {data?.latest_data_items?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-t-[2px] transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-[#8bd7d1] text-[#8bd7d1] bg-[#20282f]'
                : 'border-transparent text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            <Server className="w-3 h-3" />
            CMDB Extended Inventory
            <span className="px-1 py-0.2 rounded-[2px] bg-[#161c20] text-[9px] text-[#85a6b1] font-mono">
              {Object.keys(data?.custom_fields || {}).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tags')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-t-[2px] transition-colors flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'tags'
                ? 'border-[#8bd7d1] text-[#8bd7d1] bg-[#20282f]'
                : 'border-transparent text-[#85a6b1] hover:text-[#caedde]'
            }`}
          >
            <Tag className="w-3 h-3" />
            Host Tags &amp; Classification
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-[#85a6b1]">
              <Activity className="w-6 h-6 animate-pulse mx-auto mb-2 text-[#8bd7d1]" />
              <p className="text-xs font-mono">Querying real-time telemetry from Zabbix JSON-RPC...</p>
            </div>
          ) : error ? (
            <div className="p-3 rounded-[2px] bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono">
              {error}
            </div>
          ) : (
            <>
              {/* TAB 1: LATEST DATA (ZABBIX) */}
              {activeTab === 'latest_data' && (
                <div className="space-y-3">
                  {/* Search Bar for Metrics */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#85a6b1]" />
                      <input
                        type="text"
                        placeholder="Filter metric keys (e.g. cpu, ping, icmp, memory, ifOperStatus)..."
                        value={metricSearch}
                        onChange={(e) => setMetricSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-[#273139] border border-[#394650] rounded-[2px] text-xs font-mono text-[#caedde] placeholder:text-[#85a6b1]/60 focus:outline-none focus:border-[#8bd7d1]"
                      />
                    </div>
                    <span className="text-[11px] text-[#85a6b1] font-mono">
                      Showing {filteredItems.length} of {data?.latest_data_items?.length || 0} items
                    </span>
                  </div>

                  {/* Latest Data Table */}
                  <div className="noc-panel overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#273139] text-[#85a6b1] border-b border-[#394650] text-[10px] uppercase">
                        <tr>
                          <th className="py-2 px-3">Telemetry Metric Name</th>
                          <th className="py-2 px-3">Zabbix Key</th>
                          <th className="py-2 px-3">Last Polled</th>
                          <th className="py-2 px-3 text-right">Latest Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#394650]">
                        {filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-[#85a6b1]/70">
                              No metrics match your search or no items linked in Zabbix.
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((item) => (
                            <tr key={item.itemid} className="hover:bg-[#273139]/50 transition-colors">
                              <td className="py-2 px-3 font-medium text-[#caedde]">
                                {item.name}
                              </td>
                              <td className="py-2 px-3 text-[11px] text-[#85a6b1]">
                                {item.key_}
                              </td>
                              <td className="py-2 px-3 text-[#85a6b1]/70 text-[10px]">
                                {item.lastclock ? new Date(parseInt(item.lastclock) * 1000).toLocaleTimeString() : 'N/A'}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-[#8bd7d1]">
                                {item.lastvalue !== null && item.lastvalue !== undefined ? (
                                  <span>
                                    {item.lastvalue} {item.units || ''}
                                  </span>
                                ) : (
                                  <span className="text-[#85a6b1]/40 font-normal">--</span>
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
                <div className="space-y-4">
                  {/* Action Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#394650]">
                    <div>
                      <h3 className="text-xs font-bold text-[#caedde] font-mono uppercase tracking-wider">Dynamic Asset Attributes (PostgreSQL JSONB)</h3>
                      <p className="text-[11px] text-[#85a6b1] font-mono">
                        Extended DCIM inventory schema decoupled from Zabbix host limitations.
                      </p>
                    </div>
                    {!isEditingInventory ? (
                      <button
                        onClick={() => {
                          setEditFields(data?.custom_fields || {})
                          setIsEditingInventory(true)
                        }}
                        className="px-2.5 py-1 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-xs font-mono font-medium text-[#8bd7d1] flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit Metadata
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingInventory(false)}
                          className="px-2.5 py-1 rounded-[2px] bg-[#273139] hover:bg-[#34424b] border border-[#394650] text-xs font-mono text-[#85a6b1] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={saving}
                          onClick={handleSaveInventory}
                          className="px-2.5 py-1 rounded-[2px] bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-xs font-mono font-bold text-emerald-300 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Save className="w-3 h-3" />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Live Zabbix & Standard Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    <div className="p-2 rounded-[2px] bg-[#20282f] border border-[#394650]">
                      <span className="text-[9px] text-[#85a6b1] uppercase tracking-wider block mb-0.5">
                        Operating System
                      </span>
                      <span className="font-bold text-[#caedde] block truncate" title={data?.zabbix_inventory?.os_full || data?.zabbix_inventory?.os || undefined}>
                        {data?.zabbix_inventory?.os || data?.zabbix_inventory?.os_full || 'Linux (Auto)'}
                      </span>
                      {data?.zabbix_inventory?.os_arch && (
                        <span className="text-[9px] text-[#85a6b1]/80 block">
                          Arch: {data.zabbix_inventory.os_arch}
                        </span>
                      )}
                    </div>

                    <div className="p-2 rounded-[2px] bg-[#20282f] border border-[#394650]">
                      <span className="text-[9px] text-[#85a6b1] uppercase tracking-wider block mb-0.5">
                        Hardware & Vendor
                      </span>
                      <span className="font-bold text-[#caedde] block truncate">
                        {data?.zabbix_inventory?.vendor || data?.manufacturer || 'Standard'} {data?.zabbix_inventory?.hardware_model || data?.model || ''}
                      </span>
                      <span className="text-[9px] text-[#85a6b1]/80 block">
                        Height: {data?.height_u}U
                      </span>
                    </div>

                    <div className="p-2 rounded-[2px] bg-[#20282f] border border-[#394650]">
                      <span className="text-[9px] text-[#85a6b1] uppercase tracking-wider block mb-0.5">
                        Serial Number (S/N)
                      </span>
                      <span className="font-bold text-[#caedde] block truncate">
                        {data?.zabbix_inventory?.serial_number || data?.serial_number || 'N/A'}
                      </span>
                      <span className="text-[9px] text-emerald-400/80 block">
                        {data?.zabbix_inventory?.serial_number ? 'Live Verified' : 'PostgreSQL'}
                      </span>
                    </div>

                    <div className="p-2 rounded-[2px] bg-[#20282f] border border-[#394650]">
                      <span className="text-[9px] text-[#85a6b1] uppercase tracking-wider block mb-0.5">
                        Interface MAC / IP
                      </span>
                      <span className="font-bold text-[#caedde] block truncate">
                        {data?.zabbix_inventory?.mac_address || '52:54:00:...'}
                      </span>
                      <span className="text-[9px] text-[#85a6b1]/80 block">
                        IP: {data?.ip_address || 'Unassigned'}
                      </span>
                    </div>

                    <div className="p-2 rounded-[2px] bg-[#20282f] border border-[#394650]">
                      <span className="text-[9px] text-[#85a6b1] uppercase tracking-wider block mb-0.5">
                        Processor / Cores
                      </span>
                      <span className="font-bold text-[#caedde]">
                        {data?.zabbix_inventory?.cpu_cores ? `${data.zabbix_inventory.cpu_cores} VCPU / Cores` : 'Multi-Core'}
                      </span>
                    </div>

                    <div className="p-2 rounded-[2px] bg-[#20282f] border border-[#394650]">
                      <span className="text-[9px] text-[#85a6b1] uppercase tracking-wider block mb-0.5">
                        Assigned Custodian
                      </span>
                      <span className="font-bold text-[#caedde]">
                        {data?.custom_fields?.['user'] || 'Unassigned'}
                      </span>
                    </div>

                    <div className="p-2 rounded-[2px] bg-[#20282f] border border-[#394650] col-span-2">
                      <span className="text-[9px] text-[#85a6b1] uppercase tracking-wider block mb-0.5">
                        Kernel / System Build
                      </span>
                      <span className="font-bold text-[#caedde] block truncate" title={data?.zabbix_inventory?.kernel || undefined}>
                        {data?.zabbix_inventory?.kernel || 'Linux Kernel Production Release'}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Fields List & Editor */}
                  <div className="space-y-2 font-mono">
                    <h4 className="text-[11px] font-bold text-[#85a6b1] uppercase tracking-wider">Dynamic CMDB Keys:</h4>

                    {!isEditingInventory ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(data?.custom_fields || {}).map(([k, v]) => (
                          <div
                            key={k}
                            className="p-2 rounded-[2px] bg-[#20282f] border border-[#394650] flex items-center justify-between text-xs"
                          >
                            <span className="text-[#85a6b1]">{k}</span>
                            <span className="font-bold text-[#caedde]">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          {Object.entries(editFields).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-1/3 px-2.5 py-1.5 bg-[#161c20] border border-[#394650] rounded-[2px] text-xs text-[#85a6b1]">
                                {k}
                              </span>
                              <input
                                type="text"
                                value={v}
                                onChange={(e) =>
                                  setEditFields((prev) => ({ ...prev, [k]: e.target.value }))
                                }
                                className="flex-1 px-2.5 py-1.5 bg-[#273139] border border-[#394650] rounded-[2px] text-xs text-[#caedde] focus:outline-none focus:border-[#8bd7d1]"
                              />
                              <button
                                onClick={() => handleRemoveField(k)}
                                className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-[2px] transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add New Field Row */}
                        <div className="p-2 rounded-[2px] bg-[#161c20] border border-dashed border-[#394650] flex flex-col sm:flex-row items-center gap-2">
                          <input
                            type="text"
                            placeholder="Attribute Key (e.g. warranty_expiry)"
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            className="w-full sm:w-1/3 px-2.5 py-1 bg-[#273139] border border-[#394650] rounded-[2px] text-xs text-[#caedde] placeholder:text-[#85a6b1]/60 focus:outline-none focus:border-[#8bd7d1]"
                          />
                          <input
                            type="text"
                            placeholder="Value (e.g. 2027-12-31)"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="w-full sm:flex-1 px-2.5 py-1 bg-[#273139] border border-[#394650] rounded-[2px] text-xs text-[#caedde] placeholder:text-[#85a6b1]/60 focus:outline-none focus:border-[#8bd7d1]"
                          />
                          <button
                            onClick={handleAddField}
                            className="w-full sm:w-auto px-2.5 py-1 bg-[#273139] hover:bg-[#34424b] border border-[#394650] rounded-[2px] text-xs font-mono font-medium text-[#8bd7d1] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Add Key
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: TAGS & METADATA */}
              {activeTab === 'tags' && (
                <div className="space-y-3 font-mono">
                  <h3 className="text-xs font-bold text-[#caedde] uppercase tracking-wider">Host Classification &amp; Zabbix Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {data?.tags && Object.keys(data.tags).length > 0 ? (
                      Object.entries(data.tags).map(([k, v]) => (
                        <div
                          key={k}
                          className="px-2 py-1 rounded-[2px] bg-[#20282f] border border-[#394650] flex items-center gap-1.5 text-xs"
                        >
                          <span className="text-[#85a6b1]">{k}:</span>
                          <span className="font-bold text-[#8bd7d1]">{String(v)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#85a6b1]">No tags assigned to this host in Zabbix.</p>
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
