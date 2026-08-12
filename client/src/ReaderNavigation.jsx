import { useEffect, useState } from 'react'
import { BarChart3, BookOpen, Bookmark, Brain, CheckCircle2, CircleAlert, Menu, Search, Settings2, X, Sparkles } from 'lucide-react'

const sections = [
  { title: 'Learn', items: [
    { label: 'Quran Reader', href: '/', icon: BookOpen, description: 'Browse Surahs and read ayahs' },
    { label: 'Search Quran', href: '/search', icon: Search, description: 'Find a surah or ayah' },
    { label: 'Bookmarks', href: '/bookmarks', icon: Bookmark, description: 'Saved ayahs for quick return' },
  ] },
  { title: 'Memorize', items: [
    { label: 'Memorize', href: '/memorize', icon: Brain, description: 'Review and strengthen hifz' },
    { label: 'Daily Review', href: '/review', icon: CheckCircle2, description: "Today's muraja'ah queue" },
    { label: 'Weak Ayahs', href: '/weak-ayahs', icon: CircleAlert, description: 'Passages that need repetition' },
  ] },
  { title: 'Progress', items: [
    { label: 'Progress', href: '/progress', icon: BarChart3, description: 'Goals, streaks and activity' },
  ] },
]

function NavItem({ item, active, onNavigate }) {
  const Icon = item.icon
  return <a href={item.href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 transition ${active ? 'bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
    {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-emerald-700" aria-hidden="true" />}
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${active ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/15' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'}`}><Icon size={19} strokeWidth={active ? 2.3 : 2} aria-hidden="true" /></span>
    <span className="min-w-0"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block truncate text-xs text-slate-400">{item.description}</span></span>
  </a>
}

export default function ReaderNavigation() {
  const [open, setOpen] = useState(false)
  const pathname = window.location.pathname
  const close = () => setOpen(false)
  const isActive = item => item.href === '/' ? pathname === '/' || /^\/surah\/\d+\/?$/.test(pathname) : pathname === item.href || pathname.startsWith(`${item.href}/`)

  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  useEffect(() => { document.body.classList.toggle('overflow-hidden', open); return () => document.body.classList.remove('overflow-hidden') }, [open])

  return <>
    <button type="button" onClick={() => setOpen(value => !value)} aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="tarteel-reader-navigation" className="safe-top fixed left-3 top-0 z-[70] grid h-14 w-11 place-items-center text-slate-700 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/80 bg-white/95 shadow-lg shadow-slate-900/5 backdrop-blur">{open ? <X size={20}/> : <Menu size={20}/>}</span></button>
    {open && <button type="button" aria-label="Close navigation overlay" onClick={close} className="fixed inset-0 z-[55] bg-slate-950/35 backdrop-blur-[3px] lg:hidden" />}
    <aside id="tarteel-reader-navigation" aria-label="Primary navigation" className={`safe-top safe-bottom fixed inset-y-0 left-0 z-[60] flex w-[min(88vw,320px)] flex-col border-r border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-xl transition-transform duration-200 lg:w-[288px] lg:translate-x-0 lg:bg-white lg:shadow-[8px_0_40px_rgba(15,23,42,.04)] ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-slate-100 px-5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-lg shadow-emerald-700/20"><BookOpen size={20}/></span>
        <div className="min-w-0"><p className="text-lg font-bold tracking-tight text-slate-900">Tarteel</p><p className="text-[11px] font-medium text-slate-400">Quran learning companion</p></div>
        <button type="button" onClick={close} aria-label="Close navigation" className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-50 lg:hidden"><X size={18}/></button>
      </div>

      <div className="px-3 pt-3">
        <a href="/" onClick={close} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3 text-emerald-900 hover:bg-emerald-50">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><Sparkles size={17}/></span>
          <span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-wide text-emerald-700">Quick start</span><span className="block truncate text-sm font-semibold">Continue your reading</span></span>
        </a>
      </div>

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Learning sections">
        {sections.map(section => <section key={section.title} className="mb-4 last:mb-0"><p className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{section.title}</p><div className="space-y-1">{section.items.map(item => <NavItem key={item.label} item={item} active={isActive(item)} onNavigate={close}/>)}</div></section>)}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <a href="/settings" onClick={close} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-600 hover:bg-slate-50 ${isActive({ href: '/settings' }) ? 'bg-slate-50 text-emerald-800' : ''}`}><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><Settings2 size={19}/></span><span className="min-w-0"><span className="block text-sm font-semibold">Settings</span><span className="text-xs text-slate-400">Reader preferences</span></span></a>
        <div className="mt-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"><p className="text-xs font-semibold text-slate-700">Read with focus</p><p className="mt-1 text-[11px] leading-5 text-slate-500">Use Single Ayah mode whenever you want a calm, distraction-free session.</p></div>
      </div>
    </aside>
  </>
}
