import { useState } from 'react'
import {
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react'
import { useTwinStore } from '../../store/useTwinStore'
import { fetchZabbixStatus } from '../../api/client'

export function ZabbixConnectionBanner() {
  const zabbixStatus = useTwinStore((state) => state.zabbixStatus)
  const setZabbixStatus = useTwinStore((state) => state.setZabbixStatus)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  // Only display when status is STALE, DISCONNECTED, or ERROR and not dismissed
  if (!zabbixStatus || zabbixStatus.status === 'CONNECTED' || isDismissed) {
    return null
  }

  const isDisconnected = zabbixStatus.status === 'DISCONNECTED' || zabbixStatus.status === 'ERROR'

  const handleRetry = async () => {
    try {
      setIsRetrying(true)
      const latest = await fetchZabbixStatus()
      setZabbixStatus(latest)
    } catch (err) {
      console.warn('Failed to reconnect to Zabbix:', err)
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div
      role="alert"
      className={`relative z-20 px-4 py-2.5 border-b text-xs font-mono transition-all duration-200 select-none ${
        isDisconnected
          ? 'bg-rose-950/80 border-rose-700/80 text-rose-200'
          : 'bg-amber-950/80 border-amber-700/80 text-amber-200'
      }`}
    >
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Status Icon and Explanatory Message */}
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="mt-0.5 sm:mt-0 shrink-0">
            {isDisconnected ? (
              <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="min-w-0">
            <span className="font-bold uppercase tracking-wider mr-2">
              {isDisconnected ? 'Zabbix 7.0 Connection Offline:' : 'Zabbix Telemetry Stale:'}
            </span>
            <span className="opacity-90">
              {zabbixStatus.message || (isDisconnected ? 'Connection to Zabbix API failed.' : 'Synchronization delayed.')}
            </span>
            <span className="hidden md:inline ml-2 text-[11px] opacity-75">
              (Hardware inventory &amp; rack positions remain fully active from PostgreSQL)
            </span>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {zabbixStatus.zabbix_web_console_url && (
            <a
              href={zabbixStatus.zabbix_web_console_url}
              target="_blank"
              rel="noreferrer"
              className={`px-2.5 py-1 rounded-[2px] border text-[11px] font-bold flex items-center gap-1 transition-colors ${
                isDisconnected
                  ? 'bg-rose-900/40 hover:bg-rose-900/70 border-rose-700 text-rose-100'
                  : 'bg-amber-900/40 hover:bg-amber-900/70 border-amber-700 text-amber-100'
              }`}
            >
              <span>Zabbix Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className={`px-2.5 py-1 rounded-[2px] border text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 ${
              isDisconnected
                ? 'bg-rose-900/60 hover:bg-rose-800 border-rose-600 text-white'
                : 'bg-amber-900/60 hover:bg-amber-800 border-amber-600 text-white'
            }`}
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Checking...' : 'Retry Sync'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-[2px] opacity-75 hover:opacity-100 transition-opacity cursor-pointer ml-1"
            title="Dismiss notice for this session"
            aria-label="Dismiss alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ZabbixConnectionBanner
