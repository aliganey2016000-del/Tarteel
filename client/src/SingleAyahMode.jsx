import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Check, Eye, EyeOff, Gauge, Minus, Pause, Play, Plus, Settings2,
  Volume2
} from 'lucide-react'

const MIN_FONT_SIZE = 28
const MAX_FONT_SIZE = 120
const FONT_STEP = 4
const FONT_STORAGE_KEY = 'tarteel:single-ayah-font-size:v3'
const SWIPE_THRESHOLD = 60
const IDLE_MS = 2800

function readSavedFontSize(fallback) {
  try {
    const saved = Number(localStorage.getItem(FONT_STORAGE_KEY))
    return Number.isFinite(saved) ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, saved)) : fallback
  } catch {
    return fallback
  }
}

function saveFontSize(value) {
  try { localStorage.setItem(FONT_STORAGE_KEY, String(value)) } catch {}
}

async function requestReaderFullscreen() {
  if (typeof document === 'undefined' || document.fullscreenElement) return false
  if (!document.fullscreenEnabled || !document.documentElement?.requestFullscreen) return false
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    return true
  } catch {
    return false
  }
}

async function exitReaderFullscreen() {
  if (typeof document === 'undefined' || !document.fullscreenElement || !document.exitFullscreen) return
  try { await document.exitFullscreen() } catch {}
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const total = Math.floor(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function SingleAyahMode({
  surah,
  ayah,
  playing,
  onPlay,
  onExit,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  translationVisible,
  translationSize,
  arabicSize,
  arabicFontFamily,
  lineSpacing,
  isDark,
  reciter,
  speed,
  onOpenSettings,
  onMarkMemorized,
  memorized,
  audioTime = 0,
  audioDuration = 0,
  volume = 1,
  onVolumeChange
}) {
  const fallbackSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Number(arabicSize) || 48))
  const [fontSize, setFontSize] = useState(() => readSavedFontSize(fallbackSize))
  const [controlsVisible, setControlsVisible] = useState(true)
  const [showTranslation, setShowTranslation] = useState(false)
  const [showSize, setShowSize] = useState(false)
  const [showAudio, setShowAudio] = useState(false)
  const [pressed, setPressed] = useState(false)
  const touchStartRef = useRef(null)
  const idleTimerRef = useRef(null)
  const onExitRef = useRef(onExit)
  const wakeLockRef = useRef(null)

  useEffect(() => { onExitRef.current = onExit }, [onExit])
  useEffect(() => { saveFontSize(fontSize) }, [fontSize])

  useEffect(() => {
    // Pure focus mode starts with Arabic only. Translation can be revealed on demand.
    setShowTranslation(false)
  }, [ayah?.numberInSurah, surah?.number])

  const clearIdleTimer = () => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = null
  }

  const revealControls = () => {
    setControlsVisible(true)
    clearIdleTimer()
    idleTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false)
      setShowSize(false)
      setShowAudio(false)
    }, IDLE_MS)
  }

  useEffect(() => {
    revealControls()
    return clearIdleTimer
  }, [ayah?.numberInSurah])

  useEffect(() => {
    let cancelled = false

    const releaseWakeLock = async () => {
      const lock = wakeLockRef.current
      wakeLockRef.current = null
      if (lock) {
        try { await lock.release() } catch {}
      }
    }

    const requestWakeLock = async () => {
      if (!playing || cancelled || !('wakeLock' in navigator)) return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          try { await lock.release() } catch {}
          return
        }
        wakeLockRef.current = lock
        lock.addEventListener?.('release', () => {
          if (!cancelled && playing && document.visibilityState === 'visible') requestWakeLock()
        })
      } catch {}
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && playing) requestWakeLock()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    requestWakeLock()
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      releaseWakeLock()
    }
  }, [playing])

  useEffect(() => {
    requestReaderFullscreen()
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) onExitRef.current?.()
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      exitReaderFullscreen()
    }
  }, [])

  useEffect(() => {
    const handleKey = event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onExitRef.current?.()
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        onPlay?.()
        revealControls()
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        setFontSize(value => Math.min(MAX_FONT_SIZE, value + FONT_STEP))
        revealControls()
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        setFontSize(value => Math.max(MIN_FONT_SIZE, value - FONT_STEP))
        revealControls()
      }
      if (event.key === 'ArrowRight' && hasNext) onNext?.()
      if (event.key === 'ArrowLeft' && hasPrevious) onPrevious?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hasNext, hasPrevious, onNext, onPrevious, onPlay])

  const handleTouchStart = event => {
    revealControls()
    if (!document.fullscreenElement) requestReaderFullscreen()
    const touch = event.changedTouches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = event => {
    const start = touchStartRef.current
    touchStartRef.current = null
    if (!start) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return
    if (dx < 0 && hasNext) onNext?.()
    if (dx > 0 && hasPrevious) onPrevious?.()
  }

  const decreaseFont = () => { setFontSize(value => Math.max(MIN_FONT_SIZE, value - FONT_STEP)); revealControls() }
  const increaseFont = () => { setFontSize(value => Math.min(MAX_FONT_SIZE, value + FONT_STEP)); revealControls() }
  const resetFont = () => { setFontSize(fallbackSize); revealControls() }

  const progress = useMemo(() => {
    if (!audioDuration || !Number.isFinite(audioDuration)) return 0
    return Math.min(100, Math.max(0, (audioTime / audioDuration) * 100))
  }, [audioTime, audioDuration])

  const surface = isDark ? 'bg-[#070b0a] text-slate-100' : 'bg-[#fbfdfc] text-slate-950'
  const muted = isDark ? 'text-slate-400' : 'text-slate-500'
  const glass = isDark
    ? 'border-white/10 bg-slate-900/75 text-slate-100'
    : 'border-slate-200/80 bg-white/80 text-slate-700'

  return <main
    className={`fixed inset-0 z-[100] flex h-[100dvh] w-[100dvw] min-h-[100dvh] min-w-full touch-pan-y select-none flex-col overflow-hidden ${surface}`}
    role="dialog"
    aria-modal="true"
    aria-label="Single Ayah focus mode"
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
    onPointerDown={() => {
      revealControls()
      if (!document.fullscreenElement) requestReaderFullscreen()
    }}
  >
    <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${playing ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-[55vw] w-[55vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
    </div>

    <header className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-[max(.7rem,env(safe-area-inset-top))] transition-all duration-300 sm:px-7 ${controlsVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}`}>
      <button
        type="button"
        onClick={onExit}
        className={`flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-sm backdrop-blur-xl ${glass}`}
        aria-label="Exit single Ayah mode"
      >
        <ArrowLeft size={18} />
        <span className="hidden xs:inline">Exit</span>
      </button>

      <div className="text-center">
        <p className="text-sm font-bold tracking-tight">{surah?.name || 'Quran'}</p>
        <p className={`mt-0.5 text-[11px] font-medium ${muted}`}>Single Ayah · {ayah?.numberInSurah} / {surah?.ayahCount}</p>
      </div>

      <button
        type="button"
        onClick={() => { setShowSize(value => !value); setShowAudio(false); revealControls() }}
        className={`grid h-11 w-11 place-items-center rounded-full border shadow-sm backdrop-blur-xl ${glass}`}
        aria-label="Reading controls"
        title="Reading controls"
      >
        <Settings2 size={18} />
      </button>
    </header>

    <section className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-20 sm:px-8 sm:py-24">
      <div className="flex w-full max-w-[1500px] flex-col items-center justify-center">
        <p
          dir="rtl"
          lang="ar"
          className={`w-full max-h-[64dvh] overflow-auto px-2 text-center font-medium antialiased transition-all duration-500 ${playing ? 'drop-shadow-[0_0_24px_rgba(16,185,129,.08)]' : ''}`}
          style={{
            fontFamily: arabicFontFamily,
            fontSize: `clamp(${Math.min(fontSize, 56)}px, ${Math.max(7, Math.min(14, fontSize / 6.8))}vw, ${fontSize}px)`,
            lineHeight: lineSpacing,
            textWrap: 'balance'
          }}
          onDoubleClick={onPlay}
        >
          {ayah?.textArabic}
        </p>

        {showTranslation && translationVisible && <p
          dir="ltr"
          className={`mt-7 max-w-3xl px-5 text-center leading-relaxed ${muted}`}
          style={{ fontSize: `clamp(14px, 2.2vw, ${Math.min(Number(translationSize) || 16, 24)}px)` }}
        >
          {ayah?.translation}
        </p>}
      </div>
    </section>

    {showSize && controlsVisible && <div className={`absolute right-4 top-[calc(max(.7rem,env(safe-area-inset-top))+3.8rem)] z-30 w-[min(92vw,340px)] rounded-3xl border p-4 shadow-2xl backdrop-blur-2xl ${glass}`} onPointerDown={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Reading size</p>
          <p className={`text-[11px] ${muted}`}>Adjust Arabic text for comfortable reading</p>
        </div>
        <button type="button" onClick={resetFont} className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${muted}`}>Reset</button>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={decreaseFont} disabled={fontSize <= MIN_FONT_SIZE} className={`grid h-11 w-11 place-items-center rounded-xl border disabled:opacity-30 ${glass}`} aria-label="Decrease text size"><Minus size={17}/></button>
        <input
          type="range"
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          step={FONT_STEP}
          value={fontSize}
          onChange={event => { setFontSize(Number(event.target.value)); revealControls() }}
          className="h-2 min-w-0 flex-1 accent-emerald-600"
          aria-label="Arabic text size"
        />
        <button type="button" onClick={increaseFont} disabled={fontSize >= MAX_FONT_SIZE} className={`grid h-11 w-11 place-items-center rounded-xl border disabled:opacity-30 ${glass}`} aria-label="Increase text size"><Plus size={17}/></button>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold tabular-nums">
        <span>A−</span><span>{fontSize}px</span><span>A+</span>
      </div>
    </div>}

    {showAudio && controlsVisible && <div className={`absolute bottom-[calc(max(1rem,env(safe-area-inset-bottom))+6.4rem)] left-1/2 z-30 w-[min(94vw,440px)] -translate-x-1/2 rounded-3xl border p-4 shadow-2xl backdrop-blur-2xl ${glass}`} onPointerDown={event => event.stopPropagation()} onTouchStart={event => event.stopPropagation()}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{reciter || 'Reciter'}</p>
          <p className={`text-[11px] ${muted}`}>Playback speed · {speed || 1}×</p>
        </div>
        <Volume2 size={17} className={muted}/>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/50">
        <div className="h-full rounded-full bg-emerald-500 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums opacity-70"><span>{formatTime(audioTime)}</span><span>{formatTime(audioDuration)}</span></div>
      {typeof onVolumeChange === 'function' && <label className="mt-3 flex items-center gap-2 text-[11px] font-semibold"><Volume2 size={14}/><input type="range" min="0" max="1" step="0.05" value={volume} onChange={event => onVolumeChange(Number(event.target.value))} className="min-w-0 flex-1 accent-emerald-600" aria-label="Volume"/></label>}
    </div>}

    <div className={`absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-4 pb-[max(.8rem,env(safe-area-inset-bottom))] transition-all duration-300 sm:px-7 ${controlsVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
      <div className="flex w-full max-w-[760px] items-center justify-between gap-2">
        <button type="button" onClick={() => { onPrevious?.(); revealControls() }} disabled={!hasPrevious} className={`h-10 rounded-full px-4 text-xs font-semibold transition disabled:invisible ${glass} border backdrop-blur-xl`} aria-label="Previous Ayah">Previous</button>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { setShowAudio(value => !value); setShowSize(false); revealControls() }} className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl ${glass}`} aria-label="Audio information"><Gauge size={16}/></button>
          <button type="button" onClick={() => { onPlay?.(); revealControls() }} className="grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-900/20 transition active:scale-95" aria-label={playing ? 'Pause recitation' : 'Play recitation'}>
            {playing ? <Pause size={22} fill="currentColor"/> : <Play size={22} fill="currentColor"/>}
          </button>
          <button type="button" onClick={() => { onNext?.(); revealControls() }} disabled={!hasNext} className={`h-10 rounded-full px-4 text-xs font-semibold transition disabled:invisible ${glass} border backdrop-blur-xl`} aria-label="Next Ayah">Next</button>
        </div>

        <button type="button" onClick={() => { onMarkMemorized?.(); revealControls() }} className={`h-10 rounded-full border px-3 text-xs font-semibold backdrop-blur-xl ${memorized ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600' : glass}`} aria-label={memorized ? 'Ayah memorized' : 'Mark Ayah memorized'}>
          {memorized ? <Check size={15}/> : 'Memorize'}
        </button>
      </div>

      <div className={`mt-3 flex items-center gap-2 transition-opacity duration-300 ${pressed ? 'opacity-100' : 'opacity-90'}`}>
        <button type="button" onClick={() => { setShowTranslation(value => !value); revealControls() }} disabled={!translationVisible} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold backdrop-blur-xl disabled:opacity-30 ${glass}`} aria-label={showTranslation ? 'Hide translation' : 'Show translation'}>
          {showTranslation ? <EyeOff size={13} className="mr-1 inline"/> : <Eye size={13} className="mr-1 inline"/>}
          {showTranslation ? 'Hide translation' : 'Translation'}
        </button>
        <button type="button" onClick={() => { setShowSize(value => !value); setShowAudio(false); revealControls() }} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold backdrop-blur-xl ${glass}`} aria-label="Change text size">A− A+</button>
        <button type="button" onClick={() => { onOpenSettings?.(); revealControls() }} className={`grid h-7 w-7 place-items-center rounded-full border backdrop-blur-xl ${glass}`} aria-label="Open full reader settings"><Settings2 size={13}/></button>
      </div>

      <div className={`mt-2 text-center text-[10px] ${muted}`}>Swipe · tap for controls · Space play · Esc exit</div>
    </div>

    <div className={`pointer-events-none absolute left-1/2 top-[max(4.6rem,env(safe-area-inset-top)+4rem)] -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] font-semibold backdrop-blur-xl transition-opacity duration-300 ${isDark ? 'border-white/10 bg-white/5 text-slate-300' : 'border-slate-200 bg-white/70 text-slate-500'} ${playing ? 'opacity-100' : 'opacity-0'}`}>
      {reciter} · {speed || 1}×
    </div>
  </main>
}
