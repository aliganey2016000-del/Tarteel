import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Grid3X3, Search, X } from 'lucide-react'
import ReaderNavigation from './ReaderNavigation.jsx'
import { getMushafPage, MADINAH_MUSHAF_PAGES } from './quranApi'

const STORAGE_KEY = 'tarteel:mushaf-page'
const readSavedPage = () => { try { const value = Number(localStorage.getItem(STORAGE_KEY)); return Number.isInteger(value) ? Math.min(Math.max(value, 1), MADINAH_MUSHAF_PAGES) : 1 } catch { return 1 } }
const savePage = page => { try { localStorage.setItem(STORAGE_KEY, String(page)) } catch {} }

function PageJump({ page, onChange, onClose }) {
  const [value, setValue] = useState(String(page))
  const submit = event => { event.preventDefault(); const next = Number(value); if (Number.isInteger(next) && next >= 1 && next <= MADINAH_MUSHAF_PAGES) { onChange(next); onClose() } }
  return <div className="absolute right-3 top-14 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl" role="dialog" aria-label="Jump to Mushaf page">
    <div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Go to page</p><button type="button" onClick={onClose} aria-label="Close page search" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={16}/></button></div>
    <form onSubmit={submit} className="flex gap-2"><input autoFocus inputMode="numeric" min="1" max={MADINAH_MUSHAF_PAGES} value={value} onChange={event => setValue(event.target.value.replace(/\D/g, ''))} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" aria-label="Mushaf page number"/><button className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Open</button></form>
    <p className="mt-2 text-[11px] text-slate-400">Standard Madinah pagination: 1–604</p>
  </div>
}

export default function MushafReader() {
  const [page, setPage] = useState(readSavedPage)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [jumpOpen, setJumpOpen] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const [fontScale, setFontScale] = useState(1)
  const touchStart = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    getMushafPage(page, { signal: controller.signal }).then(setData).catch(err => { if (err.name !== 'AbortError') setError(err.message || 'Unable to load this Mushaf page.') }).finally(() => setLoading(false))
    savePage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return () => controller.abort()
  }, [page])

  useEffect(() => {
    const onKey = event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'ArrowRight') setPage(current => Math.min(current + 1, MADINAH_MUSHAF_PAGES))
      if (event.key === 'ArrowLeft') setPage(current => Math.max(current - 1, 1))
      if (event.key === 'Home') setPage(1)
      if (event.key === 'End') setPage(MADINAH_MUSHAF_PAGES)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const surahs = useMemo(() => {
    const result = []
    for (const ayah of data?.ayahs || []) if (!result.some(item => item.number === ayah.surahNumber)) result.push({ number: ayah.surahNumber, name: ayah.surahName, arabicName: ayah.surahArabicName })
    return result
  }, [data])
  const navigate = next => setPage(Math.min(Math.max(next, 1), MADINAH_MUSHAF_PAGES))
  const pageProgress = ((page - 1) / (MADINAH_MUSHAF_PAGES - 1)) * 100

  return <div className="min-h-screen bg-[#e9eee9] text-slate-900">
    <ReaderNavigation />
    <main className="min-h-screen lg:pl-[272px]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:px-6">
          <div className="hidden items-center gap-3 sm:flex"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700 text-white"><BookOpen size={19}/></span><div><p className="text-sm font-bold">Mushaf</p><p className="text-[11px] text-slate-400">Madinah pagination</p></div></div>
          <div className="ml-auto flex items-center gap-1 rounded-2xl bg-slate-100 p-1"><button type="button" onClick={() => navigate(1)} disabled={page === 1} aria-label="First page" className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-white disabled:opacity-30"><ChevronsLeft size={17}/></button><button type="button" onClick={() => navigate(page - 1)} disabled={page === 1} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-white disabled:opacity-30"><ChevronLeft size={18}/></button><button type="button" onClick={() => setJumpOpen(value => !value)} className="min-w-24 rounded-xl bg-white px-3 py-2 text-center text-xs font-bold text-slate-700 shadow-sm" aria-expanded={jumpOpen}>{page} <span className="font-normal text-slate-400">/ {MADINAH_MUSHAF_PAGES}</span></button><button type="button" onClick={() => navigate(page + 1)} disabled={page === MADINAH_MUSHAF_PAGES} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 hover:bg-white disabled:opacity-30"><ChevronRight size={18}/></button><button type="button" onClick={() => navigate(MADINAH_MUSHAF_PAGES)} disabled={page === MADINAH_MUSHAF_PAGES} aria-label="Last page" className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-white disabled:opacity-30"><ChevronsRight size={17}/></button></div>
          <button type="button" onClick={() => setPagesOpen(value => !value)} aria-label="Open page navigator" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><Grid3X3 size={18}/></button>
          <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:flex"><button type="button" onClick={() => setFontScale(value => Math.max(.85, value - .1))} className="px-2 text-sm text-slate-500">A−</button><button type="button" onClick={() => setFontScale(1)} className="px-1 text-xs text-slate-400">A</button><button type="button" onClick={() => setFontScale(value => Math.min(1.25, value + .1))} className="px-2 text-sm text-slate-500">A+</button></div>
          {jumpOpen && <PageJump page={page} onChange={navigate} onClose={() => setJumpOpen(false)}/>} 
        </div><div className="h-1 bg-slate-100"><div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${pageProgress}%` }}/></div>
      </header>
      <section className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-8">
        {pagesOpen && <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center gap-2"><Search size={16} className="text-slate-400"/><input autoFocus type="number" min="1" max={MADINAH_MUSHAF_PAGES} placeholder="Page 1–604" onChange={event => { const value = Number(event.target.value); if (value >= 1 && value <= MADINAH_MUSHAF_PAGES) navigate(value) }} className="w-full bg-transparent text-sm outline-none"/></div><div className="mt-3 grid max-h-48 grid-cols-8 gap-1 overflow-auto sm:grid-cols-12">{Array.from({ length: MADINAH_MUSHAF_PAGES }, (_, index) => index + 1).map(number => <button key={number} type="button" onClick={() => { navigate(number); setPagesOpen(false) }} className={`rounded-lg py-1.5 text-[11px] ${number === page ? 'bg-emerald-700 font-bold text-white' : 'bg-slate-50 text-slate-500 hover:bg-emerald-50'}`}>{number}</button>)}</div></div>}
        <div className="mb-4 flex items-center justify-between px-1"><div>{surahs.map(surah => <span key={surah.number} className="mr-2 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">{surah.arabicName || surah.name}</span>)}</div><span className="hidden text-xs text-slate-400 sm:block">Page {page}</span></div>
        <article className="relative mx-auto min-h-[70vh] max-w-[820px] overflow-hidden rounded-[28px] border border-[#d7c9a7] bg-[#fffdf5] px-5 py-10 shadow-[0_18px_60px_rgba(58,48,30,.13)] sm:px-12 sm:py-14 md:px-16 md:py-16" dir="rtl" onTouchStart={event => { touchStart.current = event.changedTouches[0].clientX }} onTouchEnd={event => { const start = touchStart.current; if (start == null) return; const delta = event.changedTouches[0].clientX - start; if (Math.abs(delta) > 55) navigate(page + (delta < 0 ? 1 : -1)); touchStart.current = null }}>
          <div className="pointer-events-none absolute inset-x-7 top-5 h-px bg-[#d7c9a7] sm:inset-x-12"/><div className="pointer-events-none absolute inset-x-7 bottom-5 h-px bg-[#d7c9a7] sm:inset-x-12"/>
          {loading && <div className="space-y-6 py-16 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-700"/><p className="text-sm text-slate-400">Loading Mushaf page…</p></div>}
          {error && !loading && <div className="py-20 text-center" dir="ltr"><p className="font-semibold text-slate-800">Could not load this page</p><p className="mt-1 text-sm text-slate-500">{error}</p><button type="button" onClick={() => navigate(page)} className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Try again</button></div>}
          {!loading && !error && <div className="font-[Amiri,serif] text-center leading-[2.35] text-slate-900" style={{ fontSize: `${1.48 * fontScale}rem` }}>{data?.ayahs.map((ayah, index) => <span key={ayah.number} id={`mushaf-ayah-${ayah.number}`} className="inline">{index === 0 && ayah.numberInSurah === 1 && ayah.surahNumber !== 9 && <span className="mb-3 block text-center text-[.72em] font-semibold text-emerald-800">﴿ {ayah.surahArabicName} ﴾</span>}<span className="rounded-lg px-1 transition hover:bg-emerald-50">{ayah.textArabic}</span><span className="mx-1 inline-grid h-[1.55em] min-w-[1.55em] place-items-center rounded-full border border-[#bda66e] align-middle font-sans text-[.48em] leading-none text-[#8b7545]">{ayah.numberInSurah}</span>{' '}</span>)}</div>}
        </article>
        <div className="mx-auto mt-4 flex max-w-[820px] items-center justify-between text-xs text-slate-400"><span>{data?.ayahs?.[0]?.juz ? `Juz ${data.ayahs[0].juz}` : ''}</span><span className="font-semibold text-slate-500">{page} / {MADINAH_MUSHAF_PAGES}</span><span>{data?.ayahs?.[data.ayahs.length - 1]?.hizbQuarter ? `Hizb ${data.ayahs[data.ayahs.length - 1].hizbQuarter}` : ''}</span></div>
      </section>
    </main>
  </div>
}
