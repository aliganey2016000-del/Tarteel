import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Flame } from 'lucide-react'
import AppReader from './AppReader'
import AdminDashboard from './AdminDashboard.jsx'
import { getStreaks } from './accountApi'
import { streakLabel, summarizeStreak } from './progressUtils.js'
import './styles.css'

const TOKEN_KEY = 'tarteel:auth-token'

function ProgressBadge() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        setSummary(null)
        return
      }
      getStreaks(token).then((data) => {
        if (!cancelled) setSummary(summarizeStreak(data))
      }).catch(() => {
        if (!cancelled) setSummary(null)
      })
    }
    load()
    const interval = window.setInterval(load, 60_000)
    window.addEventListener('storage', load)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('storage', load)
    }
  }, [])

  if (!summary) return null
  return <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur" aria-label="Reading streak">
    <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Flame size={16}/></span>
    <div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Streak</p><p className="text-sm font-bold text-slate-800">{streakLabel(summary.current)}{summary.activeToday ? ' · active' : ''}</p></div>
    {summary.longest > summary.current && <span className="ml-1 text-[11px] text-slate-400">Best {summary.longest}</span>}
  </div>
}

function Root() {
  const isAdminRoute = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')
  if (isAdminRoute) return <AdminDashboard />
  return <><AppReader /><ProgressBadge /></>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
)
