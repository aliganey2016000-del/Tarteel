import { useEffect, useState } from 'react'
import { BarChart3, BookOpen, Brain, Menu, Search, X } from 'lucide-react'

const items = [
  { label: 'Quran Reader', href: '/', icon: BookOpen, description: 'Browse Surahs and read ayahs' },
  { label: 'Search Quran', href: '/search', icon: Search, description: 'Find a surah or ayah' },
  { label: 'Memorize', href: '/memorize', icon: Brain, description: 'Review and strengthen hifz' },
  { label: 'Progress', href: '/progress', icon: BarChart3, description: 'Goals, streaks and activity' },
]

function NavItem({ item, active, onNavigate }) {
  const Icon = item.icon
  return (
    <a
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
        active
          ? 'bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-white'}`}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{item.label}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-400">{item.description}</span>
      </span>
    </a>
  )
}

export default function ReaderNavigation() {
  const [open, setOpen] = useState(false)
  const pathname = window.location.pathname
  const close = () => setOpen(false)
  const isActive = item => item.href === '/'
    ? pathname === '/' || /^\/surah\/\d+\/?$/.test(pathname)
    : pathname === item.href || pathname.startsWith(`${item.href}/`)

  useEffect(() => {
    const onKeyDown = event => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', open)
    return () => document.body.classList.remove('overflow-hidden')
  }, [open])

  return (
    <>
      <button type="button" onClick={() => setOpen(value => !value)} aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} aria-controls="tarteel-reader-navigation" className="fixed left-3 top-3 z-[70] grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white/95 text-slate-700 shadow-lg backdrop-blur lg:hidden">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && <button type="button" aria-label="Close navigation overlay" onClick={close} className="fixed inset-0 z-[55] bg-slate-950/35 backdrop-blur-[2px] lg:hidden />}
      <aside id="tarteel-reader-navigation" aria-label="Primary navigation" className={`fixed inset-y-0 left-0 z-[60] flex w-[min(86vw,292px)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 lg:w-[272px] lg:translate-x-0 lg:shadow-none ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-700 text-white"><BookOpen size={20} /></span>
          <div><p className="text-lg font-bold tracking-tight text-slate-900">Tarteel</p><p className="text-[11px] font-medium text-slate-400">Quran learning</p></div>
          <button type="button" onClick={close} aria-label="Close navigation" className="ml-auto grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-50 lg:hidden"><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3" aria-label="Learning sections">
          <p className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Learn</p>
          <div className="space-y-1">{items.map(item => <NavItem key={item.label} item={item} active={isActive(item)} onNavigate={close} />)}</div>
        </nav>
        <div className="border-t border-slate-100 p-4"><div className="rounded-2xl bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-800">Read with focus</p><p className="mt-1 text-[11px] leading-5 text-emerald-700/80">The sidebar stays out of the way while you read, and becomes a drawer on phones.</p></div></div>
      </aside>
    </>
  )
}
