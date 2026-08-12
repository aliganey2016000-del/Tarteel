import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Flame, Target, Trophy } from 'lucide-react'
import { getGoals, getStreaks, updateGoal } from './accountApi'
import { streakLabel, summarizeStreak } from './progressUtils.js'
import RecitationPanel from './RecitationPanel.jsx'

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

  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm font-semibold text-emerald-700">{meta.label}</p><h2 className="mt-1 text-xl font-bold">{goal.completed} / {goal.target} {meta.unit}</h2><p className="mt-1 text-xs text-slate-500">{meta.hint}</p></div>
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Target size={18}/></span>
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${meta.label} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${percent}%` }}/></div>
    <form onSubmit={save} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <label className="text-xs text-slate-500">Done<input type="number" min="0" max="100000" value={completed} onChange={event => setCompleted(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"/></label>
      <label className="text-xs text-slate-500">Target<input type="number" min="1" max="100000" value={target} onChange={event => setTarget(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"/></label>
      <button disabled={busy} className="col-span-2 self-end rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-1">{busy ? 'Saving…' : 'Save'}</button>
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

  if (!token) return <main className="min-h-screen bg-[#f7faf8] px-4 py-12"><div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><Target className="mx-auto text-emerald-700"/><h1 className="mt-4 text-2xl font-bold">Sign in to track progress</h1><p className="mt-2 text-sm leading-6 text-slate-500">Your daily goals and streaks are synced to your Tarteel account.</p><a href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><ArrowLeft size={16}/> Back to reader</a></div></main>

  return <main className="min-h-screen bg-[#f7faf8] px-4 py-8 text-slate-900 sm:px-6 lg:py-12">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><ArrowLeft size={16}/> Reader</a><p className="mt-5 text-sm font-semibold text-emerald-700">Learning dashboard</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Goals, progress & streaks</h1></div><div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Flame size={19}/></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current streak</p><p className="font-bold">{streak ? streakLabel(streak.current) : '—'}{streak?.activeToday ? ' · active' : ''}</p></div></div></div></header>
      {error && <div role="alert" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
      {loading ? <div className="mt-7 grid gap-4 md:grid-cols-3">{[1,2,3].map(item => <div key={item} className="h-52 animate-pulse rounded-2xl bg-slate-200"/>)}</div> : <>
        <section className="mt-7 grid gap-4 md:grid-cols-3">{goals.map(goal => <GoalCard key={goal.id || goal.type} goal={goal} onChange={saved => setGoals(current => current.map(item => item.type === saved.type ? saved : item))}/>)}</section>
        <section className="mt-6">
          <RecitationPanel />
        </section>
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Trophy size={18}/></span><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Best streak</p><h2 className="text-xl font-bold">{streakLabel(streak?.longest || 0)}</h2></div></div><p className="mt-3 text-sm leading-6 text-slate-500">Keep the habit alive by completing at least one learning activity each day.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active days</p><h2 className="text-xl font-bold">{streak?.totalActiveDays ?? 0}</h2></div><Flame className="text-emerald-700"/></div><div className="mt-4 flex flex-wrap gap-1.5" aria-label="Recent active days">{(streak?.recentActivity || []).slice(0, 30).map(day => <span key={day} title={day} className="h-3 w-3 rounded-sm bg-emerald-500"/> )}</div></article>
        </section>
      </>}
    </div>
  </main>
}
