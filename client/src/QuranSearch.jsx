import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Search, X } from 'lucide-react'
import { searchQuran } from './quranApi.js'

const READER_STATE_KEY = 'tarteel:reader:v2'

const openInReader = (match) => {
  try {
    const current = JSON.parse(localStorage.getItem(READER_STATE_KEY) || '{}')
    localStorage.setItem(READER_STATE_KEY, JSON.stringify({
      ...current,
      surahNumber: match.surahNumber,
      ayahNumber: match.ayahNumber
    }))
  } catch {
    // Navigation still works when storage is unavailable; the reader falls back to its default.
  }
  window.location.assign('/')
}

function QuranSearch() {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [edition, setEdition] = useState(() => new URLSearchParams(window.location.search).get('edition') || '')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const runSearch = async (event) => {
    event?.preventDefault()
    const value = query.trim()
    if (value.length < 2) {
      setError('Enter at least 2 characters to search the Quran.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await searchQuran(value, { edition: edition || null })
      setResults(data)
      const params = new URLSearchParams({ q: value })
      if (edition) params.set('edition', edition)
      window.history.replaceState(null, '', `/search?${params}`)
    } catch (err) {
      setResults(null)
      setError(err.message || 'Quran search is temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    inputRef.current?.focus()
    const initial = query.trim()
    if (initial.length >= 2) runSearch()
    // Initial URL search is intentionally performed once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div className="min-h-screen bg-[#f7faf8] text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2" aria-label="Back to Tarteel reader"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-700 text-white"><BookOpen size={20}/></span><span className="text-xl font-bold tracking-tight">Tarteel</span></a>
        <a href="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"><ArrowLeft size={16}/> Reader</a>
      </div>
    </header>

    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="rounded-[2rem] bg-gradient-to-br from-[#075e4a] via-[#0b765d] to-[#0d8a6b] p-6 text-white shadow-xl sm:p-9">
        <p className="text-sm font-medium text-emerald-100">Find an ayah quickly</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Search the Quran</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">Search Saheeh International in English or the clean Arabic text, then open any result directly in the reader.</p>
        <form onSubmit={runSearch} className="mt-7 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <label className="flex items-center rounded-xl bg-white px-4 text-slate-700"><Search size={18} className="shrink-0 text-slate-400"/><input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} aria-label="Search the Quran" placeholder="e.g. mercy, patience, الله" className="w-full bg-transparent px-3 py-3.5 text-sm outline-none"/><button type="button" onClick={() => setQuery('')} className="text-slate-400" aria-label="Clear search"><X size={16}/></button></label>
          <select value={edition} onChange={event => setEdition(event.target.value)} aria-label="Search edition" className="rounded-xl border border-white/20 bg-white px-3 py-3 text-sm font-semibold text-slate-700">
            <option value="">Auto detect</option>
            <option value="en.sahih">English · Saheeh International</option>
            <option value="quran-simple-clean">Arabic · Simple Clean</option>
            <option value="quran-uthmani">Arabic · Uthmani</option>
          </select>
          <button disabled={loading} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 disabled:opacity-60">{loading ? 'Searching…' : 'Search'}</button>
        </form>
      </section>

      {error && <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}

      {results && <section className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm font-semibold text-emerald-700">Search results</p><h2 className="mt-1 text-2xl font-bold">{results.count} matches for “{results.query}”</h2></div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">{results.edition}</span>
        </div>
        <div className="mt-4 space-y-3">
          {results.matches.length ? results.matches.map(match => <article key={`${match.globalAyahNumber}-${match.surahNumber}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Surah {match.surahNumber}</p><h3 className="font-bold text-slate-900">{match.surahName} · Ayah {match.ayahNumber}</h3></div>
              <button onClick={() => openInReader(match)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"><BookOpen size={15}/> Open in reader</button>
            </div>
            <p dir={results.edition.startsWith('en.') ? undefined : 'rtl'} lang={results.edition.startsWith('en.') ? 'en' : 'ar'} className="mt-4 text-base leading-8 text-slate-700">{match.text}</p>
          </article>) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No matching ayahs found. Try a shorter word or switch the edition.</div>}
        </div>
      </section>}
    </main>
  </div>
}

export default QuranSearch
