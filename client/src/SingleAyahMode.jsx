import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff, Pause, Play, RotateCcw, Settings2, Volume2 } from 'lucide-react'

export default function SingleAyahMode({
  surah,
  ayah,
  playing,
  onPlay,
  onPrevious,
  onNext,
  onExit,
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
  hasPrevious,
  hasNext
}) {
  const [hidden, setHidden] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)

  useEffect(() => {
    setHidden(false)
  }, [ayah.numberInSurah])

  useEffect(() => {
    const handleKey = event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return
      if (event.key === 'Escape') onExit()
      if (event.key === 'ArrowLeft' && hasPrevious) onPrevious()
      if (event.key === 'ArrowRight' && hasNext) onNext()
      if (event.key === ' ') {
        event.preventDefault()
        onPlay()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hasNext, hasPrevious, onExit, onNext, onPlay, onPrevious])

  const progress = useMemo(() => `${ayah.numberInSurah} / ${surah.ayahCount}`, [ayah.numberInSurah, surah.ayahCount])
  const surface = isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#f7faf8] text-slate-900'
  const muted = isDark ? 'text-slate-400' : 'text-slate-500'
  const panel = isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/90'

  return <main className={`fixed inset-0 z-[100] flex min-h-screen flex-col ${surface}`} role="dialog" aria-modal="true" aria-label="Single Ayah focus mode">
    <header className={`flex items-center justify-between border-b px-4 py-3 backdrop-blur-xl sm:px-6 ${isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white/80'}`}>
      <button type="button" onClick={onExit} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${muted} hover:bg-black/5`}><ArrowLeft size={17}/> Exit focus</button>
      <div className="text-center"><p className="text-sm font-bold">{surah.name}</p><p className={`text-[11px] ${muted}`}>Single Ayah · {progress}</p></div>
      <div className="flex items-center gap-1"><button type="button" onClick={onOpenSettings} aria-label="Open reader settings" className={`grid h-10 w-10 place-items-center rounded-xl ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}><Settings2 size={17}/></button></div>
    </header>

    <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8 sm:px-8">
      <section className="w-full max-w-4xl text-center">
        <div className={`mx-auto mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${panel}`}><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-600 text-white">{ayah.numberInSurah}</span><span className={muted}>{reciter} · {speed}×</span></div>

        <div className={`rounded-[2rem] border p-6 shadow-xl sm:p-10 ${panel}`}>
          {hidden ? <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 sm:min-h-[340px]"><EyeOff size={34} className={muted}/><p className={`max-w-md text-sm leading-6 ${muted}`}>Ayah hidden. Recite it from memory, then reveal the text when you are ready.</p><button type="button" onClick={() => setHidden(false)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white"><Eye size={17}/> Reveal Ayah</button></div> : <>
            <p dir="rtl" lang="ar" className="font-arabic text-center" style={{ fontFamily: arabicFontFamily, fontSize: `clamp(${Math.max(28, arabicSize - 4)}px, 6vw, ${arabicSize + 8}px)`, lineHeight: lineSpacing }}>{ayah.textArabic}</p>
            {translationVisible && <p className={`mx-auto mt-8 max-w-3xl text-left leading-8 ${muted}`} style={{ fontSize: `${translationSize}px` }}>{ayah.translation}</p>}
          </>}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <button type="button" disabled={!hasPrevious} onClick={onPrevious} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-30 ${panel}`}><ChevronLeft size={18}/> Previous</button>
          <button type="button" onClick={onPlay} className="grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" aria-label={playing ? 'Pause ayah' : 'Play ayah'}>{playing ? <Pause size={21}/> : <Play size={21}/>}</button>
          <button type="button" disabled={!hasNext} onClick={onNext} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-30 ${panel}`}>Next <ChevronRight size={18}/></button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => setHidden(value => !value)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${panel}`}><EyeOff size={15}/>{hidden ? 'Reveal' : 'Hide Ayah'}</button>
          <button type="button" onClick={onMarkMemorized} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${memorized ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : panel}`}><RotateCcw size={15}/>{memorized ? 'Memorized' : 'Mark memorized'}</button>
          <button type="button" onClick={() => setAutoAdvance(value => !value)} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${autoAdvance ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : panel}`}><Volume2 size={15}/>{autoAdvance ? 'Auto-advance on' : 'Auto-advance off'}</button>
        </div>

        <p className={`mt-6 text-[11px] ${muted}`}>Keyboard: ← → navigate · Space play/pause · Esc exit</p>
      </section>
    </div>
  </main>
}
