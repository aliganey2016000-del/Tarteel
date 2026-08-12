import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, CircleAlert, Headphones, Menu, Pause, Play, Search, X } from 'lucide-react'
import { getSurah, listSurahs } from './quranApi'

const STORAGE_KEY = 'tarteel:reader:v1'
const DEFAULT_SURAH = 1

const readState = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

const writeState = (patch) => {
  try {
    const current = readState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {
    // Storage is an enhancement; the reader remains usable without it.
  }
}

function AppReader() {
  const saved = readState()
  const [catalog, setCatalog] = useState([])
  const [selectedSurah, setSelectedSurah] = useState(saved.surahNumber || DEFAULT_SURAH)
  const [surah, setSurah] = useState(null)
  const [ayahIndex, setAyahIndex] = useState(Math.max(0, Number(saved.ayahNumber || 1) - 1))
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [loadingSurah, setLoadingSurah] = useState(true)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    listSurahs({ signal: controller.signal })
      .then(setCatalog)
      .catch((err) => { if (err.name !== 'AbortError') setError('The Quran catalog is unavailable. Check your connection and retry.') })
      .finally(() => setLoadingCatalog(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoadingSurah(true)
    setError('')
    setPlaying(false)
    getSurah(selectedSurah, { signal: controller.signal })
      .then((data) => {
        setSurah(data)
        const savedAyah = selectedSurah === readState().surahNumber ? Number(readState().ayahNumber || 1) : 1
        setAyahIndex(Math.min(Math.max(savedAyah - 1, 0), data.ayahs.length - 1))
      })
      .catch((err) => { if (err.name !== 'AbortError') setError(`Unable to load this Surah. ${err.message}`) })
      .finally(() => setLoadingSurah(false))
    return () => controller.abort()
  }, [selectedSurah])

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return catalog
    return catalog.filter((item) => `${item.number} ${item.englishName} ${item.name} ${item.englishNameTranslation}`.toLowerCase().includes(value))
  }, [catalog, query])

  const currentAyah = surah?.ayahs?.[ayahIndex]

  useEffect(() => {
    if (!surah || !currentAyah) return
    writeState({ surahNumber: surah.number, ayahNumber: currentAyah.numberInSurah })
  }, [surah, currentAyah])

  const stopAudio = () => {
    audioRef.current?.pause()
    setPlaying(false)
  }

  const playAyah = () => {
    if (!currentAyah?.audioUrl) return
    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    if (audio.src !== currentAyah.audioUrl) audio.src = currentAyah.audioUrl
    audio.play().then(() => setPlaying(true)).catch(() => setError('Audio could not start. Tap play again or check your connection.'))
    audio.onended = () => {
      if (ayahIndex < surah.ayahs.length - 1) setAyahIndex((index) => index + 1)
      else setPlaying(false)
    }
  }

  const toggleAudio = () => {
    if (playing) stopAudio()
    else playAyah()
  }

  const selectSurah = (number) => {
    stopAudio()
    setSelectedSurah(number)
    setQuery('')
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const moveAyah = (delta) => {
    if (!surah) return
    stopAudio()
    setAyahIndex((index) => Math.min(Math.max(index + delta, 0), surah.ayahs.length - 1))
  }

  const bookmarked = currentAyah ? Boolean(readState().bookmarks?.includes(currentAyah.number)) : false
  const toggleBookmark = () => {
    if (!currentAyah) return
    const current = new Set(readState().bookmarks || [])
    if (current.has(currentAyah.number)) current.delete(currentAyah.number)
    else current.add(currentAyah.number)
    writeState({ bookmarks: [...current] })
    setSurah((value) => value ? { ...value } : value)
  }

  return <div className="min-h-screen bg-[#f7faf8] text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button className="flex items-center gap-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Tarteel home">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-700/20"><BookOpen size={20}/></span>
          <span className="text-xl font-bold tracking-tight">Tarteel</span>
        </button>
        <div className="hidden items-center gap-1 md:flex">
          <span className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">Quran Reader</span>
          <a className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50" href="#memorize">Memorize</a>
          <a className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50" href="#progress">Progress</a>
        </div>
        <div className="flex items-center gap-2">
          <label className="hidden items-center rounded-xl border border-slate-200 bg-white px-3 sm:flex">
            <Search size={17} className="text-slate-400"/>
            <input aria-label="Search Surahs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Surah..." className="w-32 bg-transparent px-2 py-2.5 text-sm outline-none lg:w-44"/>
          </label>
          <button className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label="Open navigation">{menuOpen ? <X/> : <Menu/>}</button>
        </div>
      </div>
      {menuOpen && <div className="border-t border-slate-100 bg-white p-3 md:hidden">
        <label className="mb-2 flex items-center rounded-xl border border-slate-200 px-3"><Search size={17} className="text-slate-400"/><input aria-label="Search Surahs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Surah..." className="w-full px-2 py-3 outline-none"/></label>
        <a href="#memorize" className="block rounded-xl px-4 py-3 font-medium" onClick={() => setMenuOpen(false)}>Memorize</a>
        <a href="#progress" className="block rounded-xl px-4 py-3 font-medium" onClick={() => setMenuOpen(false)}>Progress</a>
      </div>}
    </header>

    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#075e4a] via-[#0b765d] to-[#0d8a6b] p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-9">
        <p className="text-sm font-medium text-emerald-100">Read · Listen · Reflect</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">The Quran, one ayah at a time.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">Live Uthmani Arabic, Saheeh International translation and Alafasy recitation, with local caching for repeat visits.</p>
      </section>

      {error && <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><CircleAlert className="mt-0.5 shrink-0" size={18}/><div className="flex-1">{error}</div><button className="font-semibold underline" onClick={() => window.location.reload()}>Retry</button></div>}

      <section className="mt-7 grid gap-6 lg:grid-cols-[.78fr_1.5fr]">
        <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between px-2 py-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Index</p><h2 className="text-xl font-bold">114 Surahs</h2></div><span className="text-xs text-slate-400">{filtered.length} shown</span></div>
          <div className="mt-2 max-h-[680px] overflow-auto pr-1" aria-label="Surah list">
            {loadingCatalog ? <div className="space-y-2 p-2">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100"/>)}</div> : filtered.map((item) => <button key={item.number} onClick={() => selectSurah(item.number)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selectedSurah === item.number ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50'}`} aria-current={selectedSurah === item.number ? 'page' : undefined}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{item.number}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.englishName}</b><span className="text-xs text-slate-400">{item.numberOfAyahs} ayahs · {item.revelationType}</span></span><span dir="rtl" className="font-arabic text-base text-slate-600">{item.name.replace(/^سُورَةُ\s*/, '')}</span></button>)}
            {!loadingCatalog && !filtered.length && <p className="p-6 text-center text-sm text-slate-500">No Surah matches “{query}”.</p>}
          </div>
        </aside>

        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {loadingSurah ? <div className="space-y-5"><div className="h-20 animate-pulse rounded-2xl bg-slate-100"/><div className="h-72 animate-pulse rounded-2xl bg-slate-100"/><div className="h-10 animate-pulse rounded-xl bg-slate-100"/></div> : surah ? <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><p className="text-sm font-semibold text-emerald-700">Surah {surah.number} · {surah.revelationType}</p><h2 className="mt-1 text-3xl font-bold">{surah.name}</h2><p className="mt-1 text-sm text-slate-500">{surah.ayahCount} ayahs · {surah.translationName}</p></div><div dir="rtl" className="font-arabic text-3xl text-slate-700">{surah.arabicName.replace(/^سُورَةُ\s*/, '')}</div></div>

            <div className="my-7 rounded-2xl bg-[#fbfaf6] p-5 ring-1 ring-[#eee9dc] sm:p-7">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-400"><span>AYAH {currentAyah?.numberInSurah}</span><span>JUZ {currentAyah?.juz}</span></div>
              <p dir="rtl" lang="ar" className="mt-5 font-arabic text-3xl leading-[2.25] text-slate-900 sm:text-4xl">{currentAyah?.textArabic}</p>
              <p className="mt-6 text-sm leading-7 text-slate-600 sm:text-base">{currentAyah?.translation}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => moveAyah(-1)} disabled={ayahIndex === 0} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={16}/> Previous</button>
              <button onClick={toggleAudio} disabled={!currentAyah?.audioUrl} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{playing ? <Pause size={16}/> : <Play size={16} fill="currentColor"/>}{playing ? 'Pause' : 'Listen'}</button>
              <button onClick={toggleBookmark} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${bookmarked ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200'}`}>{bookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button>
              <button onClick={() => moveAyah(1)} disabled={ayahIndex === surah.ayahs.length - 1} className="ml-auto inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={16}/></button>
            </div>

            <div className="mt-7 rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center justify-between text-xs text-slate-500"><span>Reading position</span><span>{ayahIndex + 1} / {surah.ayahs.length}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${((ayahIndex + 1) / surah.ayahs.length) * 100}%` }}/></div></div>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400"><Headphones size={14}/> Audio: Mishary Rashid Alafasy · Arabic: Uthmani · Translation: Saheeh International</div>
          </> : <div className="py-20 text-center text-sm text-slate-500">Select a Surah to begin reading.</div>}
        </article>
      </section>

      <section id="memorize" className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-emerald-700">Memorization</p><h2 className="mt-1 text-xl font-bold">Use the reader as your review loop.</h2><p className="mt-2 text-sm leading-6 text-slate-500">Move ayah by ayah, replay a recitation, and bookmark difficult passages. Persistent progress is stored locally until account sync is enabled.</p></div>
        <div id="progress" className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-emerald-700">Continue reading</p><h2 className="mt-1 text-xl font-bold">Surah {readState().surahNumber || DEFAULT_SURAH}, ayah {readState().ayahNumber || 1}</h2><p className="mt-2 text-sm text-slate-500">Your latest position is saved on this device.</p></div>
      </section>
    </main>

    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6"><span>© 2026 Tarteel Quran Learning</span><span>Source: Al Quran Cloud · Uthmani · Saheeh International · Alafasy</span></div></footer>
  </div>
}

export default AppReader
