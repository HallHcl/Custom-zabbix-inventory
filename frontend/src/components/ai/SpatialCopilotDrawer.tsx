import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Flame,
  Zap,
  Server,
  ShieldAlert,
  ArrowRight,
  FileText,
  ChevronRight,
  Bot,
  User,
} from 'lucide-react'
import { useTwinStore } from '../../store/useTwinStore'
import { executeCopilotCommand } from '../../api/client'
import { dispatchCopilotAction, type ActionDispatchHandlers } from '../../lib/actionDispatcher'
import type { CopilotCommandResponse, CopilotAction, PlacementRecommendation, KnowledgeSnippet } from '../../types'

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  timestamp: string
  text: string
  actions?: CopilotAction[]
  recommendations?: PlacementRecommendation[]
  knowledgeSnippet?: KnowledgeSnippet | null
}

interface SpatialCopilotDrawerProps extends ActionDispatchHandlers {}

export function SpatialCopilotDrawer({
  onNavigateToRack,
  onOpenProvisioningWizard,
  onOpenBlastRadius,
  onNavigateToTab,
}: SpatialCopilotDrawerProps) {
  const { isCopilotOpen, closeCopilot } = useTwinStore()

  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: "NexusTwin Spatial AI Copilot ready. Ask me to find optimal rack slots, simulate blast-radius failures, fly the 3D camera, or recall datacenter SOPs.",
      actions: [
        {
          type: 'SET_HEATMAP',
          label: 'Thermal Heatmap',
          payload: { mode: 'THERMAL' },
        },
        {
          type: 'SET_HEATMAP',
          label: 'Power Density',
          payload: { mode: 'POWER' },
        },
      ],
    },
  ])

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  if (!isCopilotOpen) return null

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim()
    if (!q || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: q,
    }

    setMessages((prev) => [...prev, userMsg])
    if (!queryText) setInputQuery('')
    setLoading(true)

    try {
      const response: CopilotCommandResponse = await executeCopilotCommand(q)
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.message,
        actions: response.actions,
        recommendations: response.recommendations,
        knowledgeSnippet: response.knowledge_snippet,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ Execution error: ${err?.message || 'Failed to process command'}. Please verify backend status.`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleActionClick = (action: CopilotAction) => {
    dispatchCopilotAction(action, {
      onNavigateToRack,
      onOpenProvisioningWizard,
      onOpenBlastRadius,
      onNavigateToTab,
    })
  }

  const quickPrompts = [
    {
      label: 'Find 2U Dell Slot (500W)',
      icon: Server,
      query: 'Find me a 2U slot for a Dell server with 500W power in Row A',
    },
    {
      label: 'Simulate Outage on SW-TOR',
      icon: ShieldAlert,
      query: 'What happens if SW-TOR-R-A01 fails?',
    },
    {
      label: 'Thermal Heatmap',
      icon: Flame,
      query: 'Show thermal gradient heatmap overlay',
    },
    {
      label: 'CRAC Emergency SOP',
      icon: FileText,
      query: 'What is the emergency protocol for CRAC failure?',
    },
    {
      label: 'Fly to Rack R-A01',
      icon: ChevronRight,
      query: 'Fly to Rack R-A01',
    },
  ]

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-out flex flex-col font-sans select-none ${
        isExpanded
          ? 'bottom-6 right-6 w-[560px] h-[720px] max-w-[95vw] max-h-[90vh]'
          : 'bottom-6 right-6 w-[440px] h-[580px] max-w-[95vw] max-h-[85vh]'
      }`}
      style={{
        background: 'rgba(20, 26, 31, 0.88)',
        backdropFilter: 'blur(24px) saturate(190%)',
        WebkitBackdropFilter: 'blur(24px) saturate(190%)',
        border: '1px solid rgba(139, 215, 209, 0.28)',
        boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.75), 0 0 24px rgba(139, 215, 209, 0.12)',
        borderRadius: '16px',
      }}
    >
      {/* 1. Header with Tesla/Apple Glass Styling */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#394650]/70 bg-gradient-to-r from-[#1b2329]/90 to-[#141a1f]/90 rounded-t-[16px]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#8bd7d1] to-[#caedde] flex items-center justify-center text-[#141a1f] shadow-sm">
            <Sparkles className="w-4 h-4 fill-current animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-tight text-white uppercase">
                NexusTwin AI Copilot
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#142e2b] text-[#8bd7d1] border border-[#2b5d58] text-[9px] font-mono font-bold tracking-wider uppercase">
                Neural DCIM
              </span>
            </div>
            <p className="text-[10px] text-[#85a6b1] font-mono leading-none mt-0.5">
              Spatial Placement • Blast Radius • SOP Runbooks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md hover:bg-[#273139] text-[#85a6b1] hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setMessages([messages[0]])}
            className="p-1.5 rounded-md hover:bg-[#273139] text-[#85a6b1] hover:text-rose-300 transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={closeCopilot}
            className="p-1.5 rounded-md hover:bg-[#273139] text-[#85a6b1] hover:text-white transition-colors cursor-pointer"
            title="Close Copilot (⌘J)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Message Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs font-sans scrollbar-thin scrollbar-thumb-[#394650]"
      >
        {messages.map((m) => {
          const isUser = m.sender === 'user'

          return (
            <div
              key={m.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-6 h-6 rounded-md bg-[#273139] border border-[#50626f] flex items-center justify-center shrink-0 mt-0.5 text-[#8bd7d1]">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div className={`space-y-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Bubble Text */}
                <div
                  className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    isUser
                      ? 'bg-[#8bd7d1] text-[#141a1f] font-medium border-[#caedde] rounded-tr-xs shadow-md'
                      : 'bg-[#1e262c]/90 text-[#caedde] border-[#394650] rounded-tl-xs shadow-sm font-sans'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>

                {/* Generative UI Action Chips */}
                {!isUser && m.actions && m.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {m.actions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleActionClick(act)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#273139] hover:bg-[#34424b] border border-[#50626f] hover:border-[#8bd7d1] text-[11px] font-mono text-[#caedde] hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8bd7d1]" />
                        <span>{act.label}</span>
                        <ArrowRight className="w-3 h-3 text-[#8bd7d1]" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Placement Recommendation Cards */}
                {!isUser && m.recommendations && m.recommendations.length > 0 && (
                  <div className="space-y-2 pt-1 w-full">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#85a6b1] block">
                      Recommended Spatial Placements
                    </span>
                    {m.recommendations.map((rec) => (
                      <div
                        key={rec.rack_id}
                        className="p-2.5 rounded-lg bg-[#192126] border border-[#394650] hover:border-[#8bd7d1] transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-white text-xs">
                              {rec.rack_name}
                            </span>
                            <span className="text-[10px] font-mono text-[#85a6b1]">
                              ({rec.row_name})
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-[#34424b] text-[#caedde] text-[10px] font-mono font-bold border border-[#50626f]">
                              Slot U{rec.recommended_start_u} ({rec.u_height}U)
                            </span>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black border ${
                              rec.composite_score >= 80
                                ? 'bg-[#142e2b] text-[#8bd7d1] border-[#2b5d58]'
                                : rec.composite_score >= 60
                                ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                                : 'bg-rose-950/60 text-rose-300 border-rose-800'
                            }`}
                          >
                            Score: {rec.composite_score}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#85a6b1] leading-tight">
                          {rec.reasoning}
                        </p>

                        <div className="flex items-center justify-between text-[10px] font-mono text-[#caedde] pt-1 border-t border-[#273139]">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            {rec.power_headroom_watts}W Headroom
                          </span>
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-sky-400" />
                            {rec.inlet_temp_c}°C Inlet
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenProvisioningWizard) {
                                onOpenProvisioningWizard(
                                  rec.rack_name,
                                  rec.recommended_start_u,
                                  rec.u_height
                                )
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-[#8bd7d1] hover:bg-[#caedde] text-[#141a1f] font-bold text-[10px] font-mono transition-colors cursor-pointer"
                          >
                            Mount Here
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Knowledge SOP Preview Card */}
                {!isUser && m.knowledgeSnippet && (
                  <div className="p-2.5 rounded-lg bg-[#192126] border border-[#394650] space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#8bd7d1]">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{m.knowledgeSnippet.title}</span>
                      <span className="px-1 py-0.2 rounded bg-[#273139] border border-[#50626f] text-[#85a6b1]">
                        {m.knowledgeSnippet.doc_type}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#caedde] italic bg-[#14191d] p-2 rounded border border-[#273139]">
                      "{m.knowledgeSnippet.content_preview || m.knowledgeSnippet.content}"
                    </p>
                  </div>
                )}

                <span className="text-[9px] text-[#85a6b1] font-mono block px-1">
                  {m.timestamp}
                </span>
              </div>

              {isUser && (
                <div className="w-6 h-6 rounded-md bg-[#8bd7d1]/20 border border-[#8bd7d1]/50 flex items-center justify-center shrink-0 mt-0.5 text-[#8bd7d1]">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="flex items-center gap-2 text-xs font-mono text-[#8bd7d1] py-1">
            <div className="w-2 h-2 rounded-full bg-[#8bd7d1] animate-ping" />
            <span>Analyzing contiguous spatial slots &amp; thermal margins...</span>
          </div>
        )}
      </div>

      {/* 3. Quick Suggestions Chips */}
      <div className="px-3 py-2 border-t border-[#394650]/60 bg-[#161c20]/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {quickPrompts.map((p, idx) => {
          const Icon = p.icon
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(p.query)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#273139] hover:bg-[#34424b] border border-[#394650] hover:border-[#8bd7d1] text-[10px] font-mono text-[#caedde] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              <Icon className="w-3 h-3 text-[#8bd7d1]" />
              <span>{p.label}</span>
            </button>
          )
        })}
      </div>

      {/* 4. Prompt Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
        className="p-3 border-t border-[#394650] bg-[#14191d] rounded-b-[16px] flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask Copilot (e.g. 'Find 2U slot with 600W headroom')..."
            className="w-full bg-[#20282e] border border-[#394650] rounded-lg pl-3 pr-8 py-2 text-xs text-[#caedde] placeholder:text-[#85a6b1] font-mono focus:outline-none focus:border-[#8bd7d1] transition-colors"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[#85a6b1] bg-[#14191d] px-1 py-0.2 rounded border border-[#394650]">
            ↵
          </kbd>
        </div>

        <button
          type="submit"
          disabled={!inputQuery.trim() || loading}
          className="p-2 rounded-lg bg-[#8bd7d1] hover:bg-[#caedde] disabled:opacity-40 disabled:cursor-not-allowed text-[#141a1f] transition-colors cursor-pointer shadow-xs shrink-0"
          title="Send Command"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
