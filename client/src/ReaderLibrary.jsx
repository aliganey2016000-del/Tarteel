import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bookmark, BookmarkCheck, Brain, Check, ChevronRight, CircleAlert, Clock3, EyeOff, Minus, Plus, RotateCcw, Settings2, Trash2 } from 'lucide-react'
import { getSurah, listSurahs } from './quranApi'

const READER_STATE = 'tarteel:surah-detail:v3'
const WEAK_STATE = 'tarteel:weak-ayahs:v1'
const DEFAULT_SETTINGS = { arabicSize: 34, translationSize: 16, lineSpacing: 2.1, arabicFont: 'uthmani', translationVisible: true, theme: 'auto', focusMode: false, tajweed: false, reciter: 'ar.alafasy', speed: 1, repeatMode: 'ayah', repeatCount: 1, rangeStart: 1, rangeEnd: 1 }

const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
const writeJson = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch {} }

function PageShell({ title, eyebrow, description, children }) {
  return <main className="min-h-screen bg-[#f7faf8] text-slate-900 lg:ml-[272px]">
    <div className="mx-auto max-w-5xl px-4 py-6 pb-16 sm:px-6 lg:py-9">
      <a href="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 hover:bg-white"><ArrowLeft size={16}/> Quran Reader</a>
      <header className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </header>
      <div className="mt-5">{children}</div>
    </div>
  </main>
}

function Empty({ icon, title, text, href = '/' }) { return <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">{icon}</div><h2 className="mt-4 font-bold">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p><a href={href} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Open Quran <ChevronRight size={16}/></a></div> }

export function BookmarksPage() {
  const [state, setState] = useState(() => readJson(READER_STATE, {}))
  const [catalog, setCatalog] = useState([])
  useEffect(() => { listSurahs().then(setCatalog).catch(() => {}) }, [])
  const rows = useMemo(() => Object.entries(state.bookmarks || {}).flatMap(([surahNumber, ayahs]) => Object.keys(ayahs || {}).map(ayahNumber => ({ surahNumber: Number(surahNumber), ayahNumber: Number(ayahNumber), addedAt: ayahs[ayahNumber]?.timestamp }))).sort((a,b) => String(b.addedAt || '').localeCompare(String(a.addedAt || ''))), [state])
  return <PageShell title="Bookmarks" eyebrow="Your saved ayahs" description="Keep the ayahs you want to revisit close at hand. Bookmarks are saved on this device and sync to your account when you sign in from the reader.">
    {!rows.length ? <Empty icon={<Bookmark size={21}/>} title="No bookmarks yet" text="Bookmark an ayah from the Quran Reader and it will appear here."/> : <div className="space-y-3">{rows.map(row => { const surah = catalog.find(item => item.number === row.surahNumber); return <article key={`${row.surahNumber}-${row.ayahNumber}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-sm font-bold text-amber-700">{row.ayahNumber}</span><div className="min-w-0 flex-1"><p className="font-semibold">{surah?.englishName || `Surah ${row.surahNumber}`}</p><p className="text-xs text-slate-400">Ayah {row.ayahNumber}</p></div><a href={`/surah/${row.surahNumber}#ayah-${row.ayahNumber}`} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Read</a></article> })}</div>}
  </PageShell>
}

export function WeakAyahsPage() {
  const [weak, setWeak] = useState(() => readJson(WEAK_STATE, []))
  const [catalog, setCatalog] = useState([])
  const [surahNumber, setSurahNumber] = useState(1)
  const [ayahNumber, setAyahNumber] = useState(1)
  const [message, setMessage] = useState('')
  useEffect(() => { listSurahs().then(setCatalog).catch(() => {}) }, [])
  const addWeak = () => { const key = `${surahNumber}:${ayahNumber}`; if (!Number.isInteger(ayahNumber) || ayahNumber < 1) return; if (weak.some(item => `${item.surahNumber}:${item.ayahNumber}` === key)) return setMessage('That ayah is already in your weak list.'); const next = [...weak, { surahNumber, ayahNumber, addedAt: new Date().toISOString() }]; setWeak(next); writeJson(WEAK_STATE, next); setMessage('Added to weak ayahs.') }
  const removeWeak = item => { const next = weak.filter(row => row.surahNumber !== item.surahNumber || row.ayahNumber !== item.ayahNumber); setWeak(next); writeJson(WEAK_STATE, next) }
  return <PageShell title="Weak Ayahs" eyebrow="Targeted hifz practice" description="Build a focused list of ayahs that need extra repetition. Add an ayah from this page, then use Daily Review to work through the queue.">
    <section className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 sm:p-5"><div className="flex flex-wrap gap-2"><select value={surahNumber} onChange={e => { setSurahNumber(Number(e.target.value)); setAyahNumber(1) }} className="min-w-[210px] flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-semibold">{catalog.map(item => <option key={item.number} value={item.number}>{item.number}. {item.englishName}</option>)}</select><input type="number" min="1" value={ayahNumber} onChange={e => setAyahNumber(Number(e.target.value))} aria-label="Ayah number" className="w-28 rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-semibold"/><button onClick={addWeak} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">Add weak ayah</button></div>{message && <p className="mt-3 text-xs font-semibold text-emerald-800">{message}</p>}</section>
    <div className="mt-5 space-y-3">{weak.length ? weak.map(item => { const surah = catalog.find(row => row.number === item.surahNumber); return <article key={`${item.surahNumber}:${item.ayahNumber}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-sm font-bold text-rose-700">{item.ayahNumber}</span><div className="min-w-0 flex-1"><p className="font-semibold">{surah?.englishName || `Surah ${item.surahNumber}`}</p><p className="text-xs text-slate-400">Ayah {item.ayahNumber}</p></div><a href={`/surah/${item.surahNumber}#ayah-${item.ayahNumber}`} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Practice</a><button onClick={() => removeWeak(item)} aria-label="Remove weak ayah" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500"><Trash2 size={16}/></button></article> }) : <Empty icon={<EyeOff size={21}/>} title="Your weak list is empty" text="Add the ayahs that repeatedly need attention. Keep the list small and focused."/>}</div>
  </PageShell>
}

export function DailyReviewPage() {
  const [weak, setWeak] = useState(() => readJson(WEAK_STATE, []))
  const [state, setState] = useState(() => readJson(READER_STATE, {}))
  const [catalog, setCatalog] = useState([])
  useEffect(() => { listSurahs().then(setCatalog).catch(() => {}) }, [])
  const complete = item => { const next = weak.filter(row => row.surahNumber !== item.surahNumber || row.ayahNumber !== item.ayahNumber); setWeak(next); writeJson(WEAK_STATE, next) }
  const bookmarkedCount = Object.values(state.bookmarks || {}).reduce((sum, value) => sum + Object.keys(value || {}).length, 0)
  return <PageShell title="Daily Review" eyebrow="Muraja'ah" description="A simple daily queue for the ayahs you have identified as weak. Review one by one, then mark each as cleared when it feels solid again.">
    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4"><Clock3 className="text-emerald-700" size={20}/><p className="mt-3 text-2xl font-bold">{weak.length}</p><p className="text-xs text-slate-500">Ayahs due for review</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><BookmarkCheck className="text-amber-600" size={20}/><p className="mt-3 text-2xl font-bold">{bookmarkedCount}</p><p className="text-xs text-slate-500">Saved bookmarks</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><Brain className="text-violet-600" size={20}/><p className="mt-3 text-2xl font-bold">Focused</p><p className="text-xs text-slate-500">Short, repeatable practice</p></div></section>
    <div className="mt-5 space-y-3">{weak.length ? weak.map(item => { const surah = catalog.find(row => row.number === item.surahNumber); return <article key={`${item.surahNumber}:${item.ayahNumber}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-sm font-bold text-rose-700">{item.ayahNumber}</div><div className="min-w-0 flex-1"><p className="font-semibold">{surah?.englishName || `Surah ${item.surahNumber}`}</p><p className="text-xs text-slate-400">Ayah {item.ayahNumber} · Repeat until comfortable</p></div><a href={`/surah/${item.surahNumber}#ayah-${item.ayahNumber}`} className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Review</a><button onClick={() => complete(item)} className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700" aria-label="Mark reviewed"><Check size={17}/></button></article> }) : <Empty icon={<Check size={21}/>} title="Review queue is clear" text="Add weak ayahs when you find a difficult passage. Your next review will appear here." href="/weak-ayahs"/>}</div>
  </PageShell>
}

export function ReaderSettingsPage() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...(readJson(READER_STATE, {}).settings || {}) }))
  const update = (key, value) => setSettings(current => ({ ...current, [key]: value }))
  useEffect(() => { const state = readJson(READER_STATE, {}); writeJson(READER_STATE, { ...state, settings }) }, [settings])
  return <PageShell title="Settings" eyebrow="Reader preferences" description="Tune the Quran reader for comfortable daily reading. Changes are saved locally on this device and take effect the next time you open the reader.">
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Setting label="Arabic font"><select value={settings.arabicFont} onChange={e => update('arabicFont', e.target.value)} className="control"><option value="uthmani">Uthmani</option><option value="naskh">Naskh</option><option value="system">System</option></select></Setting>
        <Setting label="Theme"><select value={settings.theme} onChange={e => update('theme', e.target.value)} className="control"><option value="auto">System</option><option value="light">Light</option><option value="dark">Dark</option></select></Setting>
        <Setting label={`Arabic size · ${settings.arabicSize}px`}><div className="flex items-center gap-2"><button className="sizeBtn" onClick={() => update('arabicSize', Math.max(28, settings.arabicSize - 2))}><Minus size={16}/></button><input type="range" min="28" max="72" value={settings.arabicSize} onChange={e => update('arabicSize', Number(e.target.value))} className="w-full"/><button className="sizeBtn" onClick={() => update('arabicSize', Math.min(72, settings.arabicSize + 2))}><Plus size={16}/></button></div></Setting>
        <Setting label={`Translation size · ${settings.translationSize}px`}><div className="flex items-center gap-2"><button className="sizeBtn" onClick={() => update('translationSize', Math.max(12, settings.translationSize - 1))}><Minus size={16}/></button><input type="range" min="12" max="24" value={settings.translationSize} onChange={e => update('translationSize', Number(e.target.value))} className="w-full"/><button className="sizeBtn" onClick={() => update('translationSize', Math.min(24, settings.translationSize + 1))}><Plus size={16}/></button></div></Setting>
        <Setting label="Line spacing"><input type="range" min="1.6" max="3" step="0.1" value={settings.lineSpacing} onChange={e => update('lineSpacing', Number(e.target.value))} className="w-full"/></Setting>
        <Setting label="Playback speed"><select value={settings.speed} onChange={e => update('speed', Number(e.target.value))} className="control">{[0.75,1,1.25,1.5].map(value => <option key={value} value={value}>{value}×</option>)}</select></Setting>
      </div>
      <label className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"><span><span className="block text-sm font-semibold">Show translation</span><span className="text-xs text-slate-500">Keep the English translation visible under each ayah.</span></span><input type="checkbox" checked={settings.translationVisible} onChange={e => update('translationVisible', e.target.checked)} className="h-5 w-5 accent-emerald-700"/></label>
      <label className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-emerald-50 p-4"><span><span className="block text-sm font-semibold text-emerald-900">Single Ayah focus</span><span className="text-xs text-emerald-700/80">Open the reader in the distraction-free ayah view.</span></span><input type="checkbox" checked={settings.focusMode} onChange={e => update('focusMode', e.target.checked)} className="h-5 w-5 accent-emerald-700"/></label>
      <button onClick={() => setSettings(DEFAULT_SETTINGS)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700"><RotateCcw size={16}/> Reset reader settings</button>
    </section>
    <style>{`.control{width:100%;border:1px solid #e2e8f0;border-radius:.75rem;background:white;padding:.7rem .8rem;font-size:.875rem;font-weight:600}.sizeBtn{display:grid;place-items:center;width:2.25rem;height:2.25rem;border-radius:.75rem;background:#f1f5f9;color:#475569}`}</style>
  </PageShell>
}

function Setting({ label, children }) { return <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>{children}</label> }
