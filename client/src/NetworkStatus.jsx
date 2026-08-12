import { useEffect, useState } from 'react'
import { CloudOff, Wifi } from 'lucide-react'

export default function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleOnline = () => { setOnline(true); setVisible(true); window.setTimeout(() => setVisible(false), 2200) }
    const handleOffline = () => { setOnline(false); setVisible(true) }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!visible) return null

  return <div role="status" aria-live="polite" className={`fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-xl backdrop-blur-md ${online ? 'border-emerald-200 bg-white/95 text-emerald-800' : 'border-amber-200 bg-amber-50/95 text-amber-900'}`}>
    {online ? <Wifi size={16} aria-hidden="true" /> : <CloudOff size={16} aria-hidden="true" />}
    <span>{online ? 'Back online — syncing your progress.' : 'You are offline — local reading stays available.'}</span>
  </div>
}
