import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Flame } from 'lucide-react'
import AppReaderShell from './AppReaderShell.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import QuranSearch from './QuranSearch.jsx'
import ProgressDashboard from './ProgressDashboard.jsx'
import Memorize from './Memorize.jsx'
import SurahIndex from './SurahIndex.jsx'
import SurahDetail from './SurahDetail.jsx'
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
  const pathname = window.location.pathname
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  if (isAdminRoute) return <AdminDashboard />
  if (pathname === '/search' || pathname.startsWith('/search/')) return <QuranSearch />
  if (pathname === '/progress' || pathname.startsWith('/progress/')) return <ProgressDashboard />
  if (pathname === '/memorize' || pathname.startsWith('/memorize/')) return <Memorize />
  if (/^\/surah\/\d+\/?$/.test(pathname)) return <SurahDetail />
  if (pathname === '/' || pathname === '') return <><SurahIndex /><ProgressBadge /></>
  return <><AppReaderShell /><ProgressBadge /></>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
)
