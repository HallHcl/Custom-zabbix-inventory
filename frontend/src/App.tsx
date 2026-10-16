import { useState, useEffect } from 'react'
import { Server, Activity, ShieldCheck } from 'lucide-react'

export function App() {
  const [backendHealth, setBackendHealth] = useState<string>('Checking...')

  useEffect(() => {
    fetch('/api/v1/status')
      .then((res) => res.json())
      .then((data) => setBackendHealth(data.status === 'ok' ? 'Online' : 'Error'))
      .catch(() => setBackendHealth('Offline (Backend not started)'))
  }, [])

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-100 font-sans">
      {/* Sidebar Placeholder */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col p-4">
        <div className="flex items-center gap-3 px-2 py-4 border-b border-slate-800">
          <div className="p-2 bg-cyan-600 rounded-lg text-white shadow-lg shadow-cyan-500/30">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold tracking-wider text-white text-lg">DC VISION</h1>
            <p className="text-xs text-slate-400">Data Center Management</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur px-6 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            <span className="text-slate-200 font-medium">Bangkok DC</span> / Room A
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${backendHealth === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-slate-300">Backend: {backendHealth}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <Activity className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Live System Ready</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <section className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/60 shadow-xl backdrop-blur">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-white">Project Initialized (Step 1 Complete)</h2>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                React 19 + Vite + Tailwind CSS + FastAPI Python Foundation is scaffolded successfully.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-slate-500">Frontend Stack</div>
                  <div className="text-cyan-300 font-semibold mt-1">React 19.2 + Vite</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-slate-500">Backend Stack</div>
                  <div className="text-cyan-300 font-semibold mt-1">FastAPI + Asyncpg</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-slate-500">Cache & DB</div>
                  <div className="text-cyan-300 font-semibold mt-1">Redis 7 + PostgreSQL 16</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
