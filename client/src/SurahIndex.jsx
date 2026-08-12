import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Grid2X2, List, Search } from 'lucide-react'
import ReaderNavigation from './ReaderNavigation.jsx'
import { listSurahs } from './quranApi'

export default function SurahIndex() {
  const [surahs, setSurahs] = useState([])
  const [query, setQuery] = useState('')
  const [view, setView] = useState('grid')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    listSurahs({ signal: controller.signal })
      .then(setSurahs)
      .catch((err) => { if (err.name !== 'AbortError') setError('Unable to load the Surah index. Please retry.') })
      .finally(() => setLoading(false))
    return () => controller.abort()
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

  return <div className="min-h-screen bg-[#f7faf8] text-slate-900">
    <ReaderNavigation />
    <main className="min-h-screen lg:ml-[272px]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <header className="rounded-[2rem] bg-gradient-to-br from-[#075e4a] via-[#0b765d] to-[#0d8a6b] p-6 text-white shadow-xl sm:p-9">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-medium text-emerald-100">Quran Reader</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Choose a Surah</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">Browse all 114 Surahs, then open a focused reading page for Arabic, translation, audio and ayah search.</p>
            </div>
            <span className="hidden rounded-2xl bg-white/10 p-3 sm:block"><BookOpen size={28}/></span>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-h-12 flex-1 items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
            <Search size={18} className="shrink-0 text-slate-400" />
            <input aria-label="Search Surahs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by Surah name or number..." className="w-full bg-transparent px-3 py-3 text-sm outline-none" />
          </label>
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm" aria-label="Surah view mode">
            <button type="button" onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'} className={`grid h-10 w-10 place-items-center rounded-xl ${view === 'grid' ? 'bg-emerald-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><Grid2X2 size={18}/></button>
            <button type="button" onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'} className={`grid h-10 w-10 place-items-center rounded-xl ${view === 'list' ? 'bg-emerald-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}><List size={18}/></button>
          </div>
        </div>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error} <button className="ml-2 font-semibold underline" onClick={() => window.location.reload()}>Retry</button></div>}
        <div className="mt-5 flex items-center justify-between px-1"><p className="text-sm font-semibold text-slate-700">{loading ? 'Loading Surahs…' : `${filtered.length} Surah${filtered.length === 1 ? '' : 's'}`}</p><p className="text-xs text-slate-400">114 total</p></div>

        {loading ? <div className={`mt-3 grid gap-3 ${view === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>{Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />)}</div> : (
          <div className={`mt-3 grid gap-3 ${view === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
            {filtered.map((surah) => <a key={surah.number} href={`/surah/${surah.number}`} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-800">{surah.number}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-bold text-slate-900 group-hover:text-emerald-800">{surah.englishName}</span><span className="mt-1 block text-xs text-slate-400">{surah.numberOfAyahs} ayahs · {surah.revelationType}</span></span>
              <span dir="rtl" lang="ar" className="font-arabic text-xl text-slate-600">{surah.name.replace(/^سُورَةُ\s*/, '')}</span>
            </a>)}
          </div>
        )}
        {!loading && filtered.length === 0 && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No Surah matches “{query}”.</div>}
      </div>
    </main>
  </div>
}
