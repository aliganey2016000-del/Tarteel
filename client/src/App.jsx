import { useState } from 'react'
import { BookOpen, Bookmark, ChevronRight, Flame, Headphones, Home, Menu, Mic, Play, Search, Sparkles, Target, UserRound, X } from 'lucide-react'

const surahs = [
  { no: 1, name: 'Al-Fatihah', arabic: 'الفاتحة', ayahs: 7 },
  { no: 2, name: 'Al-Baqarah', arabic: 'البقرة', ayahs: 286 },
  { no: 3, name: 'Aal-E-Imran', arabic: 'آل عمران', ayahs: 200 },
  { no: 36, name: 'Ya-Sin', arabic: 'يس', ayahs: 83 },
  { no: 55, name: 'Ar-Rahman', arabic: 'الرحمن', ayahs: 78 },
  { no: 67, name: 'Al-Mulk', arabic: 'الملك', ayahs: 30 },
  { no: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', ayahs: 4 },
  { no: 114, name: 'An-Nas', arabic: 'الناس', ayahs: 6 }
]

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('Home')
  const [playing, setPlaying] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7faf8] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button className="flex items-center gap-2" onClick={() => setActive('Home')}>
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-700/20"><BookOpen size={20}/></span>
            <span className="text-xl font-bold tracking-tight">Tarteel</span>
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            {['Home', 'Quran', 'Memorize', 'Progress'].map(item => (
              <button key={item} onClick={() => setActive(item)} className={`rounded-xl px-4 py-2 text-sm font-medium transition ${active === item ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'}`}>{item}</button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button className="hidden h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 sm:grid"><Search size={18}/></button>
            <button className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-600"><UserRound size={18}/></button>
            <button className="grid h-10 w-10 place-items-center rounded-xl md:hidden" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
          </div>
        </div>
        {menuOpen && <div className="border-t border-slate-100 bg-white p-3 md:hidden">{['Home','Quran','Memorize','Progress'].map(item => <button key={item} onClick={() => {setActive(item);setMenuOpen(false)}} className="block w-full rounded-xl px-4 py-3 text-left font-medium">{item}</button>)}</div>}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#075e4a] via-[#0b765d] to-[#0d8a6b] p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-9">
          <div className="max-w-3xl">
            <p className="mb-2 text-sm font-medium text-emerald-100">Assalamu Alaikum</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Continue your Quran journey.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/85 sm:text-base">Read, listen, memorize and build a consistent relationship with the Quran — one ayah at a time.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => setPlaying(!playing)} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-800 shadow-sm">{playing ? <span className="h-4 w-4 rounded-sm bg-emerald-700"/> : <Play size={16} fill="currentColor"/>}{playing ? 'Playing Al-Baqarah' : 'Continue reading'}</button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold ring-1 ring-white/20 backdrop-blur"> <Mic size={16}/> Recite</button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat icon={<Flame/>} label="Streak" value="12 days" hint="Keep it going"/>
          <Stat icon={<Target/>} label="Today's goal" value="80%" hint="8 of 10 ayahs"/>
          <Stat icon={<Sparkles/>} label="Memorized" value="2 Juz" hint="Alhamdulillah"/>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-emerald-700">Continue</p><h2 className="mt-1 text-2xl font-bold">Al-Baqarah</h2><p className="mt-1 text-sm text-slate-500">Ayah 45 · Last read today</p></div><button className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><ChevronRight/></button></div>
            <div className="my-6 rounded-2xl bg-[#fbfaf6] px-5 py-8 text-center ring-1 ring-[#eee9dc]">
              <p dir="rtl" className="font-arabic text-3xl leading-[2.1] text-slate-800 sm:text-4xl">وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ</p>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-slate-500">And seek help through patience and prayer. Indeed, it is a burden except for the humble.</p>
            </div>
            <div className="flex items-center justify-between"><button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"><Bookmark size={16}/> Bookmark</button><button onClick={() => setPlaying(!playing)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Headphones size={16}/> Listen</button></div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Popular Surahs</h2><p className="mt-1 text-sm text-slate-500">Quick access</p></div><BookOpen className="text-emerald-700"/></div>
            <div className="mt-5 space-y-2">{surahs.slice(0,5).map(s => <button key={s.no} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-emerald-50"><span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{s.no}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{s.name}</span><span className="text-xs text-slate-400">{s.ayahs} ayahs</span></span><span dir="rtl" className="font-arabic text-lg text-slate-600">{s.arabic}</span></button>)}</div>
          </div>
        </section>

        <section className="mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-emerald-700">Memorization</p><h2 className="mt-1 text-2xl font-bold">Your daily plan</h2></div><button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">View plan</button></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3"><Goal title="Memorize" value="8 / 10 ayahs" progress={80}/><Goal title="Review" value="2 pages" progress={55}/><Goal title="Recite" value="15 min" progress={65}/></div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-7 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6"><span>© 2026 Tarteel Quran Learning</span><span>Read · Recite · Memorize</span></div></footer>
    </div>
  )
}

function Stat({icon,label,value,hint}) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">{icon}</span><div><p className="text-xs font-medium text-slate-400">{label}</p><p className="text-lg font-bold">{value}</p></div></div><p className="mt-3 text-xs text-slate-400">{hint}</p></div> }
function Goal({title,value,progress}) { return <div className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between text-sm"><span className="font-semibold">{title}</span><span className="text-slate-500">{value}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600" style={{width:`${progress}%`}}/></div></div> }

export default App
