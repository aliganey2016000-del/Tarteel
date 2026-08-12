import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Eye, EyeOff, RotateCcw, Sparkles } from 'lucide-react'
import { getGoals, updateGoal } from './accountApi.js'
import { getSurah, listSurahs } from './quranApi.js'
import { buildReviewQueue, gradeCard, normalizeCardState } from './memorizeUtils.js'

const STORAGE_KEY = 'tarteel:memorize:v1'
const TOKEN_KEY = 'tarteel:auth-token'

const readState = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
const writeState = state => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {} }
const readToken = () => { try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' } }

const RATING_META = {
  AGAIN: { label: 'Again', hint: 'Review again now', className: 'border-red-200 bg-red-50 text-red-800' },
  HARD: { label: 'Hard', hint: 'Review tomorrow', className: 'border-amber-200 bg-amber-50 text-amber-900' },
  GOOD: { label: 'Good', hint: 'Review in a few days', className: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  EASY: { label: 'Easy', hint: 'Review next week', className: 'border-sky-200 bg-sky-50 text-sky-900' }
}

export default function Memorize() {
  const saved = readState()
  const [catalog, setCatalog] = useState([])
  const [surahNumber, setSurahNumber] = useState(Number(saved.surahNumber) || 1)
  const [surah, setSurah] = useState(null)
  const [states, setStates] = useState(saved.states || {})
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [completedToday, setCompletedToday] = useState(0)

  useEffect(() => {
    listSurahs().then(setCatalog).catch(err => setError(err.message || 'Unable to load Surahs.'))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(''); setRevealed(false)
    getSurah(surahNumber).then(data => { if (!cancelled) setSurah(data) }).catch(err => { if (!cancelled) setError(err.message || 'Unable to load this Surah.') }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [surahNumber])

  const queue = useMemo(() => buildReviewQueue(surah?.ayahs || [], states), [surah, states])
  const current = queue[0] || null
  const currentState = current ? normalizeCardState(states[current.number]) : null

  const persist = nextStates => {
    setStates(nextStates)
    writeState({ surahNumber, states: nextStates })
  }

  const grade = async rating => {
    if (!current) return
    const nextStates = { ...states, [current.number]: gradeCard(currentState, rating) }
    persist(nextStates)
    setRevealed(false)
    setCompletedToday(value => value + 1)

    const token = readToken()
    if (!token) return
    try {
      const goals = await getGoals(token)
      const goal = goals.find(item => item.type === 'MEMORIZE')
      if (goal) await updateGoal(token, 'MEMORIZE', goal.target, Math.min(goal.target, Number(goal.completed || 0) + 1))
    } catch {
      // Local review state remains the source of truth when account sync is unavailable.
    }
  }

  const resetSession = () => {
    const next = { ...states }
    Object.keys(next).forEach(id => { next[id] = { ...next[id], dueAt: 0 } })
    persist(next); setRevealed(false)
  }

  return <div className="min-h-screen bg-[#f7faf8] text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"><ArrowLeft size={17}/> Quran Reader</a>
        <div className="flex items-center gap-2"><Sparkles size={17} className="text-emerald-700"/><span className="font-bold">Memorize</span></div>
        <button onClick={resetSession} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"><RotateCcw size={15}/> Reset due</button>
      </div>
    </header>
    <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:py-10">
      <section className="rounded-[2rem] bg-gradient-to-br from-[#075e4a] to-[#0d8a6b] p-6 text-white shadow-xl sm:p-9">
        <p className="text-sm font-medium text-emerald-100">Focused review · one ayah at a time</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Build reliable memorization.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90">Reveal the ayah only after recalling it, then grade how well you remembered. Reviews are scheduled locally and sync to your Memorize goal when signed in.</p>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[.75fr_1.6fr]">
        <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="memorize-surah">Surah</label>
          <select id="memorize-surah" value={surahNumber} onChange={event => setSurahNumber(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-emerald-500">
            {catalog.map(item => <option key={item.number} value={item.number}>{item.number}. {item.englishName}</option>)}
          </select>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Today</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{completedToday}</p>
            <p className="text-sm text-slate-500">reviews completed this session</p>
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
            <b>{queue.length}</b> due {queue.length === 1 ? 'ayah' : 'ayahs'} in this Surah.
          </div>
        </aside>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {error && <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
          {loading ? <div className="space-y-4"><div className="h-10 animate-pulse rounded-xl bg-slate-100"/><div className="h-64 animate-pulse rounded-2xl bg-slate-100"/></div> : !current ? <div className="py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Check size={25}/></div><h2 className="mt-4 text-2xl font-bold">You are caught up.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">There are no due ayahs in this Surah. Come back when the next review is scheduled, or choose another Surah.</p></div> : <>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-emerald-700">Surah {surah.number} · Ayah {current.numberInSurah}</p><p className="mt-1 text-sm text-slate-500">Review #{currentState.reviews + 1}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">{currentState.intervalDays ? `${currentState.intervalDays} day interval` : 'New card'}</span></div>
            <div className="my-7 min-h-[280px] rounded-2xl bg-[#fbfaf6] p-6 ring-1 ring-[#eee9dc] sm:p-8">
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Recall first</p>
              <p dir="rtl" lang="ar" className="mt-7 font-arabic text-3xl leading-[2.2] text-slate-900 sm:text-4xl">{revealed ? current.textArabic : '••• ••• •••'}</p>
              {revealed && <p className="mt-7 border-t border-slate-200 pt-5 text-center text-sm leading-6 text-slate-600">{current.translation}</p>}
            </div>
            <button onClick={() => setRevealed(value => !value)} className="mx-auto flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">{revealed ? <EyeOff size={17}/> : <Eye size={17}/>} {revealed ? 'Hide ayah' : 'Reveal ayah'}</button>
            {revealed && <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(RATING_META).map(([rating, meta]) => <button key={rating} onClick={() => grade(rating)} className={`rounded-xl border px-3 py-3 text-left transition hover:-translate-y-0.5 ${meta.className}`}><b className="block text-sm">{meta.label}</b><span className="mt-1 block text-[11px] opacity-75">{meta.hint}</span></button>)}</div>}
          </>}
        </article>
      </section>
    </main>
  </div>
}
