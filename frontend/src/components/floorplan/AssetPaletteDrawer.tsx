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
    accentColor: '#007AFF',
    badge: '42U',
  },
  {
    id: 'rack-48u-hd',
    name: '48U High-Density GPU',
    totalU: 48,
    rackType: 'high_density',
    description: 'Deep Cabinet for AI / GPU Compute',
    defaultPrefix: 'Rack',
    accentColor: '#af52de',
    badge: '48U',
  },
  {
    id: 'rack-42u-net',
    name: '42U Core Network',
    totalU: 42,
    rackType: 'network',
    description: 'Side-airflow & High Cable Mgmt',
    defaultPrefix: 'Net',
    accentColor: '#007AFF',
    badge: 'NET',
  },
  {
    id: 'rack-24u-edge',
    name: '24U Edge Half Rack',
    totalU: 24,
    rackType: 'edge',
    description: 'Compact Telco / Edge Node Rack',
    defaultPrefix: 'Edge',
    accentColor: '#ff9500',
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
        return <Cpu className="w-4 h-4 text-[#af52de]" />
      case 'network':
        return <Network className="w-4 h-4 text-[#007AFF]" />
      case 'edge':
        return <HardDrive className="w-4 h-4 text-[#ff9500]" />
      case 'server':
      default:
        return <Server className="w-4 h-4 text-[#007AFF]" />
    }
  }

  return (
    <aside
      aria-label="DC Asset Palette"
      className={`absolute top-20 left-4 bottom-6 z-30 flex transition-all duration-300 pointer-events-auto ${
        isCollapsed ? 'w-10' : 'w-72'
      }`}
    >
      <div className="relative flex flex-col w-full h-full rounded-[20px] bg-white/70 backdrop-blur-xl saturate-180 border-[0.5px] border-black/10 shadow-xl overflow-hidden">
        {/* ─── Header & Toggle Button ─────────────────────────────── */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-[0.5px] border-black/10 bg-white/40">
          {!isCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-4 h-4 text-[#007AFF] shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-tight text-[#1D1D1F] uppercase truncate">
                  Model Palette
                </span>
                <span className="text-[10px] text-[#86868B]">
                  Drag & Drop Cabinets
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded-[8px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-black/5 transition-colors cursor-pointer ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand Asset Palette' : 'Collapse Palette'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[#007AFF]" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ─── Collapsed Vertical Indicator ──────────────────────── */}
        {isCollapsed ? (
          <div
            onClick={() => setIsCollapsed(false)}
            className="flex-1 flex flex-col items-center justify-center gap-3 py-4 cursor-pointer hover:bg-black/5 transition-colors"
            title="Click to open Asset Catalog"
          >
            <Server className="w-4 h-4 text-[#007AFF]" />
            <span
              className="text-[10px] font-semibold tracking-widest text-[#86868B] uppercase"
              style={{ writingMode: 'vertical-rl' }}
            >
              MODELS ({ASSET_TEMPLATES.length})
            </span>
          </div>
        ) : (
          /* ─── Expanded Palette Body ───────────────────────────── */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Tab Selector: Templates vs Unplaced */}
            <div className="flex border-b border-[0.5px] border-black/10 bg-black/[0.02]">
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`flex-1 py-2 px-2 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'templates'
                    ? 'text-[#007AFF] border-b-2 border-[#007AFF] bg-white/60'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                <span>Catalog</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/5 text-[#1D1D1F]">
                  {ASSET_TEMPLATES.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('unplaced')}
                className={`flex-1 py-2 px-2 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'unplaced'
                    ? 'text-[#007AFF] border-b-2 border-[#007AFF] bg-white/60'
                    : 'text-[#86868B] hover:text-[#1D1D1F]'
                }`}
              >
                <span>Staging</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/5 text-[#1D1D1F]">
                  {unplacedRacks.length}
                </span>
              </button>
            </div>

            {/* Micro Instruction Tip */}
            <div className="px-3.5 py-2.5 bg-[#007AFF]/5 border-b border-[0.5px] border-black/10 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#007AFF] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[#007AFF] leading-relaxed">
                Click & drag any model onto the 2.5D room grid to snap & place.
              </p>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {activeTab === 'templates' ? (
                /* ─── Standard Cabinet Templates ────────────────── */
                ASSET_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onPointerDown={(e) => onTemplatePointerDown?.(tmpl, e)}
                    className="group relative flex items-center gap-2.5 p-2.5 rounded-[12px] bg-white/70 hover:bg-white border-[0.5px] border-black/10 hover:border-[#007AFF]/50 transition-all cursor-grab active:cursor-grabbing select-none shadow-xs hover:shadow-md"
                  >
                    {/* Drag Grip Handle */}
                    <GripVertical className="w-3.5 h-3.5 text-black/30 group-hover:text-[#007AFF] transition-colors shrink-0" />

                    {/* Isometric Mini Silhouette */}
                    <div className="relative w-9 h-11 rounded-[8px] bg-black/[0.03] border-[0.5px] border-black/10 flex flex-col items-center justify-between p-1 shrink-0 group-hover:border-[#007AFF]/40 transition-colors">
                      <div className="w-full h-1 bg-black/10 rounded-[2px]" />
                      {getTemplateIcon(tmpl.rackType)}
                      <div className="w-full flex justify-between px-0.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        <span className="w-1 h-1 rounded-full bg-[#007AFF]" />
                      </div>
                    </div>

                    {/* Template Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors truncate">
                          {tmpl.name}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded-[6px] text-[9px] font-bold shrink-0 border-[0.5px]"
                          style={{
                            borderColor: `${tmpl.accentColor}40`,
                            color: tmpl.accentColor,
                            backgroundColor: `${tmpl.accentColor}15`,
                          }}
                        >
                          {tmpl.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#86868B] truncate mt-0.5">
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
                      className="group flex items-center gap-2 p-2.5 rounded-[12px] bg-white/70 hover:bg-white border-[0.5px] border-black/10 hover:border-amber-500/50 transition-all cursor-grab active:cursor-grabbing select-none shadow-xs hover:shadow-md"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-black/30 group-hover:text-amber-500 transition-colors shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#1D1D1F] truncate">
                            {rack.name}
                          </span>
                          <span className="text-[10px] text-amber-600 font-semibold">
                            {rack.total_u}U
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#86868B] mt-0.5">
                          <span>{rack.device_count} devices</span>
                          <span>•</span>
                          <span className="uppercase text-emerald-600 font-medium">{rack.status}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-[#86868B]">
                    <Info className="w-6 h-6 text-black/20 mb-2" />
                    <p className="text-xs font-semibold text-[#1D1D1F]">
                      No Unplaced Racks
                    </p>
                    <p className="text-[10px] mt-1 text-[#86868B]">
                      All existing inventory racks have already been deployed to the room floor.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Footer Status Bar */}
            <div className="px-3.5 py-2.5 border-t border-[0.5px] border-black/10 bg-black/[0.02] flex items-center justify-between text-[10px] text-[#86868B]">
              <span>Mode: 2.5D Isometric</span>
              <span className={isDraggingActive ? 'text-amber-600 animate-pulse font-semibold' : 'text-emerald-600 font-semibold'}>
                {isDraggingActive ? 'PLACING...' : 'READY'}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
