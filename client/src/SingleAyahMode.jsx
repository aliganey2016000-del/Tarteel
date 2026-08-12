import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

const MIN_FONT_SIZE = 28
const MAX_FONT_SIZE = 96
const FONT_STEP = 4

export default function SingleAyahMode({
  ayah,
  arabicSize,
  arabicFontFamily,
  lineSpacing,
  isDark,
  onExit
}) {
  const [fontSize, setFontSize] = useState(() => Number(arabicSize) || 48)

  useEffect(() => {
    setFontSize(Number(arabicSize) || 48)
  }, [ayah.numberInSurah, arabicSize])

  useEffect(() => {
    const handleKey = event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return
      if (event.key === 'Escape') onExit()
      if (event.key === '+' || event.key === '=') setFontSize(value => Math.min(MAX_FONT_SIZE, value + FONT_STEP))
      if (event.key === '-' || event.key === '_') setFontSize(value => Math.max(MIN_FONT_SIZE, value - FONT_STEP))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onExit])

  const surface = isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#fdfefd] text-slate-950'
  const controlSurface = isDark
    ? 'border-slate-700 bg-slate-900/80 text-slate-100'
    : 'border-slate-200 bg-white/85 text-slate-700'

  return <main
    className={`fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden ${surface}`}
    role="dialog"
    aria-modal="true"
    aria-label="Single Ayah reading mode"
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
      onClick={event => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setFontSize(value => Math.max(MIN_FONT_SIZE, value - FONT_STEP))}
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
        onClick={() => setFontSize(value => Math.min(MAX_FONT_SIZE, value + FONT_STEP))}
        disabled={fontSize >= MAX_FONT_SIZE}
        aria-label="Increase Arabic text size"
        title="Increase text size"
        className={`grid h-10 w-10 place-items-center rounded-xl transition disabled:opacity-30 ${controlSurface}`}
      >
        <Plus size={17} />
      </button>
    </div>

    <span className="sr-only">Press Escape to exit. Use plus and minus keys to change text size.</span>
  </main>
}
