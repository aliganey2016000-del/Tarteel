import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Flame, Target, Trophy } from 'lucide-react'
import { getGoals, getStreaks, updateGoal } from './accountApi'
import { streakLabel, summarizeStreak } from './progressUtils.js'
import RecitationPanel from './RecitationPanel.jsx'
import ReaderNavigation from './ReaderNavigation.jsx'

const TOKEN_KEY = 'tarteel:auth-token'
const GOAL_META = {
  MEMORIZE: { label: 'Memorize', unit: 'ayahs', hint: 'New ayahs to learn' },
  REVIEW: { label: 'Review', unit: 'ayahs', hint: 'Saved ayahs to review' },
  RECITE: { label: 'Recite', unit: 'minutes', hint: 'Focused recitation time' }
}

const clampCompleted = (value, target) => Math.min(Math.max(Number(value) || 0, 0), Number(target) || 1)

function GoalCard({ goal, onChange }) {
  const meta = GOAL_META[goal.type] || { label: goal.type, unit: 'units', hint: 'Daily target' }
  const percent = Math.min(100, Math.round((goal.completed / goal.target) * 100))
  const [completed, setCompleted] = useState(String(goal.completed))
  const [target, setTarget] = useState(String(goal.target))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setCompleted(String(goal.completed))
    setTarget(String(goal.target))
  }, [goal.completed, goal.target])

  const save = async (event) => {
    event.preventDefault()
    const nextTarget = Math.min(Math.max(Number(target) || goal.target, 1), 100000)
    const nextCompleted = clampCompleted(completed, nextTarget)
    setBusy(true)
    try {
      const saved = await updateGoal(localStorage.getItem(TOKEN_KEY), goal.type, nextTarget, nextCompleted)
      onChange(saved)
    } finally {
      setBusy(false)
    }
  }

  return <article className="tarteel-card p-5">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm font-bold text-emerald-700">{meta.label}</p><h2 className="mt-1 text-xl font-extrabold tracking-tight">{goal.completed} / {goal.target} {meta.unit}</h2><p className="mt-1 text-xs text-slate-500">{meta.hint}</p></div>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Target size={18}/></span>
    </div>
    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${meta.label} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}><div className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-500 transition-all duration-500" style={{ width: `${percent}%` }}/></div>
    <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-400"><span>0%</span><span>{percent}% complete</span></div>
    <form onSubmit={save} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <label className="text-xs font-medium text-slate-500">Done<input type="number" min="0" max="100000" value={completed} onChange={event => setCompleted(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"/></label>
      <label className="text-xs font-medium text-slate-500">Target<input type="number" min="1" max="100000" value={target} onChange={event => setTarget(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"/></label>
      <button disabled={busy} className="col-span-2 self-end rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-emerald-700/15 transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:opacity-50 sm:col-span-1">{busy ? 'Saving…' : 'Save'}</button>
    </form>
  </article>
}

export default function ProgressDashboard() {
  const token = useMemo(() => localStorage.getItem(TOKEN_KEY) || '', [])
  const [goals, setGoals] = useState([])
  const [streak, setStreak] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return
    Promise.all([getGoals(token), getStreaks(token)]).then(([nextGoals, nextStreak]) => {
      setGoals(nextGoals)
      setStreak(summarizeStreak(nextStreak))
    }).catch(err => setError(err.message || 'Progress is temporarily unavailable')).finally(() => setLoading(false))
  }, [token])

  if (!token) return <><ReaderNavigation /><main className="min-h-screen bg-[#f7faf8] px-4 py-12 lg:ml-[288px]"><div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-lg"><Target className="mx-auto text-emerald-700"/><h1 className="mt-4 text-2xl font-extrabold">Sign in to track progress</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your daily goals and streaks are synced to your Tarteel account.</p><a href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white"><ArrowLeft size={16}/> Back to reader</a></div></main></>

  return <><ReaderNavigation /><main className="min-h-screen bg-[#f7faf8] px-4 py-7 text-slate-900 lg:ml-[288px] sm:px-6 lg:py-10">
    <div className="mx-auto max-w-7xl">
      <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#075e4a] via-[#0b765d] to-[#0d8a6b] p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6"><div><a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 hover:text-white"><ArrowLeft size={16}/> Reader</a><p className="mt-6 text-sm font-semibold text-emerald-100">Learning dashboard</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Your progress, at a glance.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85">Turn small daily sessions into a consistent Quran learning habit.</p></div><div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-md"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-emerald-100"><Flame size={20}/></span><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-100/75">Current streak</p><p className="mt-0.5 text-xl font-extrabold">{streak ? streakLabel(streak.current) : '—'}{streak?.activeToday ? ' · active' : ''}</p></div></div></div></div>
      </header>
      {error && <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
      {loading ? <div className="mt-7 grid gap-4 md:grid-cols-3">{[1,2,3].map(item => <div key={item} className="h-56 animate-pulse rounded-2xl bg-slate-200"/>)}</div> : <>
        <section className="mt-7 grid gap-4 md:grid-cols-3">{goals.map(goal => <GoalCard key={goal.id || goal.type} goal={goal} onChange={saved => setGoals(current => current.map(item => item.type === saved.type ? saved : item))}/>)}</section>
        <section className="mt-6"><RecitationPanel /></section>
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="tarteel-card p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Trophy size={18}/></span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Best streak</p><h2 className="text-xl font-extrabold">{streakLabel(streak?.longest || 0)}</h2></div></div><p className="mt-3 text-sm leading-6 text-slate-500">Keep the habit alive by completing at least one learning activity each day.</p></article>
          <article className="tarteel-card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Active days</p><h2 className="text-xl font-extrabold">{streak?.totalActiveDays ?? 0}</h2></div><Flame className="text-emerald-700"/></div><div className="mt-4 flex flex-wrap gap-1.5" aria-label="Recent active days">{(streak?.recentActivity || []).slice(0, 30).map(day => <span key={day} title={day} className="h-3 w-3 rounded-sm bg-emerald-500"/> )}</div></article>
        </section>
      </>}
    </div>
  </main></>
}
