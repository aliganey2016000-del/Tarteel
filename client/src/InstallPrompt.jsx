import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { isIosSafari, isStandalone, readDismissed, saveDismissed } from './installPromptUtils.js'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    if (isStandalone() || readDismissed()) return undefined
    setIos(isIosSafari())
    const onBeforeInstall = event => {
      event.preventDefault()
      setDeferredPrompt(event)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    if (isIosSafari()) setVisible(true)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  useEffect(() => {
    const onInstalled = () => {
      setVisible(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [])

  if (!visible || (!deferredPrompt && !ios)) return null

  const install = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice?.outcome !== 'accepted') saveDismissed()
      setVisible(false)
      setDeferredPrompt(null)
    } catch {
      // The browser can reject or cancel the native prompt. Keep the app usable.
    } finally {
      setInstalling(false)
    }
  }

  const dismiss = () => {
    saveDismissed()
    setVisible(false)
    setDeferredPrompt(null)
  }

  return <aside className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md rounded-3xl border border-emerald-100 bg-white/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-5 sm:w-[min(100%-2rem,390px)]" role="dialog" aria-label="Install Tarteel">
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white">{ios ? <Share size={19}/> : <Download size={19}/>}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900">Install Tarteel</p>
        {ios ? <p className="mt-1 text-xs leading-5 text-slate-500">In Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong> to keep Tarteel one tap away.</p> : <p className="mt-1 text-xs leading-5 text-slate-500">Keep Quran reading, memorization and review one tap away with the app experience.</p>}
      </div>
      <button type="button" onClick={dismiss} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Dismiss install prompt"><X size={16}/></button>
    </div>
    <div className="mt-3 flex gap-2">
      {!ios && <button type="button" onClick={install} disabled={installing} className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60">{installing ? 'Opening…' : 'Install app'}</button>}
      <button type="button" onClick={dismiss} className={`${ios ? 'w-full' : ''} rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200`}>{ios ? 'Got it' : 'Not now'}</button>
    </div>
  </aside>
}
