import { useState, useEffect, useMemo } from 'react'
import {
  Network,
  Plus,
  Trash2,
  Search,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react'
import type { Subnet, SubnetCreate, SubnetIPDetail } from '../../types'
import { fetchSubnets, createSubnet, deleteSubnet, fetchSubnetIPs } from '../../api/client'

export function IPAMView() {
  const [subnets, setSubnets] = useState<Subnet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Selected subnet for grid view
  const [selectedSubnetId, setSelectedSubnetId] = useState<any>(null)
  const [ipList, setIpList] = useState<SubnetIPDetail[]>([])
  const [gridLoading, setGridLoading] = useState(false)
  const [gridError, setGridError] = useState<string | null>(null)

  // Filter & Search inside Subnet Grid
  const [statusFilter, setStatusFilter] = useState<'all' | 'allocated' | 'gateway' | 'available'>('all')
  const [ipSearch, setIpSearch] = useState('')

  // Selected IP for detail inspect card
  const [inspectIP, setInspectIP] = useState<SubnetIPDetail | null>(null)

  // Add Subnet Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newCidr, setNewCidr] = useState('')
  const [newName, setNewName] = useState('')
  const [newGateway, setNewGateway] = useState('')
  const [newVlan, setNewVlan] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const selectedSubnet = useMemo(() => {
    return subnets.find((s) => s.id === selectedSubnetId) || null
  }, [subnets, selectedSubnetId])

  const loadSubnets = async (selectId?: any) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSubnets()
      setSubnets(data)
      if (data.length > 0) {
        const targetId = selectId || selectedSubnetId || data[0].id
        setSelectedSubnetId(targetId)
        loadSubnetGrid(targetId)
      } else {
        setSelectedSubnetId(null)
        setIpList([])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load subnets')
    } finally {
      setLoading(false)
    }
  }

  const loadSubnetGrid = async (subnetId: any) => {
    setGridLoading(true)
    setGridError(null)
    try {
      const data = await fetchSubnetIPs(subnetId)
      setIpList(data)
      if (data.length > 0) {
        const firstAlloc =
          data.find((i) => i.status === 'assigned' || i.status === 'zabbix_monitored') ||
          data[0]
        setInspectIP(firstAlloc)
      } else {
        setInspectIP(null)
      }
    } catch (err: any) {
      setGridError(err.message || 'Failed to load IP grid')
    } finally {
      setGridLoading(false)
    }
  }

  useEffect(() => {
    loadSubnets()
  }, [])

  const handleSelectSubnet = (subnet: Subnet) => {
    setSelectedSubnetId(subnet.id)
    loadSubnetGrid(subnet.id)
  }

  const handleDeleteSubnet = async (subnet: Subnet, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Delete subnet "${subnet.name}" (${subnet.cidr})?`)) return
    try {
      await deleteSubnet(subnet.id)
      const nextSubnets = subnets.filter((s) => s.id !== subnet.id)
      setSubnets(nextSubnets)
      if (selectedSubnetId === subnet.id) {
        if (nextSubnets.length > 0) {
          handleSelectSubnet(nextSubnets[0])
        } else {
          setSelectedSubnetId(null)
          setIpList([])
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete subnet')
    }
  }

  const handleCreateSubnetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)

    const payload: SubnetCreate = {
      cidr: newCidr.trim(),
      name: newName.trim(),
      gateway: newGateway.trim() || undefined,
      vlan_id: newVlan ? Number(newVlan) : undefined,
      description: newDesc.trim() || undefined,
    }

    try {
      const created = await createSubnet(payload)
      setIsAddModalOpen(false)
      setNewCidr('')
      setNewName('')
      setNewGateway('')
      setNewVlan('')
      setNewDesc('')
      await loadSubnets(created.id)
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create subnet')
    } finally {
      setCreateLoading(false)
    }
  }

  // Filtered IPs
  const filteredIPs = useMemo(() => {
    return ipList.filter((ip) => {
      const isAllocated = ip.status === 'assigned' || ip.status === 'zabbix_monitored'
      const isGateway = ip.status === 'gateway' || ip.is_gateway
      const isAvailable = ip.status === 'available'

      if (statusFilter === 'allocated' && !isAllocated) return false
      if (statusFilter === 'gateway' && !isGateway) return false
      if (statusFilter === 'available' && !isAvailable) return false

      if (!ipSearch) return true
      const q = ipSearch.toLowerCase()
      return (
        ip.ip.includes(q) ||
        (ip.device_name && ip.device_name.toLowerCase().includes(q))
      )
    })
  }, [ipList, statusFilter, ipSearch])

  // Summary Metrics
  const totalSubnets = subnets.length
  const totalMonitoredIPs = subnets.reduce((acc, s) => acc + s.used_ips, 0)
  const totalCapacityIPs = subnets.reduce((acc, s) => acc + s.total_ips, 0)
  const avgUtilization =
    totalCapacityIPs > 0 ? ((totalMonitoredIPs / totalCapacityIPs) * 100).toFixed(1) : '0'

  const getProgressBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-rose-500'
    if (pct >= 70) return 'bg-amber-500'
    return 'bg-[#0071E3]'
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 select-none font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',sans-serif] text-[#1d1d1f]">
      {/* Apple macOS Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b-[0.5px] border-black/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-semibold tracking-[-0.022em] text-[#1d1d1f] leading-tight">
              IP Address Management
            </h1>
            <span className="rounded-[8px] px-2.5 py-1 text-[11px] font-medium bg-black/[0.04] text-zinc-700 border-[0.5px] border-black/10 tracking-[-0.011em]">
              {totalSubnets} Subnets • {totalMonitoredIPs} Allocated
            </span>
          </div>
          <p className="text-[13px] text-zinc-500 tracking-[-0.011em] mt-1">
            Subnet CIDR Allocation, Default Gateways &amp; Zabbix Monitored IP Cross-Referencing
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError(null)
            setIsAddModalOpen(true)
          }}
          className="h-[40px] px-4 rounded-[12px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-semibold flex items-center gap-2 shadow-sm shadow-[#0071E3]/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.96] cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subnet</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Total Subnets Managed
          </div>
          <div className="text-2xl font-bold text-[#1d1d1f] mt-1">{totalSubnets}</div>
          <div className="text-xs text-zinc-500 mt-1">Configured CIDR Blocks</div>
        </div>

        <div className="p-4 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Active Allocated IPs
          </div>
          <div className="text-2xl font-bold text-[#0071E3] mt-1">
            {totalMonitoredIPs}{' '}
            <span className="text-xs text-zinc-500 font-normal">/ {totalCapacityIPs} IPs</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Linked to DCIM Hardware &amp; Zabbix
          </div>
        </div>

        <div className="p-4 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            Overall Pool Utilization
          </div>
          <div className="text-2xl font-bold text-[#1d1d1f] mt-1">
            {avgUtilization}%
          </div>
          <div className="w-full bg-black/[0.05] h-2 rounded-full overflow-hidden mt-2 border-[0.5px] border-black/5">
            <div
              className={`h-full ${getProgressBarColor(Number(avgUtilization))}`}
              style={{ width: `${Math.min(100, Number(avgUtilization))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Subnet Master List (Left 1/3) + Interactive IP Allocation Grid (Right 2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Subnets Master List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
            <span className="uppercase tracking-wider text-[11px] font-semibold">Configured Subnets</span>
            <span className="font-medium">{subnets.length} CIDR</span>
          </div>

          {error && (
            <div className="p-3.5 rounded-[12px] bg-rose-50 border-[0.5px] border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="p-10 text-center text-xs text-zinc-500">
              Loading subnets...
            </div>
          ) : subnets.length === 0 ? (
            <div className="p-8 rounded-[16px] bg-white/75 backdrop-blur-xl border-[0.5px] border-black/10 shadow-xs text-center text-xs text-zinc-500 space-y-2">
              <Network className="w-7 h-7 mx-auto text-[#0071E3] opacity-80" />
              <div className="font-semibold text-[#1d1d1f]">No subnets defined yet</div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="text-[#0071E3] hover:underline font-semibold"
              >
                Create your first subnet
              </button>
            </div>
          ) : (
            subnets.map((sub) => {
              const isSelected = selectedSubnetId === sub.id
              return (
                <div
                  key={sub.id}
                  onClick={() => handleSelectSubnet(sub)}
                  className={`p-3.5 rounded-[14px] border-[0.5px] cursor-pointer transition-all shadow-xs ${
                    isSelected
                      ? 'bg-white border-[#0071E3] ring-2 ring-[#0071E3]/20 shadow-sm'
                      : 'bg-white/75 hover:bg-white border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1d1d1f] text-xs font-mono">{sub.cidr}</span>
                        {sub.vlan_id && (
                          <span className="px-2 py-0.5 rounded-[6px] bg-black/[0.04] border-[0.5px] border-black/10 text-[10px] font-medium text-zinc-700">
                            VLAN {sub.vlan_id}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-600 font-medium mt-1">{sub.name}</div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSubnet(sub, e)}
                      title="Delete Subnet"
                      className="text-zinc-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {sub.gateway && (
                    <div className="text-[11px] text-zinc-500 mt-2 font-mono">
                      Gateway: <span className="text-[#1d1d1f] font-medium">{sub.gateway}</span>
                    </div>
                  )}

                  {/* Utilization Bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex justify-between text-[11px] text-zinc-500">
                      <span>{sub.used_ips} / {sub.total_ips} Allocated</span>
                      <span className="font-bold text-[#1d1d1f]">{sub.utilization_percent}%</span>
                    </div>
                    <div className="w-full bg-black/[0.05] h-1.5 rounded-full overflow-hidden border-[0.5px] border-black/5">
                      <div
                        className={`h-full ${getProgressBarColor(sub.utilization_percent)}`}
                        style={{ width: `${Math.min(100, sub.utilization_percent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: IP Allocation Grid Map */}
        <div className="lg:col-span-8 space-y-4">
          {gridLoading ? (
            <div className="p-16 rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm text-center text-xs text-zinc-500 space-y-2">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#0071E3]" />
              <div>Loading IP address allocation grid...</div>
            </div>
          ) : gridError ? (
            <div className="p-8 rounded-[20px] bg-rose-50 border-[0.5px] border-rose-200 text-center text-xs text-rose-800 space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
              <div>{gridError}</div>
            </div>
          ) : selectedSubnet ? (
            <div className="rounded-[20px] bg-white/75 backdrop-blur-2xl saturate-180 border-[0.5px] border-black/10 shadow-sm p-6 space-y-5">
              {/* Grid Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-[0.5px] border-black/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#1d1d1f] text-base font-mono">
                      {selectedSubnet.name} ({selectedSubnet.cidr})
                    </h3>
                    {selectedSubnet.vlan_id && (
                      <span className="px-2 py-0.5 rounded-[6px] bg-black/[0.04] border-[0.5px] border-black/10 text-[10px] font-medium text-zinc-700">
                        VLAN {selectedSubnet.vlan_id}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Gateway: {selectedSubnet.gateway || 'None'} • {selectedSubnet.used_ips} of{' '}
                    {selectedSubnet.total_ips} IPs In Use ({selectedSubnet.utilization_percent}%)
                  </div>
                </div>

                {/* Legend & Filter Controls */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={ipSearch}
                      onChange={(e) => setIpSearch(e.target.value)}
                      placeholder="Search IP / Host..."
                      className="w-full h-[34px] bg-black/[0.04] border-[0.5px] border-black/10 rounded-[10px] pl-8 pr-3 text-xs text-[#1d1d1f] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="h-[34px] bg-black/[0.04] border-[0.5px] border-black/10 rounded-[10px] px-3 text-xs text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 cursor-pointer"
                  >
                    <option value="all">All IPs ({ipList.length})</option>
                    <option value="allocated">Allocated ({selectedSubnet.used_ips})</option>
                    <option value="gateway">Gateway</option>
                    <option value="available">
                      Free ({selectedSubnet.total_ips - selectedSubnet.used_ips})
                    </option>
                  </select>
                </div>
              </div>

              {/* Legend Badges */}
              <div className="flex items-center gap-4 text-xs text-zinc-600 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-sky-500" />
                  <span>Gateway</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-[#0071E3]" />
                  <span>Monitored / Allocated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[3px] bg-black/[0.08] border-[0.5px] border-black/10" />
                  <span>Available / Free</span>
                </div>
              </div>

              {/* High-Density IP Matrix (Squares) */}
              <div className="p-4 bg-black/[0.02] border-[0.5px] border-black/10 rounded-[14px]">
                <div className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wider font-semibold">
                  Host Allocation Map ({ipList.length} Host Addresses)
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-16 md:grid-cols-24 lg:grid-cols-32 gap-1.5 max-h-56 overflow-y-auto p-1">
                  {ipList.map((ipObj) => {
                    const isInspect = inspectIP?.ip === ipObj.ip
                    const isGw = ipObj.status === 'gateway' || ipObj.is_gateway
                    const isAlloc = ipObj.status === 'assigned' || ipObj.status === 'zabbix_monitored'

                    let bg = 'bg-white hover:bg-black/[0.04] text-zinc-500 border-[0.5px] border-black/10'
                    if (isGw) {
                      bg = 'bg-sky-500 text-white font-bold'
                    } else if (isAlloc) {
                      bg = 'bg-[#0071E3] text-white font-bold'
                    }

                    const lastOctet = ipObj.ip.split('.').pop()

                    return (
                      <button
                        key={ipObj.ip}
                        type="button"
                        onClick={() => setInspectIP(ipObj)}
                        title={`${ipObj.ip} • ${ipObj.status.toUpperCase()}${
                          ipObj.device_name ? ` (${ipObj.device_name})` : ''
                        }`}
                        className={`h-6 w-full rounded-[4px] text-[9.5px] font-mono flex items-center justify-center transition-all cursor-pointer ${bg} ${
                          isInspect ? 'ring-2 ring-[#0071E3] scale-110 shadow-sm z-10' : ''
                        }`}
                      >
                        {lastOctet}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* IP Inspection Card */}
              {inspectIP && (
                <div className="p-4 rounded-[14px] bg-white border-[0.5px] border-black/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-[#1d1d1f] text-sm font-mono">{inspectIP.ip}</span>
                      <span
                        className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase ${
                          inspectIP.status === 'gateway' || inspectIP.is_gateway
                            ? 'bg-sky-50 text-sky-800 border-[0.5px] border-sky-200'
                            : inspectIP.status === 'assigned' || inspectIP.status === 'zabbix_monitored'
                            ? 'bg-emerald-50 text-emerald-800 border-[0.5px] border-emerald-200'
                            : 'bg-black/[0.04] text-zinc-600 border-[0.5px] border-black/10'
                        }`}
                      >
                        {inspectIP.status}
                      </span>
                    </div>

                    {inspectIP.device_name ? (
                      <div className="flex items-center gap-3 text-xs text-zinc-700">
                        <span>
                          Equipment: <strong className="text-[#1d1d1f]">{inspectIP.device_name}</strong>
                        </span>
                        {inspectIP.zabbix_host_id && (
                          <span className="text-[#0071E3] font-medium">
                            Zabbix Host ID: {inspectIP.zabbix_host_id}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-500">
                        {inspectIP.status === 'gateway' || inspectIP.is_gateway
                          ? 'Designated Network Gateway Interface'
                          : 'Unallocated address available in subnet pool'}
                      </div>
                    )}
                  </div>

                  {inspectIP.device_name && (
                    <div className="text-[11px] text-[#0071E3] font-medium bg-[#0071E3]/10 px-3 py-1 rounded-[8px] border-[0.5px] border-[#0071E3]/20">
                      Synchronized via CMDB &amp; Zabbix API
                    </div>
                  )}
                </div>
              )}

              {/* Filtered IP List Table */}
              <div className="rounded-[14px] border-[0.5px] border-black/10 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/[0.02] border-b-[0.5px] border-black/10 text-zinc-500 uppercase tracking-wider text-[11px] font-semibold select-none">
                    <tr>
                      <th className="py-3 px-4 font-semibold">IP Address</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Assigned Hardware</th>
                      <th className="py-3 px-4 font-semibold">Zabbix Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[0.5px] divide-black/5 bg-white">
                    {filteredIPs.slice(0, 50).map((ipObj) => {
                      const isGw = ipObj.status === 'gateway' || ipObj.is_gateway
                      const isAlloc = ipObj.status === 'assigned' || ipObj.status === 'zabbix_monitored'

                      return (
                        <tr
                          key={ipObj.ip}
                          onClick={() => setInspectIP(ipObj)}
                          className={`hover:bg-black/[0.02] cursor-pointer transition-colors ${
                            inspectIP?.ip === ipObj.ip ? 'bg-black/[0.03]' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-semibold text-[#1d1d1f] font-mono">{ipObj.ip}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-[6px] text-[10px] uppercase font-bold ${
                                isGw
                                  ? 'bg-sky-50 text-sky-800 border-[0.5px] border-sky-200'
                                  : isAlloc
                                  ? 'bg-emerald-50 text-emerald-800 border-[0.5px] border-emerald-200'
                                  : 'bg-black/[0.04] text-zinc-600 border-[0.5px] border-black/10'
                              }`}
                            >
                              {ipObj.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-700">
                            {ipObj.device_name || <span className="text-zinc-400">—</span>}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-[#0071E3] font-medium">
                            {ipObj.zabbix_host_id ? `Host #${ipObj.zabbix_host_id}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredIPs.length > 50 && (
                  <div className="p-3 bg-black/[0.02] border-t-[0.5px] border-black/10 text-center text-xs text-zinc-500">
                    Showing top 50 of {filteredIPs.length} addresses. Use the search box above to filter.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 rounded-[20px] bg-white/75 backdrop-blur-2xl border-[0.5px] border-black/10 shadow-sm text-center text-xs text-zinc-500">
              Select a subnet to view host allocation matrix
            </div>
          )}
        </div>
      </div>

      {/* Add Subnet Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md select-none">
          <div className="w-full max-w-md rounded-[20px] bg-white border-[0.5px] border-black/10 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b-[0.5px] border-black/10 flex items-center justify-between bg-black/[0.01]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-[8px] bg-[#0071E3]/10 text-[#0071E3]">
                  <Network className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm text-[#1d1d1f]">
                  Add Network Subnet (CIDR)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-black p-1 rounded-[8px] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {createError && (
                <div className="mb-4 p-3 rounded-[10px] bg-rose-50 border-[0.5px] border-rose-200 flex items-center gap-2 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubnetSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Subnet CIDR *</label>
                  <input
                    type="text"
                    required
                    value={newCidr}
                    onChange={(e) => setNewCidr(e.target.value)}
                    placeholder="e.g. 192.168.10.0/24 or 10.10.0.0/23"
                    className="w-full h-[38px] bg-black/[0.04] border-[0.5px] border-black/10 rounded-[10px] px-3 text-xs text-[#1d1d1f] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Subnet Name / Role *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Storage Network or DMZ Segment"
                    className="w-full h-[38px] bg-black/[0.04] border-[0.5px] border-black/10 rounded-[10px] px-3 text-xs text-[#1d1d1f] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Gateway IP</label>
                    <input
                      type="text"
                      value={newGateway}
                      onChange={(e) => setNewGateway(e.target.value)}
                      placeholder="e.g. 192.168.10.1"
                      className="w-full h-[38px] bg-black/[0.04] border-[0.5px] border-black/10 rounded-[10px] px-3 text-xs text-[#1d1d1f] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">VLAN ID</label>
                    <input
                      type="number"
                      min="1"
                      max="4094"
                      value={newVlan}
                      onChange={(e) => setNewVlan(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full h-[38px] bg-black/[0.04] border-[0.5px] border-black/10 rounded-[10px] px-3 text-xs text-[#1d1d1f] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Production iSCSI and SAN Traffic"
                    className="w-full h-[38px] bg-black/[0.04] border-[0.5px] border-black/10 rounded-[10px] px-3 text-xs text-[#1d1d1f] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3]"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t-[0.5px] border-black/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="h-[38px] px-4 rounded-[10px] bg-black/[0.04] hover:bg-black/[0.08] text-zinc-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="h-[38px] px-4 rounded-[10px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold transition-all shadow-sm shadow-[#0071E3]/25 cursor-pointer disabled:opacity-50"
                  >
                    {createLoading ? 'Creating...' : 'Create Subnet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
