import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Mic, MicOff, Square, Volume2 } from 'lucide-react'
import { finishRecitation, incrementReciteGoal, startRecitation } from './recitationApi.js'
import { createRecitationRecorder, isRecordingSupported, requestMicrophoneStream, stopMediaStream } from './recitationRecorder.js'

export default function RecitationPanel({ surahNumber = null, onCompleted }) {
  const [session, setSession] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [accuracy, setAccuracy] = useState('')
  const [mistakes, setMistakes] = useState('0')
  const [error, setError] = useState('')
  const [recordingState, setRecordingState] = useState('idle')
  const [recordingUrl, setRecordingUrl] = useState('')
  const [recordingType, setRecordingType] = useState('')
  const startedAt = useRef(null)
  const timer = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const finishRecordingRef = useRef(null)

  useEffect(() => () => {
    clearInterval(timer.current)
    stopMediaStream(streamRef.current)
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
  }, [recordingUrl])

  const startMicrophone = async () => {
    if (!isRecordingSupported()) {
      setRecordingState('unsupported')
      return
    }
    try {
      const stream = await requestMicrophoneStream()
      const recorder = createRecitationRecorder(stream)
      streamRef.current = stream
      recorderRef.current = recorder.recorder
      finishRecordingRef.current = recorder.finish
      setRecordingType(recorder.mimeType)
      recorder.recorder.start()
      setRecordingState('recording')
    } catch (err) {
      stopMediaStream(streamRef.current)
      streamRef.current = null
      recorderRef.current = null
      finishRecordingRef.current = null
      setRecordingState('denied')
      setError(err?.name === 'NotAllowedError' ? 'Microphone permission was denied. The session can still be completed without recording.' : (err.message || 'Microphone recording could not start.'))
    }
  }

  const stopMicrophone = async () => {
    const finish = finishRecordingRef.current
    const stream = streamRef.current
    finishRecordingRef.current = null
    recorderRef.current = null
    streamRef.current = null
    setRecordingState('idle')
    stopMediaStream(stream)
    if (!finish) return null
    try {
      const blob = await finish()
      if (!blob.size) return null
      if (recordingUrl) URL.revokeObjectURL(recordingUrl)
      const url = URL.createObjectURL(blob)
      setRecordingUrl(url)
      return blob
    } catch {
      return null
    }
  }

  const begin = async () => {
    setError('')
    try {
      const data = await startRecitation(surahNumber)
      setSession(data)
      startedAt.current = Date.now()
      setElapsed(0)
      timer.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000)
      await startMicrophone()
    } catch (err) {
      setError(err.message || 'Unable to start recitation')
    }
  }

  const finish = async () => {
    if (!session) return
    setError('')
    const durationSec = Math.max(elapsed, Math.floor((Date.now() - startedAt.current) / 1000))
    const parsedAccuracy = accuracy === '' ? null : Number(accuracy)
    const parsedMistakes = Number(mistakes)
    if (parsedAccuracy !== null && (!Number.isFinite(parsedAccuracy) || parsedAccuracy < 0 || parsedAccuracy > 100)) return setError('Accuracy must be between 0 and 100.')
    if (!Number.isInteger(parsedMistakes) || parsedMistakes < 0) return setError('Mistakes must be a non-negative whole number.')

    const wasRecording = recordingState === 'recording'
    if (wasRecording) await stopMicrophone()
    else stopMediaStream(streamRef.current)

    try {
      const data = await finishRecitation(session.id, { durationSec, accuracy: parsedAccuracy, mistakes: parsedMistakes })
      await incrementReciteGoal()
      clearInterval(timer.current)
      setSession(null)
      setElapsed(0)
      setAccuracy('')
      setMistakes('0')
      if (onCompleted) await onCompleted(data)
    } catch (err) {
      setError(err.message || 'Unable to save recitation. The recorded audio remains available for this page so you can retry.')
    }
  }

  const minutes = Math.floor(elapsed / 60)
  const seconds = String(elapsed % 60).padStart(2, '0')

  return <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Mic size={19}/></span>
      <div><h2 className="font-bold">Recitation practice</h2><p className="mt-1 text-sm text-slate-500">Track a real session. Microphone recording is optional and stays in this browser session unless you add a future upload provider.</p></div>
    </div>

    {!session ? <button onClick={begin} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Mic size={16}/> Start recitation</button> : <div className="mt-5 space-y-4">
      <div className="rounded-2xl bg-emerald-50 p-4 text-center"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Live session</p><p className="mt-1 text-3xl font-bold tabular-nums text-emerald-900">{minutes}:{seconds}</p></div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {recordingState === 'recording' && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-red-700"><span className="h-2 w-2 animate-pulse rounded-full bg-red-600"/> Recording microphone</span>}
        {recordingState === 'unsupported' && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600"><MicOff size={13}/> Browser recording unavailable</span>}
        {recordingState === 'denied' && <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-amber-800"><MicOff size={13}/> Recording disabled</span>}
        {recordingType && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-500">{recordingType}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Accuracy (%)<input inputMode="decimal" min="0" max="100" value={accuracy} onChange={e => setAccuracy(e.target.value)} placeholder="Optional" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"/></label>
        <label className="text-sm font-medium">Mistakes<input inputMode="numeric" min="0" value={mistakes} onChange={e => setMistakes(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-emerald-500"/></label>
      </div>
      <div className="flex flex-wrap gap-2">
        {recordingState !== 'recording' && recordingState !== 'unsupported' && <button onClick={startMicrophone} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"><Mic size={15}/> Enable recording</button>}
        <button onClick={finish} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Square size={15} fill="currentColor"/> Finish & save</button>
      </div>
    </div>}

    {recordingUrl && <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><Volume2 size={16}/> Session recording preview</div><audio controls preload="metadata" src={recordingUrl} className="mt-3 w-full"/></div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {session && <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><CheckCircle2 size={14}/> Session metrics are saved server-side when you finish. Audio is not uploaded.</p>}
  </div>
}
