import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Mic, Square } from 'lucide-react'
import { finishRecitation, startRecitation } from './recitationApi.js'

export default function RecitationPanel({ surahNumber = null, onCompleted }) {
  const [session, setSession] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [accuracy, setAccuracy] = useState('')
  const [mistakes, setMistakes] = useState('0')
  const [error, setError] = useState('')
  const startedAt = useRef(null)
  const timer = useRef(null)
  useEffect(() => () => clearInterval(timer.current), [])
  const begin = async () => { setError(''); try { const data = await startRecitation(surahNumber); setSession(data); startedAt.current = Date.now(); setElapsed(0); timer.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000) } catch (err) { setError(err.message || 'Unable to start recitation') } }
  const finish = async () => {
    if (!session) return
    setError('')
    const durationSec = Math.max(elapsed, Math.floor((Date.now() - startedAt.current) / 1000))
    const parsedAccuracy = accuracy === '' ? null : Number(accuracy)
    const parsedMistakes = Number(mistakes)
    if (parsedAccuracy !== null && (!Number.isFinite(parsedAccuracy) || parsedAccuracy < 0 || parsedAccuracy > 100)) return setError('Accuracy must be between 0 and 100.')
    if (!Number.isInteger(parsedMistakes) || parsedMistakes < 0) return setError('Mistakes must be a non-negative whole number.')
    try { const data = await finishRecitation(session.id, { durationSec, accuracy: parsedAccuracy, mistakes: parsedMistakes }); clearInterval(timer.current); setSession(null); setElapsed(0); if (onCompleted) await onCompleted(data) } catch (err) { setError(err.message || 'Unable to save recitation') }
  }
  const minutes = Math.floor(elapsed / 60)
  const seconds = String(elapsed % 60).padStart(2, '0')
  return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Mic size={19}/></span><div><h2 className="font-bold">Recitation session</h2><p className="mt-1 text-sm text-slate-500">Track a real recitation session and save its result to your progress.</p></div></div>
    {!session ? <button onClick={begin} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Mic size={16}/> Start recitation</button> : <div className="mt-5 space-y-4">
      <div className="rounded-2xl bg-emerald-50 p-4 text-center"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Live session</p><p className="mt-1 text-3xl font-bold tabular-nums text-emerald-900">{minutes}:{seconds}</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Accuracy (%)<input inputMode="decimal" min="0" max="100" value={accuracy} onChange={e => setAccuracy(e.target.value)} placeholder="Optional" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"/></label><label className="text-sm font-medium">Mistakes<input inputMode="numeric" min="0" value={mistakes} onChange={e => setMistakes(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"/></label></div>
      <button onClick={finish} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Square size={15} fill="currentColor"/> Finish & save</button>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {session && <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><CheckCircle2 size={14}/> Session is saved server-side when you finish.</p>}
  </div>
}
