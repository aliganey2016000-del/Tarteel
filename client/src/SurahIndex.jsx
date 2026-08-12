import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Bookmark, Clock3, Grid2X2, List, Search, Sparkles } from 'lucide-react'
import ReaderNavigation from './ReaderNavigation.jsx'
import { listSurahs } from './quranApi'
import { readReaderResume } from './readerResumeUtils.js'

const quickSurahs = [1, 36, 55, 67]

export default function SurahIndex() {
  const [surahs, setSurahs] = useState([])
  const [query, setQuery] = useState('')
  const [view, setView] = useState('grid')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resume, setResume] = useState(() => readReaderResume(window.localStorage))

  useEffect(() => {
    const controller = new AbortController()
    listSurahs({ signal: controller.signal })
      .then(setSurahs)
      .catch((err) => { if (err.name !== 'AbortError') setError('Unable to load the Surah index. Please retry.') })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const refreshResume = () => setResume(readReaderResume(window.localStorage))
    window.addEventListener('focus', refreshResume)
    window.addEventListener('storage', refreshResume)
    return () => { window.removeEventListener('focus', refreshResume); window.removeEventListener('storage', refreshResume) }
  }, [])

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return surahs
    return surahs.filter((surah) =>
      String(surah.number).includes(value) ||
      surah.englishName.toLowerCase().includes(value) ||
      surah.englishNameTranslation.toLowerCase().includes(value) ||
      surah.name.includes(query.trim())
    )
  }, [surahs, query])

  const lastSurah = surahs.find((surah) => surah.number === resume?.surahNumber) || surahs[0]
  const quick = quickSurahs.map((number) => surahs.find((surah) => surah.number === number)).filter(Boolean)

  const rememberSurah = (number) => {
    try { localStorage.setItem('tarteel:last-surah', String(number)) } catch {}
  }

  return <div className="min-h-screen bg-[#f7faf8] text-slate-900">
    <ReaderNavigation />
    <main className="min-h-screen lg:ml-[288px]">
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:pt-10">
        <section className="tarteel-gradient relative overflow-hidden rounded-[2rem] p-6 text-white shadow-2xl shadow-emerald-900/10 sm:p-9 lg:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15 backdrop-blur">
                <Sparkles size={14} /> Quran Reader
              </div>
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">A calmer way to read the Quran.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/90 sm:text-base">Read every Surah with a focused interface built for clarity, reflection and consistent daily practice.</p>
              {lastSurah && <a href={`/surah/${lastSurah.number}`} onClick={() => rememberSurah(lastSurah.number)} className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-emerald-900 shadow-lg shadow-emerald-950/10 hover:-translate-y-0.5 hover:shadow-xl">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50"><BookOpen size={17} /></span>
                <span className="text-left"><span className="block text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Continue reading</span><span className="mt-0.5 block">{lastSurah.englishName}{resume?.surahNumber === lastSurah.number ? ` · Ayah ${resume.ayahNumber}` : ''}</span></span>
                <ArrowRight size={17} />
              </a>}
            </div>
            <div className="hidden w-52 rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md lg:block">
              <div className="flex items-center justify-between text-emerald-100"><span className="text-xs font-semibold uppercase tracking-wider">Library</span><Bookmark size={16} /></div>
              <p className="mt-3 text-4xl font-extrabold">114</p>
              <p className="mt-1 text-sm text-emerald-100/80">Surahs available to explore</p>
            </div>
          </div>
        </section>

        {!loading && quick.length > 0 && <section className="mt-7">
          <div className="mb-3 flex items-end justify-between px-1"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Quick access</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Popular Surahs</h2></div><span className="hidden text-xs text-slate-400 sm:block">Start with one ayah</span></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quick.map((surah) => <a key={surah.number} href={`/surah/${surah.number}`} onClick={() => rememberSurah(surah.number)} className="tarteel-card group flex items-center gap-3 p-4 hover:-translate-y-0.5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-sm font-extrabold text-emerald-800">{surah.number}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-900 group-hover:text-emerald-800">{surah.englishName}</span><span className="mt-1 block text-xs text-slate-400">{surah.numberOfAyahs} ayahs</span></span>
              <span dir="rtl" lang="ar" className="font-arabic text-xl text-slate-500">{surah.name.replace(/^سُورَةُ\s*/, '')}</span>
            </a>)}
          </div>
        </section>}

        <section className="mt-8 rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex min-h-12 flex-1 items-center rounded-2xl border border-slate-200 bg-slate-50/70 px-4 transition focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-500/10">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input aria-label="Search Surahs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by Surah name, translation or number..." className="w-full bg-transparent px-3 py-3 text-sm outline-none" />
            </label>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <div className="flex items-center gap-2 px-1 text-xs text-slate-400"><Clock3 size={14} /> {filtered.length} results</div>
              <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1" aria-label="Surah view mode">
                <button type="button" onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'} className={`grid h-10 w-10 place-items-center rounded-xl ${view === 'grid' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}><Grid2X2 size={18}/></button>
                <button type="button" onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'} className={`grid h-10 w-10 place-items-center rounded-xl ${view === 'list' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500 hover:bg-white'}`}><List size={18}/></button>
              </div>
            </div>
          </div>
        </section>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error} <button className="ml-2 font-semibold underline" onClick={() => window.location.reload()}>Retry</button></div>}
        <div className="mt-6 flex items-center justify-between px-1"><div><p className="text-sm font-bold text-slate-800">All Surahs</p><p className="mt-0.5 text-xs text-slate-400">Browse the complete Quran</p></div><p className="text-xs font-semibold text-slate-400">114 total</p></div>

        {loading ? <div className={`mt-3 grid gap-3 ${view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`}>{Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />)}</div> : (
          <div className={`mt-3 grid gap-3 ${view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`}>
            {filtered.map((surah) => <a key={surah.number} href={`/surah/${surah.number}`} onClick={() => rememberSurah(surah.number)} className="group flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-slate-900/5">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-slate-50 text-sm font-extrabold text-emerald-800 ring-1 ring-emerald-100"><span>{surah.number}</span></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-bold text-slate-900 group-hover:text-emerald-800">{surah.englishName}</span><span className="mt-1 block truncate text-xs text-slate-400">{surah.englishNameTranslation} · {surah.numberOfAyahs} ayahs · {surah.revelationType}</span></span>
              <span dir="rtl" lang="ar" className="font-arabic text-xl text-slate-600 sm:text-2xl">{surah.name.replace(/^سُورَةُ\s*/, '')}</span>
            </a>)}
          </div>
        )}
        {!loading && filtered.length === 0 && <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><Search className="mx-auto text-slate-300" size={28}/><p className="mt-3 font-semibold text-slate-700">No Surah matches “{query}”.</p><p className="mt-1 text-sm text-slate-400">Try a name, English translation or Surah number.</p></div>}
      </div>
    </main>
  </div>
}