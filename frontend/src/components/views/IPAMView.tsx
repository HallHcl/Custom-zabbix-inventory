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
  const [selectedSubnetId, setSelectedSubnetId] = useState<number | null>(null)
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

  const loadSubnets = async (selectId?: number) => {
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

  const loadSubnetGrid = async (subnetId: number) => {
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
    return 'bg-[#8bd7d1]'
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 select-none">
      {/* Tactical Sub-Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#394650]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white font-sans uppercase">
              IP ADDRESS MANAGEMENT (IPAM LITE)
            </h2>
            <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] font-mono text-[#8bd7d1]">
              {totalSubnets} SUBNETS • {totalMonitoredIPs} ALLOCATED
            </span>
          </div>
          <p className="text-xs text-[#85a6b1] font-mono mt-0.5">
            Subnet CIDR Allocation, Gateways &amp; Zabbix Monitored IP Cross-Referencing
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError(null)
            setIsAddModalOpen(true)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-[#34424b] hover:bg-[#435561] border border-[#8bd7d1] text-xs font-mono text-[#8bd7d1] hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Subnet</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="noc-panel p-3">
          <div className="text-[10px] font-mono text-[#85a6b1] uppercase tracking-wider">
            Total Subnets Managed
          </div>
          <div className="text-xl font-bold font-mono text-white mt-0.5">{totalSubnets}</div>
          <div className="text-[10px] font-mono text-[#85a6b1] mt-1">Configured CIDR Blocks</div>
        </div>

        <div className="noc-panel p-3">
          <div className="text-[10px] font-mono text-[#85a6b1] uppercase tracking-wider">
            Active Allocated IPs
          </div>
          <div className="text-xl font-bold font-mono text-[#8bd7d1] mt-0.5">
            {totalMonitoredIPs}{' '}
            <span className="text-xs text-[#85a6b1] font-normal">/ {totalCapacityIPs} IPs</span>
          </div>
          <div className="text-[10px] font-mono text-[#85a6b1] mt-1">
            Linked to DCIM Hardware &amp; Zabbix
          </div>
        </div>

        <div className="noc-panel p-3">
          <div className="text-[10px] font-mono text-[#85a6b1] uppercase tracking-wider">
            Overall Pool Utilization
          </div>
          <div className="text-xl font-bold font-mono text-[#caedde] mt-0.5">
            {avgUtilization}%
          </div>
          <div className="w-full bg-[#273139] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#394650]">
            <div
              className={`h-full ${getProgressBarColor(Number(avgUtilization))}`}
              style={{ width: `${Math.min(100, Number(avgUtilization))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Subnet Master List (Left 1/3) + Interactive IP Allocation Grid (Right 2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Subnets Master List */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-[#85a6b1] px-1">
            <span className="uppercase tracking-wider text-[10px]">Configured Subnets</span>
            <span>{subnets.length} CIDR</span>
          </div>

          {error && (
            <div className="p-3 rounded-[3px] bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-xs font-mono text-[#85a6b1]">
              Loading subnets...
            </div>
          ) : subnets.length === 0 ? (
            <div className="noc-panel p-6 text-center text-xs font-mono text-[#85a6b1] space-y-2">
              <Network className="w-6 h-6 mx-auto text-[#8bd7d1] opacity-75" />
              <div>No subnets defined yet</div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="text-[#8bd7d1] hover:underline"
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
                  className={`p-3 rounded-[3px] border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#27333d] border-[#8bd7d1] shadow-md'
                      : 'bg-[#20282f] border-[#394650] hover:border-[#50626f]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs font-mono">{sub.cidr}</span>
                        {sub.vlan_id && (
                          <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[9px] font-mono text-[#8bd7d1]">
                            VLAN {sub.vlan_id}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#caedde] font-medium mt-0.5">{sub.name}</div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSubnet(sub, e)}
                      title="Delete Subnet"
                      className="text-[#85a6b1] hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {sub.gateway && (
                    <div className="text-[10px] font-mono text-[#85a6b1] mt-1.5">
                      Gateway: <span className="text-[#caedde]">{sub.gateway}</span>
                    </div>
                  )}

                  {/* Utilization Bar */}
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-[#85a6b1]">
                      <span>{sub.used_ips} / {sub.total_ips} Allocated</span>
                      <span className="font-bold text-[#caedde]">{sub.utilization_percent}%</span>
                    </div>
                    <div className="w-full bg-[#1a2127] h-1.5 rounded-full overflow-hidden border border-[#394650]">
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
        <div className="lg:col-span-8 space-y-3">
          {gridLoading ? (
            <div className="noc-panel p-16 text-center text-xs font-mono text-[#85a6b1] space-y-2">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#8bd7d1]" />
              <div>Loading IP address allocation grid...</div>
            </div>
          ) : gridError ? (
            <div className="noc-panel p-8 text-center text-xs font-mono text-rose-300 space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
              <div>{gridError}</div>
            </div>
          ) : selectedSubnet ? (
            <div className="noc-panel p-4 space-y-4">
              {/* Grid Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#394650]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm font-mono">
                      {selectedSubnet.name} ({selectedSubnet.cidr})
                    </h3>
                    {selectedSubnet.vlan_id && (
                      <span className="px-1.5 py-0.2 rounded-[2px] bg-[#34424b] border border-[#50626f] text-[10px] font-mono text-[#8bd7d1]">
                        VLAN {selectedSubnet.vlan_id}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#85a6b1] font-mono mt-0.5">
                    Gateway: {selectedSubnet.gateway || 'None'} • {selectedSubnet.used_ips} of{' '}
                    {selectedSubnet.total_ips} IPs In Use ({selectedSubnet.utilization_percent}%)
                  </div>
                </div>

                {/* Legend & Filter Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-44">
                    <Search className="w-3.5 h-3.5 text-[#85a6b1] absolute left-2 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={ipSearch}
                      onChange={(e) => setIpSearch(e.target.value)}
                      placeholder="Search IP / Host..."
                      className="w-full bg-[#273139] border border-[#394650] rounded-[2px] pl-7 pr-2 py-1 text-xs text-[#caedde] placeholder:text-[#85a6b1] font-mono focus:outline-none focus:border-[#8bd7d1]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-[#273139] border border-[#394650] rounded-[2px] px-2 py-1 text-xs text-[#caedde] font-mono focus:outline-none focus:border-[#8bd7d1] cursor-pointer"
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
              <div className="flex items-center gap-4 text-[11px] font-mono text-[#85a6b1] pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[1px] bg-sky-500" />
                  <span>Gateway</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[1px] bg-[#8bd7d1]" />
                  <span>Monitored / Allocated</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-[1px] bg-[#2a363f] border border-[#394650]" />
                  <span>Available / Free</span>
                </div>
              </div>

              {/* High-Density IP Matrix (Squares) */}
              <div className="p-3 bg-[#171e23] border border-[#394650] rounded-[3px]">
                <div className="text-[10px] font-mono text-[#85a6b1] mb-2 uppercase tracking-wider">
                  Host Allocation Map ({ipList.length} Host Addresses)
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-16 md:grid-cols-24 lg:grid-cols-32 gap-1 max-h-56 overflow-y-auto p-1">
                  {ipList.map((ipObj) => {
                    const isInspect = inspectIP?.ip === ipObj.ip
                    const isGw = ipObj.status === 'gateway' || ipObj.is_gateway
                    const isAlloc = ipObj.status === 'assigned' || ipObj.status === 'zabbix_monitored'

                    let bg = 'bg-[#253038] hover:bg-[#34424b] text-zinc-500'
                    if (isGw) {
                      bg = 'bg-sky-500 text-black font-bold'
                    } else if (isAlloc) {
                      bg = 'bg-[#8bd7d1] text-black font-bold'
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
                        className={`h-6 w-full rounded-[2px] text-[9px] font-mono flex items-center justify-center transition-all cursor-pointer ${bg} ${
                          isInspect ? 'ring-2 ring-white scale-110 z-10' : ''
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
                <div className="p-3.5 rounded-[3px] bg-[#222d36] border border-[#50626f] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{inspectIP.ip}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-[2px] text-[9px] font-bold uppercase ${
                          inspectIP.status === 'gateway' || inspectIP.is_gateway
                            ? 'bg-sky-950 text-sky-300 border border-sky-700'
                            : inspectIP.status === 'assigned' || inspectIP.status === 'zabbix_monitored'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-[#273139] text-[#85a6b1] border border-[#394650]'
                        }`}
                      >
                        {inspectIP.status}
                      </span>
                    </div>

                    {inspectIP.device_name ? (
                      <div className="flex items-center gap-3 text-[11px] text-[#caedde]">
                        <span>
                          Equipment: <strong>{inspectIP.device_name}</strong>
                        </span>
                        {inspectIP.zabbix_host_id && (
                          <span className="text-[#8bd7d1]">
                            Zabbix Host ID: {inspectIP.zabbix_host_id}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#85a6b1]">
                        {inspectIP.status === 'gateway' || inspectIP.is_gateway
                          ? 'Designated Network Gateway Interface'
                          : 'Unallocated address available in subnet pool'}
                      </div>
                    )}
                  </div>

                  {inspectIP.device_name && (
                    <div className="text-[10px] text-[#8bd7d1] bg-[#1a2127] px-2.5 py-1 rounded-[2px] border border-[#394650]">
                      Synchronized via CMDB &amp; Zabbix API
                    </div>
                  )}
                </div>
              )}

              {/* Filtered IP List Table */}
              <div className="border border-[#394650] rounded-[3px] overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#273139] border-b border-[#394650] text-[#85a6b1] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2 px-3">IP Address</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Assigned Hardware</th>
                      <th className="py-2 px-3">Zabbix Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#394650] bg-[#20282f]">
                    {filteredIPs.slice(0, 50).map((ipObj) => {
                      const isGw = ipObj.status === 'gateway' || ipObj.is_gateway
                      const isAlloc = ipObj.status === 'assigned' || ipObj.status === 'zabbix_monitored'

                      return (
                        <tr
                          key={ipObj.ip}
                          onClick={() => setInspectIP(ipObj)}
                          className={`hover:bg-[#273139] cursor-pointer transition-colors ${
                            inspectIP?.ip === ipObj.ip ? 'bg-[#27333d]' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-white">{ipObj.ip}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.2 rounded-[2px] text-[9px] uppercase font-bold ${
                                isGw
                                  ? 'bg-sky-950 text-sky-300 border border-sky-700'
                                  : isAlloc
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                  : 'bg-[#273139] text-[#85a6b1]'
                              }`}
                            >
                              {ipObj.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#caedde]">
                            {ipObj.device_name || <span className="text-[#85a6b1]">—</span>}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-[#8bd7d1]">
                            {ipObj.zabbix_host_id ? `Host ${ipObj.zabbix_host_id}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredIPs.length > 50 && (
                  <div className="p-2 bg-[#273139] text-center text-[11px] font-mono text-[#85a6b1]">
                    Showing top 50 of {filteredIPs.length} addresses. Use the search box above to filter.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="noc-panel p-12 text-center text-xs font-mono text-[#85a6b1]">
              Select a subnet to view host allocation matrix
            </div>
          )}
        </div>
      </div>

      {/* Add Subnet Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-md noc-panel shadow-2xl relative overflow-hidden">
            <div className="noc-panel-header">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-[#8bd7d1]" />
                <span className="font-mono uppercase tracking-wider text-xs text-white">
                  Add Network Subnet (CIDR)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#85a6b1] hover:text-white p-0.5 rounded-[2px] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {createError && (
                <div className="mb-3 p-2 rounded-[2px] bg-rose-950/60 border border-rose-800 flex items-center gap-2 text-xs font-mono text-rose-300">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubnetSubmit} className="space-y-3 text-xs font-mono">
                <div>
                  <label className="block text-[#caedde] mb-1">Subnet CIDR *</label>
                  <input
                    type="text"
                    required
                    value={newCidr}
                    onChange={(e) => setNewCidr(e.target.value)}
                    placeholder="e.g. 192.168.10.0/24 or 10.10.0.0/23"
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                  />
                </div>

                <div>
                  <label className="block text-[#caedde] mb-1">Subnet Name / Role *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Storage Network or DMZ Segment"
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[#caedde] mb-1">Gateway IP</label>
                    <input
                      type="text"
                      value={newGateway}
                      onChange={(e) => setNewGateway(e.target.value)}
                      placeholder="e.g. 192.168.10.1"
                      className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#caedde] mb-1">VLAN ID</label>
                    <input
                      type="number"
                      min="1"
                      max="4094"
                      value={newVlan}
                      onChange={(e) => setNewVlan(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#caedde] mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Production iSCSI and SAN Traffic"
                    className="w-full bg-[#273139] border border-[#394650] rounded-[2px] px-2.5 py-1.5 text-white placeholder:text-[#85a6b1] focus:outline-none focus:border-[#8bd7d1]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#394650]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 rounded-[2px] bg-[#273139] hover:bg-[#34424b] text-[#85a6b1] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-3 py-1.5 rounded-[2px] bg-[#34424b] hover:bg-[#435561] border border-[#8bd7d1] text-[#8bd7d1] hover:text-white font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
