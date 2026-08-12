import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Headphones, LogIn, LogOut, Menu, Pause, Play, Search, UserRound, X } from 'lucide-react'
import { getSurah, listSurahs } from './quranApi'
import { getMe, getProgress, listBookmarks, login, register, removeBookmark, saveBookmark, saveProgress } from './accountApi'
import { clampAyahIndex, filterSurahs, parseAyahNumber, progressPercent } from './readerUtils.js'

const STORAGE_KEY = 'tarteel:reader:v2'
const TOKEN_KEY = 'tarteel:auth-token'
const DEFAULT_SURAH = 1

const readState = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
const writeState = patch => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...patch })) } catch {}
}
const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}
const setToken = token => { try { localStorage.setItem(TOKEN_KEY, token) } catch {} }
const clearToken = () => { try { localStorage.removeItem(TOKEN_KEY) } catch {} }

function AppReader() {
  const saved = readState()
  const [catalog, setCatalog] = useState([])
  const [selectedSurah, setSelectedSurah] = useState(Number(saved.surahNumber) || DEFAULT_SURAH)
  const [surah, setSurah] = useState(null)
  const [ayahIndex, setAyahIndex] = useState(Math.max(0, Number(saved.ayahNumber || 1) - 1))
  const [query, setQuery] = useState('')
  const [ayahInput, setAyahInput] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [loadingSurah, setLoadingSurah] = useState(true)
  const [error, setError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [bookmarks, setBookmarks] = useState(() => readState().bookmarks || [])
  const audioRef = useRef(null)

  const filtered = useMemo(() => filterSurahs(catalog, query), [catalog, query])
  const currentAyah = surah?.ayahs?.[ayahIndex]
  const bookmarked = currentAyah ? bookmarks.includes(currentAyah.number) : false
  const currentBookmarks = useMemo(() => surah?.ayahs?.filter(ayah => bookmarks.includes(ayah.number)) || [], [surah, bookmarks])

  const stopAudio = () => {
    audioRef.current?.pause()
    if (audioRef.current) audioRef.current.onended = null
    setPlaying(false)
  }

  useEffect(() => {
    const controller = new AbortController()
    listSurahs({ signal: controller.signal }).then(setCatalog).catch(err => {
      if (err.name !== 'AbortError') setError('The Quran catalog is unavailable. Check your connection and retry.')
    }).finally(() => setLoadingCatalog(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    let cancelled = false
    const token = readToken()
    if (!token) return
    Promise.all([getMe(token), getProgress(token)]).then(([nextUser, progress]) => {
      if (cancelled) return
      setUser(nextUser)
      if (progress?.surahNumber && progress?.ayahNumber) {
        writeState({ surahNumber: progress.surahNumber, ayahNumber: progress.ayahNumber })
        setSelectedSurah(progress.surahNumber)
      }
    }).catch(() => {
      if (!cancelled) clearToken()
    })
    listBookmarks(token).then(data => {
      if (cancelled) return
      const ids = data.map(item => item.ayah.id)
      setBookmarks(ids)
      writeState({ bookmarks: ids })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    stopAudio()
    setLoadingSurah(true)
    setError('')
    getSurah(selectedSurah, { signal: controller.signal }).then(data => {
      setSurah(data)
      const state = readState()
      const savedAyah = selectedSurah === Number(state.surahNumber) ? Number(state.ayahNumber || 1) : 1
      setAyahIndex(clampAyahIndex(savedAyah - 1, data.ayahs.length))
      setAyahInput('')
    }).catch(err => {
      if (err.name !== 'AbortError') setError(`Unable to load this Surah. ${err.message}`)
    }).finally(() => setLoadingSurah(false))
    return () => controller.abort()
  }, [selectedSurah])

  useEffect(() => () => audioRef.current?.pause(), [])

  useEffect(() => {
    if (!surah || !currentAyah) return
    writeState({ surahNumber: surah.number, ayahNumber: currentAyah.numberInSurah, bookmarks })
    const token = readToken()
    if (token) saveProgress(token, surah.number, currentAyah.numberInSurah).catch(() => {})
  }, [surah, currentAyah])

  useEffect(() => {
    const onKeyDown = event => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); moveAyah(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); moveAyah(1) }
      if (event.key === ' ') { event.preventDefault(); toggleAudio() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const playAyah = () => {
    if (!currentAyah?.audioUrl) return
    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    audio.src = currentAyah.audioUrl
    audio.onended = () => {
      if (surah && ayahIndex < surah.ayahs.length - 1) setAyahIndex(index => index + 1)
      else setPlaying(false)
    }
    audio.play().then(() => setPlaying(true)).catch(() => setError('Audio could not start. Tap play again or check your connection.'))
  }
  const toggleAudio = () => playing ? stopAudio() : playAyah()
  const moveAyah = delta => { if (!surah) return; stopAudio(); setAyahIndex(index => clampAyahIndex(index + delta, surah.ayahs.length)) }
  const selectSurah = number => { stopAudio(); setSelectedSurah(number); setQuery(''); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const jumpToAyah = event => {
    event.preventDefault()
    if (!surah) return
    const number = parseAyahNumber(ayahInput, surah.ayahs.length)
    if (!number) return setError(`Enter an ayah number from 1 to ${surah.ayahs.length}.`)
    stopAudio(); setAyahIndex(number - 1); setAyahInput('')
  }
  const toggleBookmark = async () => {
    if (!currentAyah) return
    const next = new Set(bookmarks)
    const token = readToken()
    try {
      if (next.has(currentAyah.number)) {
        next.delete(currentAyah.number)
        if (token) await removeBookmark(token, currentAyah.number)
      } else {
        next.add(currentAyah.number)
        if (token) await saveBookmark(token, currentAyah.number)
      }
      const ids = [...next]
      setBookmarks(ids)
      writeState({ bookmarks: ids })
    } catch (err) { setError(err.message) }
  }
  const onAuthenticated = async (nextUser, token) => {
    setToken(token)
    setUser(nextUser)
    try {
      const [remoteBookmarks, progress] = await Promise.all([listBookmarks(token), getProgress(token)])
      const ids = remoteBookmarks.map(item => item.ayah.id)
      setBookmarks(ids)
      const patch = { bookmarks: ids }
      if (progress?.surahNumber && progress?.ayahNumber) {
        patch.surahNumber = progress.surahNumber
        patch.ayahNumber = progress.ayahNumber
        setSelectedSurah(progress.surahNumber)
      }
      writeState(patch)
    } catch {}
    setAccountOpen(false)
  }
  const logout = () => { clearToken(); setUser(null); setAccountOpen(false) }

  return <div className="min-h-screen bg-[#f7faf8] text-slate-900">
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button className="flex items-center gap-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Tarteel home"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-700 text-white"><BookOpen size={20}/></span><span className="text-xl font-bold tracking-tight">Tarteel</span></button>
        <nav className="hidden items-center gap-1 md:flex"><span className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">Quran Reader</span><a className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50" href="#memorize">Memorize</a><a className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50" href="#progress">Progress</a></nav>
        <div className="flex items-center gap-2"><label className="hidden items-center rounded-xl border border-slate-200 bg-white px-3 sm:flex"><Search size={17} className="text-slate-400"/><input aria-label="Search Surahs" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Surah..." className="w-32 bg-transparent px-2 py-2.5 text-sm outline-none lg:w-44"/></label><button className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600" onClick={() => setAccountOpen(value => !value)} aria-label="Account">{user ? <UserRound size={18}/> : <LogIn size={18}/>}</button><button className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 md:hidden" onClick={() => setMenuOpen(value => !value)} aria-label="Open navigation">{menuOpen ? <X/> : <Menu/>}</button></div>
      </div>
      {menuOpen && <div className="border-t border-slate-100 bg-white p-3 md:hidden"><label className="mb-2 flex items-center rounded-xl border border-slate-200 px-3"><Search size={17} className="text-slate-400"/><input aria-label="Search Surahs" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Surah..." className="w-full px-2 py-3 outline-none"/></label><a href="#memorize" className="block rounded-xl px-4 py-3 font-medium" onClick={() => setMenuOpen(false)}>Memorize</a><a href="#progress" className="block rounded-xl px-4 py-3 font-medium" onClick={() => setMenuOpen(false)}>Progress</a></div>}
    </header>
    {accountOpen && <AccountPanel user={user} onAuthenticated={onAuthenticated} onLogout={logout} onClose={() => setAccountOpen(false)}/>} 
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#075e4a] via-[#0b765d] to-[#0d8a6b] p-6 text-white shadow-xl sm:p-9"><p className="text-sm font-medium text-emerald-100">Read · Listen · Reflect</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">The Quran, one ayah at a time.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">Live Uthmani Arabic, Saheeh International translation and Alafasy recitation, with local caching and optional account sync.</p></section>
      {error && <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><CircleAlert className="mt-0.5 shrink-0" size={18}/><div className="flex-1">{error}</div><button className="font-semibold underline" onClick={() => setError('')}>Dismiss</button></div>}
      <section className="mt-7 grid gap-6 lg:grid-cols-[.78fr_1.5fr]">
        <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between px-2 py-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Index</p><h2 className="text-xl font-bold">114 Surahs</h2></div><span className="text-xs text-slate-400">{filtered.length} shown</span></div><div className="mt-2 max-h-[680px] overflow-auto pr-1" aria-label="Surah list">{loadingCatalog ? Array.from({ length: 8 }).map((_, index) => <div key={index} className="mb-2 h-14 animate-pulse rounded-xl bg-slate-100"/>) : filtered.map(item => <button key={item.number} onClick={() => selectSurah(item.number)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selectedSurah === item.number ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50'}`} aria-current={selectedSurah === item.number ? 'page' : undefined}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{item.number}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.englishName}</b><span className="text-xs text-slate-400">{item.numberOfAyahs} ayahs · {item.revelationType}</span></span><span dir="rtl" className="font-arabic text-base text-slate-600">{item.name.replace(/^سُورَةُ\s*/, '')}</span></button>)}</div></aside>
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {loadingSurah ? <div className="space-y-5"><div className="h-20 animate-pulse rounded-2xl bg-slate-100"/><div className="h-72 animate-pulse rounded-2xl bg-slate-100"/><div className="h-10 animate-pulse rounded-xl bg-slate-100"/></div> : surah ? <>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5"><div><p className="text-sm font-semibold text-emerald-700">Surah {surah.number} · {surah.revelationType}</p><h2 className="mt-1 text-3xl font-bold">{surah.name}</h2><p className="mt-1 text-sm text-slate-500">{surah.ayahCount} ayahs · {surah.translationName}</p></div><div dir="rtl" className="font-arabic text-3xl text-slate-700">{surah.arabicName.replace(/^سُورَةُ\s*/, '')}</div></div>
            <div className="my-7 rounded-2xl bg-[#fbfaf6] p-5 ring-1 ring-[#eee9dc] sm:p-7"><div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-400"><span>AYAH {currentAyah?.numberInSurah}</span><span>JUZ {currentAyah?.juz}</span></div><p dir="rtl" lang="ar" className="mt-5 font-arabic text-3xl leading-[2.25] text-slate-900 sm:text-4xl">{currentAyah?.textArabic}</p><p className="mt-6 text-sm leading-7 text-slate-600 sm:text-base">{currentAyah?.translation}</p></div>
            <div className="flex flex-wrap items-center gap-2"><button onClick={() => moveAyah(-1)} disabled={ayahIndex === 0} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous ayah"><ChevronLeft size={16}/> Previous</button><button onClick={toggleAudio} disabled={!currentAyah?.audioUrl} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{playing ? <Pause size={16}/> : <Play size={16} fill="currentColor"/>}{playing ? 'Pause' : 'Listen'}</button><button onClick={toggleBookmark} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${bookmarked ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200'}`} aria-pressed={bookmarked}>{bookmarked ? '★ Bookmarked' : '☆ Bookmark'}</button><button onClick={() => moveAyah(1)} disabled={ayahIndex === surah.ayahs.length - 1} className="ml-auto inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={16}/></button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"><form onSubmit={jumpToAyah} className="flex items-center gap-2"><label htmlFor="ayah-jump" className="sr-only">Go to ayah</label><input id="ayah-jump" inputMode="numeric" pattern="[0-9]*" value={ayahInput} onChange={event => setAyahInput(event.target.value)} placeholder={`Go to ayah 1–${surah.ayahs.length}`} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/><button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Go</button></form><div className="flex items-center justify-end gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500"><span>Keys: ← → Space</span></div></div>
            <div className="mt-7 rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center justify-between text-xs text-slate-500"><span>Reading position</span><span>{ayahIndex + 1} / {surah.ayahs.length} · {progressPercent(ayahIndex, surah.ayahs.length)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressPercent(ayahIndex, surah.ayahs.length)}><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progressPercent(ayahIndex, surah.ayahs.length)}%` }}/></div></div>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400"><Headphones size={14}/> Audio: Mishary Rashid Alafasy · Arabic: Uthmani · Translation: Saheeh International</div>
          </> : <div className="py-20 text-center text-sm text-slate-500">Select a Surah to begin reading.</div>}
        </article>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-emerald-700">Bookmarks</p><h2 className="mt-1 text-xl font-bold">{bookmarks.length} saved ayahs</h2></div><CheckCircle2 className="text-emerald-600" size={22}/></div>{currentBookmarks.length ? <div className="mt-4 flex flex-wrap gap-2">{currentBookmarks.map(ayah => <button key={ayah.number} onClick={() => { stopAudio(); setAyahIndex(ayah.numberInSurah - 1) }} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Ayah {ayah.numberInSurah}</button>)}</div> : <p className="mt-2 text-sm leading-6 text-slate-500">Save an ayah and it will appear here for quick review in this Surah.</p>}</div><div id="memorize" className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm font-semibold text-emerald-700">Memorization</p><h2 className="mt-1 text-xl font-bold">Use the reader as your review loop.</h2><p className="mt-2 text-sm leading-6 text-slate-500">Move ayah by ayah, replay recitation, and bookmark difficult passages. Account sync keeps your progress available across devices.</p></div><div id="progress" className="rounded-2xl border border-slate-200 bg-white p-5 md:col-span-2"><p className="text-sm font-semibold text-emerald-700">Continue reading</p><h2 className="mt-1 text-xl font-bold">Surah {readState().surahNumber || DEFAULT_SURAH}, ayah {readState().ayahNumber || 1}</h2><p className="mt-2 text-sm text-slate-500">{user ? `Synced to ${user.email}` : 'Saved on this device. Sign in to sync it.'}</p></div></section>
    </main>
    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6"><span>© 2026 Tarteel Quran Learning</span><span>Source: Al Quran Cloud · Uthmani · Saheeh International · Alafasy</span></div></footer>
  </div>
}

function AccountPanel({ user, onAuthenticated, onLogout, onClose }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (user) return <div className="fixed right-4 top-20 z-40 w-[min(92vw,360px)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Account</p><h2 className="mt-1 font-bold">{user.name || user.email}</h2><p className="mt-1 text-xs text-slate-500">Bookmarks and reading progress sync to your Tarteel account.</p></div><button onClick={onClose} aria-label="Close"><X size={18}/></button></div><button onClick={onLogout} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><LogOut size={16}/> Sign out</button></div>

  const submit = async event => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = mode === 'login' ? await login(email, password) : await register(email, password, name)
      await onAuthenticated(result.user, result.token)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return <div className="fixed right-4 top-20 z-40 w-[min(92vw,380px)] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Tarteel Account</p><h2 className="mt-1 text-xl font-bold">{mode === 'login' ? 'Sign in' : 'Create account'}</h2></div><button onClick={onClose} aria-label="Close"><X size={18}/></button></div><form onSubmit={submit} className="mt-5 space-y-3">{mode === 'register' && <input value={name} onChange={event => setName(event.target.value)} placeholder="Name (optional)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>}<input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/><input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Password (8+ characters)" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"/>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}<button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form><button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} className="mt-4 w-full text-center text-xs font-semibold text-emerald-700">{mode === 'login' ? 'New to Tarteel? Create an account' : 'Already have an account? Sign in'}</button></div>
}

export default AppReader
