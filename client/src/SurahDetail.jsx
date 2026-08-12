import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Headphones, Pause, Play, Search } from 'lucide-react'
import ReaderNavigation from './ReaderNavigation.jsx'
import { getSurah } from './quranApi'

const getSurahNumber = () => {
  const match = window.location.pathname.match(/^\/surah\/(\d+)\/?$/)
  const value = Number(match?.[1])
  return Number.isInteger(value) && value >= 1 && value <= 114 ? value : 1
}

const STORAGE_KEY = 'tarteel:surah-detail:v1'
const loadState = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} } }
const saveState = (value) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch {} }

export default function SurahDetail() {
  const surahNumber = getSurahNumber()
  const [surah, setSurah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [playing, setPlaying] = useState(false)
  const [activeAyah, setActiveAyah] = useState(() => Number(loadState()[surahNumber]) || 1)
  const [bookmarks, setBookmarks] = useState(() => loadState().bookmarks || {})
  const audioRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    getSurah(surahNumber, { signal: controller.signal })
      .then((data) => { setSurah(data); setActiveAyah((current) => Math.min(Math.max(current, 1), data.ayahs.length)) })
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message || 'Unable to load this Surah.') })
      .finally(() => setLoading(false))
    return () => { controller.abort(); audioRef.current?.pause() }
  }, [surahNumber])

  const filteredAyahs = useMemo(() => {
    if (!surah) return []
    const value = query.trim().toLowerCase()
    if (!value) return surah.ayahs
    return surah.ayahs.filter((ayah) => String(ayah.numberInSurah).includes(value) || ayah.textArabic.includes(query.trim()) || ayah.translation.toLowerCase().includes(value))
  }, [surah, query])

  const stopAudio = () => { audioRef.current?.pause(); setPlaying(false) }
  const playAyah = (ayah) => {
    if (!ayah?.audioUrl) return
    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    audio.src = ayah.audioUrl
    audio.onended = () => {
      if (surah && ayah.numberInSurah < surah.ayahs.length) setActiveAyah(ayah.numberInSurah + 1)
      else setPlaying(false)
    }
    audio.play().then(() => { setActiveAyah(ayah.numberInSurah); setPlaying(true) }).catch(() => setError('Audio could not start. Please try again.'))
  }
  const toggleBookmark = (ayahNumber) => {
    const next = { ...bookmarks, [surahNumber]: { ...(bookmarks[surahNumber] || {}) } }
    if (next[surahNumber][ayahNumber]) delete next[surahNumber][ayahNumber]
    else next[surahNumber][ayahNumber] = true
    setBookmarks(next)
    saveState({ ...loadState(), bookmarks: next, [surahNumber]: activeAyah })
  }
  const setAyah = (number) => { setActiveAyah(number); saveState({ ...loadState(), [surahNumber]: number, bookmarks }) }

  return <div className="min-h-screen bg-[#f7faf8] text-slate-900">
    <ReaderNavigation />
    <main className="min-h-screen lg:ml-[272px]">
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:py-10">
        <a href="/" className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-emerald-800"><ArrowLeft size={17}/> Back to Index</a>
        {error && <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
        {loading ? <div className="mt-5 space-y-4"><div className="h-36 animate-pulse rounded-[2rem] bg-slate-200/70"/><div className="h-40 animate-pulse rounded-2xl bg-slate-200/70"/><div className="h-40 animate-pulse rounded-2xl bg-slate-200/70"/></div> : surah && <>
          <header className="mt-3 rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-semibold text-emerald-700">Surah {surah.number} · {surah.revelationType}</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{surah.name}</h1><p className="mt-2 text-sm text-slate-500">{surah.ayahCount} ayahs · {surah.translationName}</p></div><div dir="rtl" lang="ar" className="font-arabic text-4xl text-slate-700">{surah.arabicName.replace(/^سُورَةُ\s*/, '')}</div></div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row"><label className="flex flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 px-3"><Search size={17} className="text-slate-400"/><input aria-label="Search this Surah" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ayahs in this Surah..." className="w-full bg-transparent px-2 py-3 text-sm outline-none"/></label><span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><Headphones size={15}/> Alafasy</span></div>
          </header>

          <section className="mt-5 space-y-3" aria-label={`${surah.name} ayahs`}>
            {filteredAyahs.map((ayah) => { const isActive = ayah.numberInSurah === activeAyah; const bookmarked = Boolean(bookmarks[surahNumber]?.[ayah.numberInSurah]); return <article key={ayah.number} id={`ayah-${ayah.numberInSurah}`} className={`rounded-2xl border bg-white p-5 shadow-sm transition sm:p-7 ${isActive ? 'border-emerald-300 ring-2 ring-emerald-50' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{ayah.numberInSurah}</span><div className="flex items-center gap-1"><button type="button" onClick={() => toggleBookmark(ayah.numberInSurah)} aria-label={bookmarked ? `Remove bookmark from ayah ${ayah.numberInSurah}` : `Bookmark ayah ${ayah.numberInSurah}`} className={`grid h-9 w-9 place-items-center rounded-lg ${bookmarked ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:bg-slate-50'}`}>{bookmarked ? <BookmarkCheck size={17}/> : <Bookmark size={17}/>}</button><button type="button" onClick={() => playing && isActive ? stopAudio() : playAyah(ayah)} aria-label={playing && isActive ? `Pause ayah ${ayah.numberInSurah}` : `Play ayah ${ayah.numberInSurah}`} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">{playing && isActive ? <Pause size={16}/> : <Play size={16}/>}</button></div></div>
              <button type="button" onClick={() => setAyah(ayah.numberInSurah)} className="mt-5 block w-full text-right" aria-label={`Focus ayah ${ayah.numberInSurah}`}><p dir="rtl" lang="ar" className="font-arabic text-3xl leading-[2.1] text-slate-900 sm:text-4xl">{ayah.textArabic}</p><p className="mt-5 text-left text-sm leading-7 text-slate-600 sm:text-base">{ayah.translation}</p></button>
            </article> })}
            {filteredAyahs.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No ayahs match “{query}”.</div>}
          </section>

          <footer className="sticky bottom-3 z-20 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <button type="button" disabled={activeAyah <= 1} onClick={() => { stopAudio(); setAyah(Math.max(1, activeAyah - 1)); document.getElementById(`ayah-${Math.max(1, activeAyah - 1)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"><ChevronLeft size={17}/> Previous</button>
            <div className="text-center"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Reading</p><p className="text-sm font-bold text-slate-800">Ayah {activeAyah} / {surah.ayahCount}</p></div>
            <button type="button" disabled={activeAyah >= surah.ayahCount} onClick={() => { stopAudio(); setAyah(Math.min(surah.ayahCount, activeAyah + 1)); document.getElementById(`ayah-${Math.min(surah.ayahCount, activeAyah + 1)}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40">Next <ChevronRight size={17}/></button>
          </footer>
        </>}
      </div>
    </main>
  </div>
}
