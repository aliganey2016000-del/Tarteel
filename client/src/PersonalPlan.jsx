import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, Target } from 'lucide-react'

const STORAGE_KEY = 'tarteel:personal-plan:v1'
const read = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') } catch { return null } }
const makePlan = ({ level, goal, minutes, days }) => {
  const base = minutes <= 10 ? 2 : minutes <= 20 ? 4 : minutes <= 30 ? 6 : minutes <= 45 ? 8 : 10
  const fresh = level === 'BEGINNER' ? Math.max(1, Math.round(base / 2)) : goal === 'REVIEW' ? Math.max(1, Math.round(base / 2)) : base
  const review = goal === 'MEMORIZE' ? Math.max(5, fresh * 2) : Math.max(4, fresh)
  const title = goal === 'MEMORIZE' ? 'Steady memorization' : goal === 'REVIEW' ? 'Focused review' : goal === 'TAJWEED' ? 'Tajweed practice' : goal === 'CONSISTENCY' ? 'Daily habit' : 'Daily reading'
  return { title, level, goal, minutes, days, fresh, review, weeklySessions: days }
}

export default function PersonalPlan() {
  const [form, setForm] = useState(() => read() || { level: 'BEGINNER', goal: 'READ', minutes: 20, days: 5 })
  const [saved, setSaved] = useState(() => Boolean(read()))
  const plan = useMemo(() => makePlan(form), [form])
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); setSaved(true) }
  return <main className="min-h-screen bg-[#f7faf8] text-slate-900 lg:ml-[272px]"><div className="mx-auto max-w-4xl px-4 py-7 pb-16 sm:px-6 lg:py-10">
    <div className="rounded-[2rem] bg-gradient-to-br from-[#075e4a] via-[#0b765d] to-[#0d8a6b] p-6 text-white shadow-xl sm:p-9"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100">Personal setup</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Build a plan that fits you.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90">Answer four quick questions. Tarteel will turn your time, experience and goal into a practical daily routine.</p></div>
    <section className="mt-5 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <Field label="Your current level"><div className="grid gap-2 sm:grid-cols-3">{[['BEGINNER','Starting out'],['READER','Comfortable reader'],['MEMORIZER','Already memorizing']].map(([value,label]) => <Choice key={value} active={form.level===value} onClick={()=>set('level',value)}>{label}</Choice>)}</div></Field>
      <Field label="Your main goal"><div className="grid gap-2 sm:grid-cols-2">{[['READ','Read consistently'],['MEMORIZE','Memorize new passages'],['REVIEW','Strengthen review'],['TAJWEED','Improve Tajweed'],['CONSISTENCY','Build a habit']].map(([value,label]) => <Choice key={value} active={form.goal===value} onClick={()=>set('goal',value)}>{label}</Choice>)}</div></Field>
      <Field label="Time available each day"><div className="flex flex-wrap gap-2">{[10,20,30,45,60].map(value => <Choice key={value} active={form.minutes===value} onClick={()=>set('minutes',value)}>{value} min</Choice>)}</div></Field>
      <Field label="Days each week"><div className="flex flex-wrap gap-2">{[3,4,5,6,7].map(value => <Choice key={value} active={form.days===value} onClick={()=>set('days',value)}>{value} days</Choice>)}</div></Field>
    </section>
    <section className="mt-5 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white"><Target size={19}/></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Recommended plan</p><h2 className="mt-1 text-2xl font-bold text-emerald-950">{plan.title}</h2><p className="mt-1 text-sm text-emerald-800">{plan.minutes} minutes · {plan.weeklySessions} days/week</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><PlanCard icon={<Clock3 size={17}/>} title="Daily time" value={`${plan.minutes} min`}/><PlanCard icon={<CheckCircle2 size={17}/>} title="New" value={`${plan.fresh} ayahs`}/><PlanCard icon={<CheckCircle2 size={17}/>} title="Review" value={`${plan.review} ayahs`}/></div><button onClick={save} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm">{saved ? 'Save changes' : 'Use this plan'} <ArrowRight size={16}/></button></section>
  </div></main>
}
function Field({ label, children }) { return <div><p className="mb-2 text-sm font-bold text-slate-700">{label}</p>{children}</div> }
function Choice({ active, onClick, children }) { return <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${active ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>{children}</button> }
function PlanCard({ icon, title, value }) { return <div className="rounded-2xl border border-emerald-100 bg-white p-4"><div className="text-emerald-700">{icon}</div><p className="mt-3 text-xs text-slate-500">{title}</p><p className="mt-1 font-bold text-slate-900">{value}</p></div> }
