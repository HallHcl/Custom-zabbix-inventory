import { useState } from 'react'
import {
  Server,
  Layers,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Cpu,
  Network,
  HardDrive,
  Info,
  Sparkles,
} from 'lucide-react'
import type { RackSummary } from '../../types'

export interface AssetTemplate {
  id: string
  name: string
  totalU: number
  rackType: 'server' | 'network' | 'edge' | 'high_density'
  description: string
  defaultPrefix: string
  accentColor: string
  badge: string
}

export const ASSET_TEMPLATES: AssetTemplate[] = [
  {
    id: 'rack-42u-std',
    name: '42U Standard Server',
    totalU: 42,
    rackType: 'server',
    description: '19" Dual-PDU Enterprise Cabinet',
    defaultPrefix: 'Rack',
    accentColor: '#8bd7d1',
    badge: '42U',
  },
  {
    id: 'rack-48u-hd',
    name: '48U High-Density GPU',
    totalU: 48,
    rackType: 'high_density',
    description: 'Deep Cabinet for AI / GPU Compute',
    defaultPrefix: 'Rack',
    accentColor: '#a78bfa',
    badge: '48U',
  },
  {
    id: 'rack-42u-net',
    name: '42U Core Network',
    totalU: 42,
    rackType: 'network',
    description: 'Side-airflow & High Cable Mgmt',
    defaultPrefix: 'Net',
    accentColor: '#38bdf8',
    badge: 'NET',
  },
  {
    id: 'rack-24u-edge',
    name: '24U Edge Half Rack',
    totalU: 24,
    rackType: 'edge',
    description: 'Compact Telco / Edge Node Rack',
    defaultPrefix: 'Edge',
    accentColor: '#f59e0b',
    badge: '24U',
  },
]

interface AssetPaletteDrawerProps {
  unplacedRacks?: RackSummary[]
  onTemplatePointerDown?: (template: AssetTemplate, e: React.PointerEvent) => void
  onUnplacedPointerDown?: (rack: RackSummary, e: React.PointerEvent) => void
  isDraggingActive?: boolean
}

export function AssetPaletteDrawer({
  unplacedRacks = [],
  onTemplatePointerDown,
  onUnplacedPointerDown,
  isDraggingActive = false,
}: AssetPaletteDrawerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'templates' | 'unplaced'>('templates')

  const getTemplateIcon = (type: AssetTemplate['rackType']) => {
    switch (type) {
      case 'high_density':
        return <Cpu className="w-4 h-4 text-[#a78bfa]" />
      case 'network':
        return <Network className="w-4 h-4 text-[#38bdf8]" />
      case 'edge':
        return <HardDrive className="w-4 h-4 text-[#f59e0b]" />
      case 'server':
      default:
        return <Server className="w-4 h-4 text-[#8bd7d1]" />
    }
  }

  return (
    <aside
      aria-label="DC Asset Palette"
      className={`absolute top-20 left-4 bottom-6 z-30 flex transition-all duration-300 pointer-events-auto ${
        isCollapsed ? 'w-10' : 'w-72'
      }`}
    >
      <div className="relative flex flex-col w-full h-full rounded-[4px] bg-[#1a2228]/95 border border-[#394650] backdrop-blur-md shadow-2xl overflow-hidden">
        {/* ─── Header & Toggle Button ─────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2d3943] bg-[#202930]/90">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-4 h-4 text-[#8bd7d1] shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold tracking-wider text-[#caedde] uppercase truncate">
                  Model Palette
                </span>
                <span className="text-[10px] font-mono text-[#85a6b1]">
                  The Sims Drag & Drop
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded-[2px] text-[#85a6b1] hover:text-[#caedde] hover:bg-[#2c3842] transition-colors cursor-pointer ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand Asset Palette' : 'Collapse Palette'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[#8bd7d1]" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ─── Collapsed Vertical Indicator ──────────────────────── */}
        {isCollapsed ? (
          <div
            onClick={() => setIsCollapsed(false)}
            className="flex-1 flex flex-col items-center justify-center gap-3 py-4 cursor-pointer hover:bg-[#222c34] transition-colors"
            title="Click to open Asset Catalog"
          >
            <Server className="w-4 h-4 text-[#8bd7d1]" />
            <span
              className="text-[10px] font-mono tracking-widest text-[#85a6b1] uppercase"
              style={{ writingMode: 'vertical-rl' }}
            >
              MODELS ({ASSET_TEMPLATES.length})
            </span>
          </div>
        ) : (
          /* ─── Expanded Palette Body ───────────────────────────── */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Tab Selector: Templates vs Unplaced */}
            <div className="flex border-b border-[#2d3943] bg-[#161d22]">
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'templates'
                    ? 'text-[#8bd7d1] border-b-2 border-[#8bd7d1] bg-[#202930]/60'
                    : 'text-[#85a6b1] hover:text-[#caedde]'
                }`}
              >
                <span>Catalog</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#27343e] text-[#8bd7d1]">
                  {ASSET_TEMPLATES.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unplaced')}
                className={`flex-1 py-1.5 px-2 text-[11px] font-mono font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'unplaced'
                    ? 'text-[#8bd7d1] border-b-2 border-[#8bd7d1] bg-[#202930]/60'
                    : 'text-[#85a6b1] hover:text-[#caedde]'
                }`}
              >
                <span>Staging</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#27343e] text-[#caedde]">
                  {unplacedRacks.length}
                </span>
              </button>
            </div>

            {/* Micro Instruction Tip */}
            <div className="px-3 py-2 bg-[#1b252c] border-b border-[#2d3943] flex items-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#8bd7d1] shrink-0 mt-0.5" />
              <p className="text-[10px] font-mono text-[#85a6b1] leading-relaxed">
                Click & drag any model onto the 2.5D room grid to snap & place.
              </p>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
              {activeTab === 'templates' ? (
                /* ─── Standard Cabinet Templates ────────────────── */
                ASSET_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onPointerDown={(e) => onTemplatePointerDown?.(tmpl, e)}
                    className="group relative flex items-center gap-2.5 p-2 rounded-[3px] bg-[#202930] hover:bg-[#28343e] border border-[#2d3a44] hover:border-[#8bd7d1]/60 transition-all cursor-grab active:cursor-grabbing select-none shadow-sm hover:shadow-md"
                  >
                    {/* Drag Grip Handle */}
                    <GripVertical className="w-3.5 h-3.5 text-[#506371] group-hover:text-[#8bd7d1] transition-colors shrink-0" />

                    {/* Isometric Mini Silhouette */}
                    <div className="relative w-9 h-11 rounded-[2px] bg-[#151c20] border border-[#394650] flex flex-col items-center justify-between p-1 shrink-0 group-hover:border-[#8bd7d1]/40 transition-colors">
                      <div className="w-full h-1 bg-[#283540] rounded-[1px]" />
                      {getTemplateIcon(tmpl.rackType)}
                      <div className="w-full flex justify-between px-0.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                        <span className="w-1 h-1 rounded-full bg-cyan-400" />
                      </div>
                    </div>

                    {/* Template Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-mono font-bold text-[#caedde] group-hover:text-[#8bd7d1] transition-colors truncate">
                          {tmpl.name}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold shrink-0 border"
                          style={{
                            borderColor: `${tmpl.accentColor}40`,
                            color: tmpl.accentColor,
                            backgroundColor: `${tmpl.accentColor}15`,
                          }}
                        >
                          {tmpl.badge}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-[#85a6b1] truncate mt-0.5">
                        {tmpl.description}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                /* ─── Unplaced / Staged Racks ───────────────────── */
                unplacedRacks.length > 0 ? (
                  unplacedRacks.map((rack) => (
                    <div
                      key={rack.id}
                      onPointerDown={(e) => onUnplacedPointerDown?.(rack, e)}
                      className="group flex items-center gap-2 p-2 rounded-[3px] bg-[#202930] hover:bg-[#28343e] border border-[#2d3a44] hover:border-amber-500/60 transition-all cursor-grab active:cursor-grabbing select-none"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-[#506371] group-hover:text-amber-400 transition-colors shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#caedde] truncate">
                            {rack.name}
                          </span>
                          <span className="text-[10px] font-mono text-amber-400 font-semibold">
                            {rack.total_u}U
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-[#85a6b1] mt-0.5">
                          <span>{rack.device_count} devices</span>
                          <span>•</span>
                          <span className="uppercase text-emerald-400">{rack.status}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-[#85a6b1]">
                    <Info className="w-6 h-6 text-[#506371] mb-2" />
                    <p className="text-xs font-mono font-semibold text-[#caedde]">
                      No Unplaced Racks
                    </p>
                    <p className="text-[10px] font-mono mt-1 text-[#85a6b1]/70">
                      All existing inventory racks have already been deployed to the room floor.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Footer Status Bar */}
            <div className="px-3 py-2 border-t border-[#2d3943] bg-[#161d22] flex items-center justify-between text-[10px] font-mono text-[#85a6b1]">
              <span>Mode: 2.5D Isometric</span>
              <span className={isDraggingActive ? 'text-amber-400 animate-pulse font-bold' : 'text-emerald-400'}>
                {isDraggingActive ? 'PLACING...' : 'READY'}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
