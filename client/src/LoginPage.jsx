import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, GraduationCap, HeartHandshake, LoaderCircle, ShieldCheck } from 'lucide-react'
import { login, register } from './authApi.js'

const roles = [
  { key: 'student', label: 'Arday', hint: 'Akhris, xifdin & horumar', icon: GraduationCap },
  { key: 'teacher', label: 'Macalin', hint: 'Ardayda & casharrada', icon: ShieldCheck },
  { key: 'parent', label: 'Waalid', hint: 'La soco horumarka ilmaha', icon: HeartHandshake },
]

export default function LoginPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const requestedRole = params.get('role')
  const initialRole = roles.some(role => role.key === requestedRole) ? requestedRole : 'student'
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState(initialRole)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async event => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = mode === 'login' ? await login({ email, password }) : await register({ email, password, name: name.trim() || undefined })
      localStorage.setItem('tarteel:portal-role', role)
      localStorage.setItem('tarteel:portal-user', JSON.stringify(user))
      window.location.assign(`/portal?role=${encodeURIComponent(role)}`)
    } catch (requestError) {
      setError(requestError?.message || 'Gelitaanka waa fashilmay. Fadlan isku day mar kale.')
    } finally { setBusy(false) }
  }

  return <div className="min-h-screen bg-[#f6faf8] text-slate-900">
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6"><a href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-700/20"><BookOpen size={20}/></span><span className="font-extrabold tracking-tight">Tarteel</span></a><a href="/" className="text-sm font-semibold text-slate-500 hover:text-emerald-700">Bogga hore</a></div></header>
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:py-14">
      <section className="hidden lg:block"><div className="max-w-lg"><span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><BookOpen size={14}/> Quran learning</span><h1 className="mt-5 text-5xl font-black leading-[1.08] tracking-tight text-slate-950">Hal meel. Saddex door. <span className="text-emerald-700">Hal safar Quran.</span></h1><p className="mt-5 text-base leading-8 text-slate-600">Gal Tarteel si aad u hesho khibrad ku habboon doorkaaga, adigoo ilaalinaya horumarkaaga akhris, xifdin iyo joogteyn.</p><div className="mt-8 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm"><p dir="rtl" lang="ar" className="font-[Amiri,serif] text-2xl leading-[2] text-slate-800">وَقُلْ رَبِّ زِدْنِي عِلْمًا</p><p className="mt-2 text-xs font-semibold text-slate-400">Suurat Taha · 20:114</p></div></div></section>
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-8"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">{mode === 'login' ? 'Soo gal' : 'Samee akoon'}</p><h2 className="mt-2 text-3xl font-black tracking-tight">Dooro portal-kaaga</h2><p className="mt-2 text-sm leading-6 text-slate-500">Doorashadaadu waxay go'aaminaysaa meesha laguu geeyo markaad gasho.</p></div>
        <div className="grid gap-2 sm:grid-cols-3">{roles.map(({ key, label, hint, icon: Icon }) => <button key={key} type="button" onClick={() => setRole(key)} className={`rounded-2xl border p-3 text-left transition ${role === key ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200'}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-sm"><Icon size={18}/></span><span className="mt-2 block text-sm font-extrabold">{label}</span><span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span></button>)}</div>
        <form onSubmit={submit} className="mt-6 space-y-4">{mode === 'register' && <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Magaca</span><input value={name} onChange={event => setName(event.target.value)} autoComplete="name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="Magacaaga" /></label>}<label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Email</span><input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="you@example.com" /></label><label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Password</span><input required minLength={8} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100" placeholder="Ugu yaraan 8 xaraf" /></label>{error && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={18}/> : <ArrowRight size={18}/>} {mode === 'login' ? `Gal sida ${roles.find(item => item.key === role)?.label}` : 'Samee akoon'}</button></form>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} className="mt-5 w-full text-center text-sm font-semibold text-slate-500 hover:text-emerald-700">{mode === 'login' ? 'Akoon ma lihid? Samee mid cusub' : 'Akoon hore ma leedahay? Soo gal'}</button>
      </section>
    </main>
  </div>
}
