import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronRight, Copy, Eye,
  Gauge, Headphones, Minus, MoreVertical, Moon, Pause, Play, Plus, Repeat2, Search, Settings2,
  Share2, Sun, Volume2, X
} from 'lucide-react'
import ReaderNavigation from './ReaderNavigation.jsx'
import SingleAyahMode from './SingleAyahMode.jsx'
import { getSurah, RECITERS } from './quranApi'
import { getToken } from './authApi'
import { listBookmarks, getProgress, saveBookmark, removeBookmark, saveProgress } from './accountApi'
import {
  REPEAT_COUNTS, clampNumber, formatAudioTime, nextAyahNumber,
  normalizeRepeatCount, readingTheme
} from './readerUtils.js'

const getSurahNumber = () => {
  const match = window.location.pathname.match(/^\/surah\/(\d+)\/?$/)
  const value = Number(match?.[1])
  return Number.isInteger(value) && value >= 1 && value <= 114 ? value : 1
}

const STORAGE_KEY = 'tarteel:surah-detail:v3'
const DEFAULT_SETTINGS = {
  arabicSize: 34,
  translationSize: 16,
  lineSpacing: 2.1,
  arabicFont: 'uthmani',
  translationVisible: true,
  theme: 'auto',
  focusMode: false,
  tajweed: false,
  reciter: 'ar.alafasy',
  speed: 1,
  repeatMode: 'ayah',
  repeatCount: 1,
  rangeStart: 1,
  rangeEnd: 1
}

const getState = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
const saveState = value => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch {}
}
const getInitialSettings = () => ({ ...DEFAULT_SETTINGS, ...(getState().settings || {}) })
const getInitialBookmarks = () => getState().bookmarks || {}
const getInitialMemorized = () => getState().memorized || {}

const FONT_OPTIONS = [
  { value: 'uthmani', label: 'Uthmani', family: 'Amiri, Noto Naskh Arabic, serif' },
  { value: 'naskh', label: 'Naskh', family: 'Noto Naskh Arabic, Amiri, serif' },
  { value: 'system', label: 'System', family: 'system-ui, sans-serif' }
]

function highlightText(text, query) {
  const value = query.trim()
  if (!value) return text
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = String(text).split(new RegExp(`(${escaped})`, 'ig'))
  return parts.map((part, index) => part.toLowerCase() === value.toLowerCase()
    ? <mark key={index} className="rounded bg-amber-200 px-0.5 text-inherit">{part}</mark>
    : part)
}

const mergeRemoteBookmarks = (current, remote) => {
  const next = { ...current }
  for (const item of remote || []) {
    const surahNumber = Number(item?.ayah?.surah?.number)
    const ayahNumber = Number(item?.ayah?.number)
    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114 || !Number.isInteger(ayahNumber) || ayahNumber < 1) continue
    next[surahNumber] = { ...(next[surahNumber] || {}), [ayahNumber]: { timestamp: item?.createdAt || new Date().toISOString(), readingPosition: ayahNumber } }
  }
  return next
}

export default function SurahDetail() {
  const surahNumber = getSurahNumber()
  const initialSettings = getInitialSettings()
  const [surah, setSurah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(initialSettings)
  const [playing, setPlaying] = useState(false)
  const [activeAyah, setActiveAyah] = useState(() => Number(getState()[surahNumber]) || 1)
  const [bookmarks, setBookmarks] = useState(getInitialBookmarks)
  const [memorized, setMemorized] = useState(getInitialMemorized)
  const [actionOpen, setActionOpen] = useState(null)
  const [repeatsDone, setRepeatsDone] = useState(0)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
  const [copied, setCopied] = useState(false)
  const audioRef = useRef(null)
  const activeAyahRef = useRef(activeAyah)
  const settingsRef = useRef(settings)
  const surahRef = useRef(surah)

  const theme = readingTheme(settings.theme, systemDark)
  const isDark = theme === 'dark'
  const readingSurface = isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#f7faf8] text-slate-900'
  const cardSurface = isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600'

  useEffect(() => { activeAyahRef.current = activeAyah }, [activeAyah])
  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => { surahRef.current = surah }, [surah])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined
    const listener = event => setSystemDark(event.matches)
    media.addEventListener?.('change', listener)
    return () => media.removeEventListener?.('change', listener)
  }, [])

  useEffect(() => { saveState({ ...getState(), settings }) }, [settings])

  useEffect(() => {
    const token = getToken()
    if (!token) return undefined
    let cancelled = false
    Promise.all([listBookmarks(token), getProgress(token)]).then(([remoteBookmarks, progress]) => {
      if (cancelled) return
      setBookmarks(current => {
        const merged = mergeRemoteBookmarks(current, remoteBookmarks)
        saveState({ ...getState(), bookmarks: merged, settings, memorized })
        return merged
      })
      if (Number(progress?.surahNumber) === surahNumber && Number.isInteger(Number(progress?.ayahNumber)) && Number(progress.ayahNumber) > 0) {
        const next = Number(progress.ayahNumber)
        activeAyahRef.current = next
        setActiveAyah(next)
        saveState({ ...getState(), [surahNumber]: next, settings, bookmarks: getState().bookmarks || bookmarks, memorized })
      }
    }).catch(() => {
      // Cloud sync is intentionally non-blocking. Local reader state remains authoritative offline.
    })
    return () => { cancelled = true }
  }, [surahNumber])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    audioRef.current?.pause()
    setPlaying(false)
    getSurah(surahNumber, { signal: controller.signal, reciter: settings.reciter })
      .then(data => {
        setSurah(data)
        setActiveAyah(current => Math.min(Math.max(current, 1), data.ayahs.length))
        setSettings(current => ({
          ...current,
          rangeStart: clampNumber(current.rangeStart, 1, data.ayahs.length),
          rangeEnd: clampNumber(Math.max(current.rangeEnd, current.rangeStart), 1, data.ayahs.length)
        }))
      })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message || 'Unable to load this Surah.') })
      .finally(() => setLoading(false))
    return () => { controller.abort(); audioRef.current?.pause() }
  }, [surahNumber, settings.reciter])

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
        setActionOpen(null)
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === ' ') {
        event.preventDefault()
        if (surahRef.current) toggleAudio(surahRef.current.ayahs.find(item => item.numberInSurah === activeAyahRef.current))
      }
      if (event.key === 'ArrowRight' && surahRef.current) scrollToAyah(nextAyahNumber(activeAyahRef.current, surahRef.current.ayahCount, 1))
      if (event.key === 'ArrowLeft' && surahRef.current) scrollToAyah(nextAyahNumber(activeAyahRef.current, surahRef.current.ayahCount, -1))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const filteredAyahs = useMemo(() => {
    if (!surah) return []
    const value = query.trim().toLowerCase()
    if (!value) return surah.ayahs
    return surah.ayahs.filter(ayah =>
      String(ayah.numberInSurah).includes(value) ||
      ayah.textArabic.includes(query.trim()) ||
      ayah.translation.toLowerCase().includes(value)
    )
  }, [surah, query])

  const currentAyah = surah?.ayahs.find(ayah => ayah.numberInSurah === activeAyah) || null
  const repeatCount = normalizeRepeatCount(settings.repeatCount)
  const repeatMode = settings.repeatMode
  const rangeStart = clampNumber(settings.rangeStart, 1, surah?.ayahCount || 1)
  const rangeEnd = clampNumber(Math.max(settings.rangeEnd, rangeStart), 1, surah?.ayahCount || 1)
  const selectedReciter = RECITERS.find(item => item.id === settings.reciter) || RECITERS[0]

  const persistPosition = number => {
    saveState({ ...getState(), [surahNumber]: number, bookmarks, settings, memorized })
    const token = getToken()
    if (token) void saveProgress(token, surahNumber, number).catch(() => {})
  }

  const setAyah = number => {
    const next = clampNumber(number, 1, surah?.ayahCount || 1)
    activeAyahRef.current = next
    setActiveAyah(next)
    persistPosition(next)
  }

  const scrollToAyah = number => {
    setAyah(number)
    requestAnimationFrame(() => document.getElementById(`ayah-${number}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const playAyah = (ayah, preserveRepeat = false) => {
    if (!ayah?.audioUrl) { setError('Audio is not available for this ayah.'); return }
    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    audio.src = ayah.audioUrl
    audio.volume = volume
    audio.playbackRate = Number(settings.speed) || 1
    if (!preserveRepeat) setRepeatsDone(0)
    audio.play().then(() => {
      setActiveAyah(ayah.numberInSurah)
      activeAyahRef.current = ayah.numberInSurah
      setPlaying(true)
      setError('')
      persistPosition(ayah.numberInSurah)
      requestAnimationFrame(() => document.getElementById(`ayah-${ayah.numberInSurah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }).catch(() => setError('Audio could not start. Please try again.'))
  }

  const stopAudio = () => { audioRef.current?.pause(); setPlaying(false) }

  const toggleAudio = ayah => {
    if (!ayah) return
    const audio = audioRef.current
    if (playing && audio) { stopAudio(); return }
    if (audio?.src === ayah.audioUrl && audio.currentTime > 0 && audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => setError('Audio could not resume.'))
      return
    }
    playAyah(ayah)
  }

  const handleAudioEnded = () => {
    const data = surahRef.current
    const current = activeAyahRef.current
    const currentSettings = settingsRef.current
    if (!data) return

    if (currentSettings.repeatMode === 'ayah') {
      const count = normalizeRepeatCount(currentSettings.repeatCount)
      if (count === Infinity || repeatsDone + 1 < count) {
        setRepeatsDone(value => value + 1)
        const ayah = data.ayahs.find(item => item.numberInSurah === current)
        if (ayah) playAyah(ayah, true)
        return
      }
    }

    setRepeatsDone(0)
    if (currentSettings.repeatMode === 'range') {
      const start = clampNumber(currentSettings.rangeStart, 1, data.ayahCount)
      const end = clampNumber(Math.max(currentSettings.rangeEnd, start), 1, data.ayahCount)
      if (current < end) {
        const next = data.ayahs.find(item => item.numberInSurah === current + 1)
        if (next) playAyah(next, true)
      } else {
        const first = data.ayahs.find(item => item.numberInSurah === start)
        if (first) playAyah(first, true)
      }
      return
    }

    if (current < data.ayahCount) {
      const next = data.ayahs.find(item => item.numberInSurah === current + 1)
      if (next) playAyah(next, true)
    } else setPlaying(false)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined
    audio.onended = handleAudioEnded
    audio.ontimeupdate = () => setAudioTime(audio.currentTime)
    audio.onloadedmetadata = () => setAudioDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    audio.onerror = () => setError('Audio could not be loaded. Check your connection and try again.')
    return () => { audio.onended = null; audio.ontimeupdate = null; audio.onloadedmetadata = null; audio.onerror = null }
  })

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
      audioRef.current.playbackRate = Number(settings.speed) || 1
    }
  }, [volume, settings.speed])

  const toggleBookmark = ayahNumber => {
    const next = { ...bookmarks }
    const existing = next[surahNumber] || {}
    const removing = Boolean(existing[ayahNumber])
    if (removing) delete next[surahNumber][ayahNumber]
    else next[surahNumber] = { ...existing, [ayahNumber]: { timestamp: new Date().toISOString(), readingPosition: ayahNumber } }
    if (next[surahNumber] && Object.keys(next[surahNumber]).length === 0) delete next[surahNumber]
    setBookmarks(next)
    saveState({ ...getState(), bookmarks: next, [surahNumber]: activeAyah, settings, memorized })

    const token = getToken()
    const ayah = surahRef.current?.ayahs.find(item => item.numberInSurah === ayahNumber)
    if (token && ayah?.number) {
      const operation = removing ? removeBookmark(token, ayah.number) : saveBookmark(token, ayah.number)
      void operation.catch(() => {
        // Keep the local bookmark even if the network is temporarily unavailable.
      })
    }
  }

  const toggleMemorized = ayahNumber => {
    const next = { ...memorized, [surahNumber]: { ...(memorized[surahNumber] || {}) } }
    if (next[surahNumber][ayahNumber]) delete next[surahNumber][ayahNumber]
    else next[surahNumber][ayahNumber] = { markedAt: new Date().toISOString() }
    setMemorized(next)
    saveState({ ...getState(), memorized: next, bookmarks, settings, [surahNumber]: activeAyah })
  }

  const copyAyah = async ayah => {
    try {
      await navigator.clipboard.writeText(`${ayah.textArabic}\n\n${ayah.translation}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch { setError('Copy is not available in this browser.') }
  }

  const shareAyah = async ayah => {
    const text = `${surah.name} ${surah.number}:${ayah.numberInSurah}\n${ayah.textArabic}\n\n${ayah.translation}`
    try {
      if (navigator.share) await navigator.share({ title: `${surah.name} ${ayah.numberInSurah}`, text })
      else await navigator.clipboard.writeText(text)
    } catch (err) { if (err?.name !== 'AbortError') setError('Sharing is not available here.') }
  }

  const updateSetting = (key, value) => setSettings(current => ({ ...current, [key]: value }))
  const setRepeatCount = value => updateSetting('repeatCount', normalizeRepeatCount(value))
  const previousSurah = surahNumber > 1 ? surahNumber - 1 : null
  const nextSurah = surahNumber < 114 ? surahNumber + 1 : null

  const playerPrevious = () => {
    if (!surah) return
    const target = nextAyahNumber(activeAyah, surah.ayahCount, -1)
    const ayah = surah.ayahs.find(item => item.numberInSurah === target)
    if (ayah) playAyah(ayah)
  }
  const playerNext = () => {
    if (!surah) return
    const target = nextAyahNumber(activeAyah, surah.ayahCount, 1)
    const ayah = surah.ayahs.find(item => item.numberInSurah === target)
    if (ayah) playAyah(ayah)
  }

  if (settings.focusMode && surah && currentAyah) {
    const font = FONT_OPTIONS.find(item => item.value === settings.arabicFont) || FONT_OPTIONS[0]
    return <SingleAyahMode
      surah={surah}
      ayah={currentAyah}
      playing={playing}
      onPlay={() => toggleAudio(currentAyah)}
      onPrevious={playerPrevious}
      onNext={playerNext}
      onExit={() => updateSetting('focusMode', false)}
      translationVisible={settings.translationVisible}
      translationSize={settings.translationSize}
      arabicSize={settings.arabicSize}
      arabicFontFamily={font.family}
      lineSpacing={settings.lineSpacing}
      isDark={isDark}
      reciter={selectedReciter.name}
      speed={settings.speed}
      onOpenSettings={() => setSettingsOpen(true)}
      onMarkMemorized={() => toggleMemorized(currentAyah.numberInSurah)}
      memorized={Boolean(memorized[surahNumber]?.[currentAyah.numberInSurah])}
      hasPrevious={activeAyah > 1}
      hasNext={activeAyah < surah.ayahCount}
    />
  }

  return <div className={`min-h-screen transition-colors ${readingSurface}`}>
    {!settings.focusMode && <ReaderNavigation />}
    <main className="min-h-screen lg:ml-[272px]">
      <div className="mx-auto max-w-5xl px-4 py-5 pb-28 sm:px-6 lg:py-8">
        <div className="flex items-center justify-between gap-3">
          <a href="/" className={`inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold ${mutedText} hover:bg-white/70`}><ArrowLeft size={17}/> Back to Index</a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => updateSetting('focusMode', true)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>Single Ayah</button>
            <button type="button" onClick={() => setSettingsOpen(value => !value)} aria-expanded={settingsOpen} aria-controls="reader-settings" aria-label="Open reader controls" className={`grid h-10 w-10 place-items-center rounded-xl ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}><Settings2 size={18}/></button>
          </div>
        </div>

        {settingsOpen && <ReadingSettings settings={settings} updateSetting={updateSetting} close={() => setSettingsOpen(false)} isDark={isDark} surahCount={surah?.ayahCount || 1} selectedReciter={selectedReciter}/>} 
        {error && <div role="alert" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
        {copied && <div role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">Ayah copied to clipboard.</div>}

        {loading ? <div className="mt-5 space-y-4"><div className="h-36 animate-pulse rounded-[2rem] bg-slate-200/70"/><div className="h-40 animate-pulse rounded-2xl bg-slate-200/70"/><div className="h-40 animate-pulse rounded-2xl bg-slate-200/70"/></div> : surah && <>
          <header className={`mt-3 rounded-[2rem] p-5 shadow-sm ring-1 sm:p-7 ${cardSurface}`}>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div><p className="text-sm font-semibold text-emerald-500">Surah {surah.number} · {surah.revelationType}</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{surah.name}</h1><p className={`mt-2 text-sm ${mutedText}`}>{surah.ayahCount} ayahs · {surah.translationName}</p></div>
              <div dir="rtl" lang="ar" className="font-arabic text-4xl">{surah.arabicName.replace(/^سُورَةُ\s*/, '')}</div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <label className={`flex flex-1 items-center rounded-xl border px-3 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}><Search size={17} className="text-slate-400"/><input aria-label="Search this Surah" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search ayahs in this Surah..." className="w-full bg-transparent px-2 py-3 text-sm outline-none"/></label>
              <button type="button" onClick={() => setSettingsOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><Headphones size={15}/> {selectedReciter.name}</button>
            </div>
            {query.trim() && <div className={`mt-3 text-xs font-semibold ${mutedText}`}>{filteredAyahs.length} {filteredAyahs.length === 1 ? 'result' : 'results'}</div>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4 dark:border-slate-800">
              <span className={`text-xs font-semibold ${mutedText}`}>Surah {surah.number} / 114 · {activeAyah} / {surah.ayahCount}</span>
              <div className="flex gap-2">
                {previousSurah && <a href={`/surah/${previousSurah}`} className={`rounded-lg px-3 py-2 text-xs font-semibold ${mutedText}`}>← Previous Surah</a>}
                {nextSurah && <a href={`/surah/${nextSurah}`} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Next Surah →</a>}
              </div>
            </div>
          </header>

          <section className="mt-5 space-y-3" aria-label={`${surah.name} ayahs`}>
            {filteredAyahs.map(ayah => {
              const isActive = ayah.numberInSurah === activeAyah
              const bookmarked = Boolean(bookmarks[surahNumber]?.[ayah.numberInSurah])
              const markedMemorized = Boolean(memorized[surahNumber]?.[ayah.numberInSurah])
              const inRepeatRange = ayah.numberInSurah >= rangeStart && ayah.numberInSurah <= rangeEnd
              return <article key={ayah.number} id={`ayah-${ayah.numberInSurah}`} className={`rounded-2xl border p-5 shadow-sm transition sm:p-7 ${cardSurface} ${isActive ? 'border-emerald-400 ring-2 ring-emerald-400/20' : ''} ${repeatMode === 'range' && inRepeatRange ? 'bg-emerald-50/30' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => scrollToAyah(ayah.numberInSurah)} className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-bold ${isActive ? 'bg-emerald-600 text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`} aria-label={`Focus ayah ${ayah.numberInSurah}`}>{ayah.numberInSurah}</button>
                  <div className="relative flex items-center gap-1">
                    <button type="button" onClick={() => toggleBookmark(ayah.numberInSurah)} aria-label={bookmarked ? `Remove bookmark from ayah ${ayah.numberInSurah}` : `Bookmark ayah ${ayah.numberInSurah}`} className={`grid h-9 w-9 place-items-center rounded-lg ${bookmarked ? 'bg-amber-50 text-amber-600' : mutedText}`} title={bookmarked ? 'Bookmarked' : 'Bookmark'}>{bookmarked ? <BookmarkCheck size={17}/> : <Bookmark size={17}/>}</button>
                    <button type="button" onClick={() => toggleAudio(ayah)} aria-label={`${playing && isActive ? 'Pause' : 'Play'} ayah ${ayah.numberInSurah}`} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700">{playing && isActive ? <Pause size={16}/> : <Play size={16}/>}</button>
                    <button type="button" onClick={() => setActionOpen(value => value === ayah.numberInSurah ? null : ayah.numberInSurah)} aria-label={`More actions for ayah ${ayah.numberInSurah}`} aria-expanded={actionOpen === ayah.numberInSurah} className={`grid h-9 w-9 place-items-center rounded-lg ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}><MoreVertical size={17}/></button>
                    {actionOpen === ayah.numberInSurah && <AyahActions ayah={ayah} bookmarked={bookmarked} memorized={markedMemorized} onBookmark={() => toggleBookmark(ayah.numberInSurah)} onPlay={() => toggleAudio(ayah)} onCopy={() => copyAyah(ayah)} onShare={() => shareAyah(ayah)} onRepeat={() => { updateSetting('repeatMode', 'ayah'); setRepeatCount(repeatCount === 1 ? 3 : repeatCount === 3 ? 5 : repeatCount === 5 ? Infinity : 1); playAyah(ayah) }} onMemorize={() => toggleMemorized(ayah.numberInSurah)} onSingleAyah={() => { setAyah(ayah.numberInSurah); updateSetting('focusMode', true); setActionOpen(null) }} isDark={isDark}/>} 
                  </div>
                </div>
                <button type="button" onClick={() => setAyah(ayah.numberInSurah)} className="mt-5 block w-full text-right" aria-label={`Read ayah ${ayah.numberInSurah}`}>
                  <p dir="rtl" lang="ar" className="font-arabic text-right text-3xl sm:text-4xl" style={{ fontFamily: FONT_OPTIONS.find(item => item.value === settings.arabicFont)?.family, fontSize: `${settings.arabicSize}px`, lineHeight: settings.lineSpacing }}>{highlightText(ayah.textArabic, query)}</p>
                  {settings.translationVisible && <p className={`mt-5 text-left leading-7 ${mutedText}`} style={{ fontSize: `${settings.translationSize}px` }}>{highlightText(ayah.translation, query)}</p>}
                </button>
                {settings.tajweed && <p className="mt-3 text-right text-[11px] text-slate-400">Tajweed highlighting will activate when verified color-coded recitation data is available.</p>}
                {markedMemorized && <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><Check size={13}/> Memorized</div>}
              </article>
            })}
            {filteredAyahs.length === 0 && <div className={`rounded-2xl border border-dashed p-10 text-center text-sm ${cardSurface} ${mutedText}`}>No ayahs match “{query}”.</div>}
          </section>

          <footer className={`sticky bottom-3 z-20 mt-5 flex items-center justify-between gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur ${isDark ? 'border-slate-700 bg-slate-900/90' : 'border-slate-200 bg-white/90'}`}>
            <button type="button" onClick={playerPrevious} disabled={!surah || activeAyah <= 1} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-40" aria-label="Previous ayah"><ChevronLeft size={18}/></button>
            <button type="button" onClick={() => toggleAudio(currentAyah)} disabled={!currentAyah} className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-700 text-white shadow-lg disabled:opacity-50" aria-label={playing ? 'Pause recitation' : 'Play recitation'}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2 text-xs font-semibold"><span>Ayah {activeAyah}</span><span>{formatAudioTime(audioTime)} / {formatAudioTime(audioDuration)}</span></div><input aria-label="Recitation progress" type="range" min="0" max={audioDuration || 0} step="0.1" value={Math.min(audioTime, audioDuration || 0)} onChange={event => { if (audioRef.current) audioRef.current.currentTime = Number(event.target.value); setAudioTime(Number(event.target.value)) }} className="mt-1 w-full accent-emerald-700"/></div>
            <button type="button" onClick={playerNext} disabled={!surah || activeAyah >= surah.ayahCount} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-40" aria-label="Next ayah"><ChevronRight size={18}/></button>
          </footer>
        </>}
      </div>
    </main>
  </div>
}

function AyahActions({ ayah, bookmarked, memorized, onBookmark, onPlay, onCopy, onShare, onRepeat, onMemorize, onSingleAyah, isDark }) {
  return <div className={`absolute right-0 top-11 z-40 w-56 rounded-2xl border p-2 shadow-xl ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
    <button onClick={onBookmark} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"><Bookmark size={15}/>{bookmarked ? 'Remove bookmark' : 'Bookmark ayah'}</button>
    <button onClick={onPlay} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"><Play size={15}/> Play ayah</button>
    <button onClick={onRepeat} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"><Repeat2 size={15}/> Repeat</button>
    <button onClick={onMemorize} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"><Check size={15}/>{memorized ? 'Unmark memorized' : 'Mark memorized'}</button>
    <button onClick={onCopy} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"><Copy size={15}/> Copy</button>
    <button onClick={onShare} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"><Share2 size={15}/> Share</button>
    <button onClick={onSingleAyah} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"><Eye size={15}/> Single Ayah focus</button>
  </div>
}

function SettingRow({ label, children }) { return <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>{children}</label> }

function ReadingSettings({ settings, updateSetting, close, isDark, surahCount, selectedReciter }) {
  return <section id="reader-settings" className={`mt-4 rounded-2xl border p-4 shadow-sm ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
    <div className="flex items-center justify-between"><div><h2 className="font-bold">Reader controls</h2><p className="text-xs text-slate-500">Tune text, audio and repeat behaviour.</p></div><button onClick={close} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600" aria-label="Close reader controls"><X size={17}/></button></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <SettingRow label={`Arabic size · ${settings.arabicSize}px`}><div className="flex items-center gap-2"><button type="button" className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100" onClick={() => updateSetting('arabicSize', Math.max(28, settings.arabicSize - 2))}><Minus size={15}/></button><input type="range" min="28" max="72" value={settings.arabicSize} onChange={e => updateSetting('arabicSize', Number(e.target.value))} className="w-full accent-emerald-700"/><button type="button" className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100" onClick={() => updateSetting('arabicSize', Math.min(72, settings.arabicSize + 2))}><Plus size={15}/></button></div></SettingRow>
      <SettingRow label={`Translation size · ${settings.translationSize}px`}><input type="range" min="12" max="24" value={settings.translationSize} onChange={e => updateSetting('translationSize', Number(e.target.value))} className="w-full accent-emerald-700"/></SettingRow>
      <SettingRow label="Arabic font"><select value={settings.arabicFont} onChange={e => updateSetting('arabicFont', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="uthmani">Uthmani</option><option value="naskh">Naskh</option><option value="system">System</option></select></SettingRow>
      <SettingRow label="Theme"><select value={settings.theme} onChange={e => updateSetting('theme', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="auto">System</option><option value="light">Light</option><option value="dark">Dark</option></select></SettingRow>
      <SettingRow label="Reciter"><select value={settings.reciter} onChange={e => updateSetting('reciter', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">{RECITERS.map(item => <option key={item.id} value={item.id}>{item.name} · {item.style}</option>)}</select></SettingRow>
      <SettingRow label={`Playback speed · ${settings.speed}×`}><input type="range" min="0.75" max="1.5" step="0.25" value={settings.speed} onChange={e => updateSetting('speed', Number(e.target.value))} className="w-full accent-emerald-700"/></SettingRow>
      <SettingRow label="Repeat mode"><select value={settings.repeatMode} onChange={e => updateSetting('repeatMode', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="ayah">Current ayah</option><option value="surah">Continue through Surah</option><option value="range">Ayah range</option></select></SettingRow>
      {settings.repeatMode === 'range' && <><SettingRow label={`Range start · ${settings.rangeStart}`}><input type="range" min="1" max={surahCount} value={settings.rangeStart} onChange={e => updateSetting('rangeStart', Number(e.target.value))} className="w-full accent-emerald-700"/></SettingRow><SettingRow label={`Range end · ${settings.rangeEnd}`}><input type="range" min="1" max={surahCount} value={settings.rangeEnd} onChange={e => updateSetting('rangeEnd', Number(e.target.value))} className="w-full accent-emerald-700"/></SettingRow></>}
    </div>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => updateSetting('translationVisible', !settings.translationVisible)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold">{settings.translationVisible ? 'Hide translation' : 'Show translation'}</button><button type="button" onClick={() => updateSetting('tajweed', !settings.tajweed)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold">Tajweed {settings.tajweed ? 'on' : 'off'}</button><span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{selectedReciter.name}</span></div>
  </section>
}
