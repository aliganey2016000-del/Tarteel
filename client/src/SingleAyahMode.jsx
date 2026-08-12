import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

const MIN_FONT_SIZE = 28
const MAX_FONT_SIZE = 96
const FONT_STEP = 4
const FONT_STORAGE_KEY = 'tarteel:single-ayah-font-size:v1'
const SWIPE_THRESHOLD = 60

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

export default function SingleAyahMode({
  ayah,
  arabicSize,
  arabicFontFamily,
  lineSpacing,
  isDark,
  onExit,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext
}) {
  const fallbackSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Number(arabicSize) || 48))
  const [fontSize, setFontSize] = useState(() => readSavedFontSize(fallbackSize))
  const touchStartRef = useRef(null)

  useEffect(() => {
    saveFontSize(fontSize)
  }, [fontSize])

  useEffect(() => {
    const handleKey = event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return
      if (event.key === 'Escape') onExit()
      if (event.key === '+' || event.key === '=') setFontSize(value => Math.min(MAX_FONT_SIZE, value + FONT_STEP))
      if (event.key === '-' || event.key === '_') setFontSize(value => Math.max(MIN_FONT_SIZE, value - FONT_STEP))
      if (event.key === 'ArrowLeft' && hasNext) onNext?.()
      if (event.key === 'ArrowRight' && hasPrevious) onPrevious?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hasNext, hasPrevious, onExit, onNext, onPrevious])

  const handleTouchStart = event => {
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

  const decreaseFont = () => setFontSize(value => Math.max(MIN_FONT_SIZE, value - FONT_STEP))
  const increaseFont = () => setFontSize(value => Math.min(MAX_FONT_SIZE, value + FONT_STEP))

  const surface = isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#fdfefd] text-slate-950'
  const controlSurface = isDark
    ? 'border-slate-700 bg-slate-900/80 text-slate-100'
    : 'border-slate-200 bg-white/85 text-slate-700'

  return <main
    className={`fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden ${surface}`}
    role="dialog"
    aria-modal="true"
    aria-label="Single Ayah reading mode"
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
  >
    <p
      dir="rtl"
      lang="ar"
      className="w-full select-text px-6 text-center sm:px-12 lg:px-20"
      style={{
        fontFamily: arabicFontFamily,
        fontSize: `${fontSize}px`,
        lineHeight: lineSpacing,
        textWrap: 'balance'
      }}
    >
      {ayah.textArabic}
    </p>

    <div
      className="fixed bottom-5 right-5 z-10 flex items-center gap-1 rounded-2xl border p-1 shadow-lg backdrop-blur-xl"
      role="group"
      aria-label="Ayah text size"
      onTouchStart={event => event.stopPropagation()}
      onTouchEnd={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={decreaseFont}
        disabled={fontSize <= MIN_FONT_SIZE}
        aria-label="Decrease Arabic text size"
        title="Decrease text size"
        className={`grid h-10 w-10 place-items-center rounded-xl transition disabled:opacity-30 ${controlSurface}`}
      >
        <Minus size={17} />
      </button>
      <span className="min-w-12 px-1 text-center text-xs font-semibold tabular-nums" aria-live="polite">
        {fontSize}px
      </span>
      <button
        type="button"
        onClick={increaseFont}
        disabled={fontSize >= MAX_FONT_SIZE}
        aria-label="Increase Arabic text size"
        title="Increase text size"
        className={`grid h-10 w-10 place-items-center rounded-xl transition disabled:opacity-30 ${controlSurface}`}
      >
        <Plus size={17} />
      </button>
    </div>

    <span className="sr-only">
      Swipe left for the next ayah and right for the previous ayah. Press Escape to exit. Use plus and minus keys to change text size.
    </span>
  </main>
}
