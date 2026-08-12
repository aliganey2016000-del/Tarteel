import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronRight, Copy, Eye, EyeOff,
  Gauge, Headphones, Minus, MoreVertical, Pause, Play, Plus, Repeat2, Search, Settings2,
  Share2, Sun, Moon, Volume2, X
} from 'lucide-react'
import ReaderNavigation from './ReaderNavigation.jsx'
import { getSurah } from './quranApi'
import { REPEAT_COUNTS, clampNumber, formatAudioTime, nextAyahNumber, normalizeRepeatCount, readingTheme } from './readerUtils.js'

const getSurahNumber = () => {
  const match = window.location.pathname.match(/^\/surah\/(\d+)\/?$/)
  const value = Number(match?.[1])
  return Number.isInteger(value) && value >= 1 && value <= 114 ? value : 1
}

const STORAGE_KEY = 'tarteel:surah-detail:v2'
const DEFAULT_SETTINGS = {
  arabicSize: 34,
  translationSize: 16,
  lineSpacing: 2.1,
  arabicFont: 'uthmani',
  translationVisible: true,
  theme: 'auto',
  focusMode: false,
  tajweed: false
}

const loadState = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
const saveState = (value) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch {}
}
const getInitialSettings = () => ({ ...DEFAULT_SETTINGS, ...(loadState().settings || {}) })
const getInitialBookmarks = () => loadState().bookmarks || {}
const getInitialMemorized = () => loadState().memorized || {}

const FONT_OPTIONS = [
  { value: 'uthmani', label: 'Uthmani', family: 'Amiri, Noto Naskh Arabic, serif' },
  { value: 'naskh', label: 'Naskh', family: 'Noto Naskh Arabic, Amiri, serif' },
  { value: 'system', label: 'System', family: 'system-ui, sans-serif' }
]

function highlightText(text, query) {
  const value = query.trim()
  if (!value) return text
  const parts = String(text).split(new RegExp(`(${value.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')})`, 'ig'))
  return parts.map((part, index) => part.toLowerCase() === value.toLowerCase()
    ? <mark key={index} className="rounded bg-amber-200 px-0.5 text-inherit">{part}</mark>
    : part)
}

export default function SurahDetail() {
  const surahNumber = getSurahNumber()
  const [surah, setSurah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState(getInitialSettings)
  const [playing, setPlaying] = useState(false)
  const [activeAyah, setActiveAyah] = useState(() => Number(loadState()[surahNumber]) || 1)
  const [bookmarks, setBookmarks] = useState(getInitialBookmarks)
  const [memorized, setMemorized] = useState(getInitialMemorized)
  const [actionOpen, setActionOpen] = useState(null)
  const [repeatCount, setRepeatCount] = useState(1)
  const [repeatsDone, setRepeatsDone] = useState(0)
  const [audioTime, setAudioTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [translationCopied, setTranslationCopied] = useState(false)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
  const audioRef = useRef(null)
  const activeAyahRef = useRef(activeAyah)
  const repeatCountRef = useRef(repeatCount)
  const surahRef = useRef(surah)

  const theme = readingTheme(settings.theme, systemDark)
  const isDark = theme === 'dark'
  const readingSurface = isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#f7faf8] text-slate-900'
  const cardSurface = isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600'

  useEffect(() => { activeAyahRef.current = activeAyah }, [activeAyah])
  useEffect(() => { repeatCountRef.current = repeatCount }, [repeatCount])
  useEffect(() => { surahRef.current = surah }, [surah])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined
    const listener = event => setSystemDark(event.matches)
    media.addEventListener?.('change', listener)
    return () => media.removeEventListener?.('change', listener)
  }, [])

  useEffect(() => {
    saveState({ ...loadState(), settings })
  }, [settings])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    getSurah(surahNumber, { signal: controller.signal })
      .then(data => {
        setSurah(data)
        setActiveAyah(current => Math.min(Math.max(current, 1), data.ayahs.length))
      })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message || 'Unable to load this Surah.') })
      .finally(() => setLoading(false))
    return () => { controller.abort(); audioRef.current?.pause() }
  }, [surahNumber])

  const filteredAyahs = useMemo(() => {
    if (!surah) return []
    const value = query.trim().toLowerCase()
    if (!value) return surah.ayahs
    return surah.ayahs.filter(ayah => String(ayah.numberInSurah).includes(value) || ayah.textArabic.includes(query.trim()) || ayah.translation.toLowerCase().includes(value))
  }, [surah, query])

  const currentAyah = surah?.ayahs.find(ayah => ayah.numberInSurah === activeAyah) || null

  const persistPosition = number => {
    saveState({ ...loadState(), [surahNumber]: number, bookmarks, settings, memorized })
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
    audio.playbackRate = speed
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

  const handleAudioEnded = () => {
    const count = repeatCountRef.current
    const current = activeAyahRef.current
    const data = surahRef.current
    if (!data) return
    if (count === Infinity || repeatsDone + 1 < count) {
      setRepeatsDone(value => value + 1)
      const ayah = data.ayahs.find(item => item.numberInSurah === current)
      if (ayah) playAyah(ayah, true)
      return
    }
    setRepeatsDone(0)
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
      audioRef.current.playbackRate = speed
    }
  }, [volume, speed])

  const toggleBookmark = ayahNumber => {
    const next = { ...bookmarks }
    const existing = next[surahNumber] || {}
    if (existing[ayahNumber]) delete next[surahNumber][ayahNumber]
    else next[surahNumber] = { ...existing, [ayahNumber]: { timestamp: new Date().toISOString(), readingPosition: ayahNumber } }
    if (next[surahNumber] && Object.keys(next[surahNumber]).length === 0) delete next[surahNumber]
    setBookmarks(next)
    saveState({ ...loadState(), bookmarks: next, [surahNumber]: activeAyah, settings, memorized })
  }

  const toggleMemorized = ayahNumber => {
    const next = { ...memorized, [surahNumber]: { ...(memorized[surahNumber] || {}) } }
    if (next[surahNumber][ayahNumber]) delete next[surahNumber][ayahNumber]
    else next[surahNumber][ayahNumber] = { markedAt: new Date().toISOString() }
    setMemorized(next)
    saveState({ ...loadState(), memorized: next, bookmarks, settings, [surahNumber]: activeAyah })
  }

  const copyAyah = async ayah => {
    try {
      await navigator.clipboard.writeText(`${ayah.textArabic}\n\n${ayah.translation}`)
      setTranslationCopied(true)
      setTimeout(() => setTranslationCopied(false), 1400)
    } catch { setError('Copy is not available in this browser.') }
  }

  const shareAyah = async ayah => {
    const text = `${surah.name} ${surah.number}:${ayah.numberInSurah}\n${ayah.textArabic}\n\n${ayah.translation}`
    try {
      if (navigator.share) await navigator.share({ title: `${surah.name} ${ayah.numberInSurah}`, text })
      else await navigator.clipboard.writeText(text)
    } catch (err) { if (err?.name !== 'AbortError') setError('Sharing is not available here.') }
  }

  const changeRepeat = () => {
    const index = REPEAT_COUNTS.indexOf(repeatCount)
    setRepeatCount(REPEAT_COUNTS[(index + 1) % REPEAT_COUNTS.length])
    setRepeatsDone(0)
  }

  const updateSetting = (key, value) => setSettings(current => ({ ...current, [key]: value }))

  const previousSurah = surahNumber > 1 ? surahNumber - 1 : null
  const nextSurah = surahNumber < 114 ? surahNumber + 1 : null

  if (settings.focusMode) {
    // Focus mode intentionally keeps the reader shell mounted, but hides navigation and secondary chrome.
  }

  return <div className={`min-h-screen transition-colors ${readingSurface}`}>
    {!settings.focusMode && <ReaderNavigation />}
    <main className={settings.focusMode ? '' : 'min-h-screen lg:ml-[272px]'}>
      <div className={`mx-auto max-w-5xl px-4 py-5 sm:px-6 ${settings.focusMode ? 'lg:max-w-4xl lg:py-8' : 'lg:py-8'}`}>
        <div className="flex items-center justify-between gap-3">
          <a href="/" className={`inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold ${mutedText} hover:bg-white/70 dark:hover:bg-slate-900`}><ArrowLeft size={17}/> Back to Index</a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => updateSetting('focusMode', !settings.focusMode)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>{settings.focusMode ? 'Exit Focus' : 'Focus'}</button>
            <button type="button" onClick={() => setSettingsOpen(value => !value)} aria-expanded={settingsOpen} aria-controls="reader-settings" aria-label="Open reading settings" className={`grid h-10 w-10 place-items-center rounded-xl ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}><Settings2 size={18}/></button>
          </div>
        </div>

        {settingsOpen && <ReadingSettings settings={settings} updateSetting={updateSetting} close={() => setSettingsOpen(false)} isDark={isDark}/>} 

        {error && <div role="alert" className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>}
        {loading ? <div className="mt-5 space-y-4"><div className="h-36 animate-pulse rounded-[2rem] bg-slate-200/70"/><div className="h-40 animate-pulse rounded-2xl bg-slate-200/70"/><div className="h-40 animate-pulse rounded-2xl bg-slate-200/70"/></div> : surah && <>
          <header className={`mt-3 rounded-[2rem] p-5 shadow-sm ring-1 sm:p-7 ${cardSurface}`}>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div><p className="text-sm font-semibold text-emerald-500">Surah {surah.number} · {surah.revelationType}</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{surah.name}</h1><p className={`mt-2 text-sm ${mutedText}`}>{surah.ayahCount} ayahs · {surah.translationName}</p></div>
              <div dir="rtl" lang="ar" className="font-arabic text-4xl">{surah.arabicName.replace(/^سُورَةُ\s*/, '')}</div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <label className={`flex flex-1 items-center rounded-xl border px-3 ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50'}`}><Search size={17} className="text-slate-400"/><input aria-label="Search this Surah" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search ayahs in this Surah..." className="w-full bg-transparent px-2 py-3 text-sm outline-none"/></label>
              <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><Headphones size={15}/> Alafasy</span>
            </div>
            {query.trim() && <div className={`mt-3 text-xs font-semibold ${mutedText}`}>{filteredAyahs.length} {filteredAyahs.length === 1 ? 'result' : 'results'}</div>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4 dark:border-slate-800">
              <span className={`text-xs font-semibold ${mutedText}`}>Surah {surah.number} / 114</span>
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
              return <article key={ayah.number} id={`ayah-${ayah.numberInSurah}`} className={`rounded-2xl border p-5 shadow-sm transition sm:p-7 ${cardSurface} ${isActive ? 'border-emerald-400 ring-2 ring-emerald-400/20' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <button type="button" onClick={() => scrollToAyah(ayah.numberInSurah)} className={`grid h-9 w-9 place-items-center rounded-lg text-xs font-bold ${isActive ? 'bg-emerald-600 text-white' : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`} aria-label={`Focus ayah ${ayah.numberInSurah}`}>{ayah.numberInSurah}</button>
                  <div className="relative flex items-center gap-1">
                    <button type="button" onClick={() => toggleBookmark(ayah.numberInSurah)} aria-label={bookmarked ? `Remove bookmark from ayah ${ayah.numberInSurah}` : `Bookmark ayah ${ayah.numberInSurah}`} className={`grid h-9 w-9 place-items-center rounded-lg ${bookmarked ? 'bg-amber-50 text-amber-600' : mutedText}`} title={bookmarked ? 'Bookmarked' : 'Bookmark'}>{bookmarked ? <BookmarkCheck size={17}/> : <Bookmark size={17}/>}</button>
                    <button type="button" onClick={() => playAyah(ayah)} aria-label={`Play ayah ${ayah.numberInSurah}`} className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Play size={16}/></button>
                    <button type="button" onClick={() => setActionOpen(value => value === ayah.numberInSurah ? null : ayah.numberInSurah)} aria-label={`More actions for ayah ${ayah.numberInSurah}`} aria-expanded={actionOpen === ayah.numberInSurah} className={`grid h-9 w-9 place-items-center rounded-lg ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}><MoreVertical size={17}/></button>
                    {actionOpen === ayah.numberInSurah && <AyahActions ayah={ayah} bookmarked={bookmarked} memorized={markedMemorized} onBookmark={() => toggleBookmark(ayah.numberInSurah)} onPlay={() => playAyah(ayah)} onCopy={() => copyAyah(ayah)} onShare={() => shareAyah(ayah)} onRepeat={() => { setRepeatCount(normalizeRepeatCount(repeatCount === 1 ? 3 : repeatCount === 3 ? 5 : repeatCount === 5 ? Infinity : 1)); setRepeatsDone(0); playAyah(ayah) }} onMemorize={() => toggleMemorized(ayah.numberInSurah)} isDark={isDark}/>} 
                  </div>
                </div>
                <button type="button" onClick={() => setAyah(ayah.numberInSurah)} className="mt-5 block w-full text-right" aria-label={`Read ayah ${ayah.numberInSurah}`}>
                  <p dir="rtl" lang="ar" className="font-arabic text-right text-3xl leading-[2.1] sm:text-4xl" style={{ fontFamily: FONT_OPTIONS.find(item => item.value === settings.arabicFont)?.family, fontSize: `${settings.arabicSize}px`, lineHeight: settings.lineSpacing }}>{settings.tajweed ? <span title="Tajweed data is not available from the current provider">{highlightText(ayah.textArabic, query)}</span> : highlightText(ayah.textArabic, query)}</p>
                  {settings.translationVisible && <p className={`mt-5 text-left leading-7 ${mutedText}`} style={{ fontSize: `${settings.translationSize}px` }}>{highlightText(ayah.translation, query)}</p>}
                </button>
                {settings.tajweed && <p className="mt-3 text-right text-[11px] text-slate-400">Tajweed highlighting will activate when color-coded recitation data is available.</p>}
                {markedMemorized && <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><Check size={13}/> Memorized</div>}
              </article>
            })}
            {filteredAyahs.length === 0 && <div className={`rounded-2xl border border-dashed p-10 text-center text-sm ${cardSurface} ${mutedText}`}>No ayahs match “{query}”.</div>}
          </section>

          <footer className={`sticky bottom-3 z-20 mt-5 flex items-center justify-between gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur ${isDark ? 'border-slate-700 bg-slate-900/95' : 'border-slate-200 bg-white/95'}`}>
            <button type="button" disabled={activeAyah <= 1} onClick={() => { stopAudio(); scrollToAyah(nextAyahNumber(activeAyah, surah.ayahCount, -1)) }} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40"><ChevronLeft size={17}/> Previous</button>
            <div className="text-center"><p className={`text-[11px] font-semibold uppercase tracking-wide ${mutedText}`}>Reading</p><p className="text-sm font-bold">Ayah {activeAyah} / {surah.ayahCount}</p></div>
            <button type="button" disabled={activeAyah >= surah.ayahCount} onClick={() => { stopAudio(); scrollToAyah(nextAyahNumber(activeAyah, surah.ayahCount, 1)) }} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-40">Next <ChevronRight size={17}/></button>
          </footer>
        </>}
      </div>
    </main>

    {playing && currentAyah && <AudioPlayer currentAyah={currentAyah} playing={playing} onToggle={() => playing ? stopAudio() : playAyah(currentAyah)} audioTime={audioTime} audioDuration={audioDuration} onSeek={value => { if (audioRef.current) audioRef.current.currentTime = value; setAudioTime(value) }} repeatCount={repeatCount} repeatsDone={repeatsDone} onRepeat={changeRepeat} volume={volume} onVolume={setVolume} speed={speed} onSpeed={setSpeed} isDark={isDark}/>} 
  </div>
}

function ReadingSettings({ settings, updateSetting, close, isDark }) {
  return <section id="reader-settings" aria-label="Reading settings" className={`mt-3 rounded-2xl border p-4 shadow-lg sm:p-5 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
    <div className="flex items-center justify-between"><div><h2 className="font-semibold">Reading settings</h2><p className="mt-1 text-xs text-slate-500">Personalize the page for longer, calmer reading.</p></div><button type="button" onClick={close} aria-label="Close reading settings" className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><X size={16}/></button></div>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <SettingSlider label="Arabic font size" value={settings.arabicSize} min={24} max={52} step={1} onChange={value => updateSetting('arabicSize', Number(value))} suffix="px"/>
      <SettingSlider label="Translation font size" value={settings.translationSize} min={13} max={22} step={1} onChange={value => updateSetting('translationSize', Number(value))} suffix="px"/>
      <SettingSlider label="Line spacing" value={settings.lineSpacing} min={1.5} max={3} step={0.1} onChange={value => updateSetting('lineSpacing', Number(value))} suffix="×"/>
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Arabic font</p><div className="grid grid-cols-3 gap-2">{FONT_OPTIONS.map(font => <button key={font.value} type="button" onClick={() => updateSetting('arabicFont', font.value)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${settings.arabicFont === font.value ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : isDark ? 'border-slate-700' : 'border-slate-200'}`}>{font.label}</button>)}</div></div>
      <ToggleSetting label="Translation" description="Show the Saheeh International translation" value={settings.translationVisible} onChange={value => updateSetting('translationVisible', value)} isDark={isDark}/>
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Reading mode</p><div className="grid grid-cols-3 gap-2">{[['light','Light',Sun],['dark','Dark',Moon],['auto','Auto',Gauge]].map(([value,label,Icon]) => <button key={value} type="button" onClick={() => updateSetting('theme', value)} className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold ${settings.theme === value ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : isDark ? 'border-slate-700' : 'border-slate-200'}`}><Icon size={14}/>{label}</button>)}</div></div>
      <ToggleSetting label="Tajweed highlight" description="Waiting for color-coded Tajweed data from the provider" value={settings.tajweed} onChange={value => updateSetting('tajweed', value)} disabled isDark={isDark}/>
    </div>
  </section>
}

function SettingSlider({ label, value, min, max, step, onChange, suffix }) {
  return <div><div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500"><span>{label}</span><span className="normal-case">{value}{suffix}</span></div><div className="flex items-center gap-2"><button type="button" onClick={() => onChange(Math.max(min, Number(value) - step))} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600" aria-label={`Decrease ${label}`}><Minus size={14}/></button><input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(event.target.value)} className="w-full accent-emerald-600" aria-label={label}/><button type="button" onClick={() => onChange(Math.min(max, Number(value) + step))} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600" aria-label={`Increase ${label}`}><Plus size={14}/></button></div></div>
}

function ToggleSetting({ label, description, value, onChange, disabled = false }) {
  return <div className={`flex items-center justify-between gap-4 rounded-xl border p-3 ${disabled ? 'opacity-55' : ''}`}><div><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-[11px] text-slate-500">{description}</p></div><button type="button" disabled={disabled} role="switch" aria-checked={value} onClick={() => onChange(!value)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? 'bg-emerald-600' : 'bg-slate-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${value ? 'left-6' : 'left-1'}`}/></button></div>
}

function AyahActions({ ayah, bookmarked, memorized, onBookmark, onPlay, onCopy, onShare, onRepeat, onMemorize, isDark }) {
  const actions = [
    ['Bookmark', onBookmark, bookmarked ? BookmarkCheck : Bookmark],
    ['Play', onPlay, Play],
    ['Copy', onCopy, Copy],
    ['Share', onShare, Share2],
    ['Repeat', onRepeat, Repeat2],
    [memorized ? 'Unmark memorized' : 'Memorize', onMemorize, memorized ? Check : Eye]
  ]
  return <div className={`absolute right-0 top-11 z-30 grid w-48 gap-1 rounded-xl border p-2 shadow-xl ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
    {actions.map(([label, action, Icon]) => <button key={label} type="button" onClick={action} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-800"><Icon size={15}/>{label}</button>)}
  </div>
}

function AudioPlayer({ currentAyah, playing, onToggle, audioTime, audioDuration, onSeek, repeatCount, repeatsDone, onRepeat, volume, onVolume, speed, onSpeed, isDark }) {
  return <div className={`fixed inset-x-3 bottom-3 z-50 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl lg:left-[292px] ${isDark ? 'border-slate-700 bg-slate-900/95' : 'border-slate-200 bg-white/95'}`}>
    <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
      <button type="button" onClick={onToggle} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-600 text-white" aria-label={playing ? 'Pause audio' : 'Play audio'}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>
      <div className="min-w-[130px] flex-1"><p className="text-xs font-bold">{currentAyah.numberInSurah}. {formatAudioTime(audioTime)} / {formatAudioTime(audioDuration)}</p><input type="range" min="0" max={audioDuration || 0} step="0.1" value={Math.min(audioTime, audioDuration || 0)} onChange={event => onSeek(Number(event.target.value))} className="mt-1 w-full accent-emerald-600" aria-label="Audio progress"/></div>
      <button type="button" onClick={onRepeat} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold ${repeatCount !== 1 ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500'}`} title="Repeat mode"><Repeat2 size={15}/>{repeatCount === Infinity ? '∞' : `${repeatCount}×`}{repeatsDone > 0 && <span className="text-[10px]">{repeatsDone}</span>}</button>
      <label className="hidden items-center gap-1.5 text-xs font-semibold sm:flex"><Gauge size={15}/><select value={speed} onChange={event => onSpeed(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-transparent px-1.5 py-1.5"><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>
      <label className="hidden items-center gap-1.5 md:flex"><Volume2 size={15}/><input type="range" min="0" max="1" step="0.05" value={volume} onChange={event => onVolume(Number(event.target.value))} className="w-20 accent-emerald-600" aria-label="Volume"/></label>
    </div>
  </div>
}
