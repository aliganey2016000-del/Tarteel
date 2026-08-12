import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, BookOpen, Flame, LogIn, ShieldCheck, Target, Users } from 'lucide-react'
import { getAdminStats, listAdminUsers } from './adminApi.js'

const formatDate = value => {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) } catch { return '—' }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([getAdminStats(), listAdminUsers()]).then(([nextStats, nextUsers]) => {
      if (cancelled) return
      setStats(nextStats)
      setUsers(nextUsers || [])
    }).catch(err => {
      if (!cancelled) setError(err.message || 'Unable to load administrator data.')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const cards = stats ? [
    ['Users', stats.users, Users],
    ['Bookmarks', stats.bookmarks, BookOpen],
    ['Goals', stats.goals, Target],
    ['Recitations', stats.recitations, Activity]
  ] : []

  return <div className="min-h-screen bg-[#f7faf8] text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-700 text-white"><ShieldCheck size={20}/></span><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Tarteel</p><h1 className="font-bold">Admin dashboard</h1></div></div>
        <a href="/" className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"><ArrowLeft size={16}/> Reader</a>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {error ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><div className="flex items-center gap-2 font-semibold"><LogIn size={17}/> {error}</div><p className="mt-2 text-amber-800">Sign in with an administrator account, then open <code>/admin</code> again.</p></section> : <>
        <section className="rounded-[1.75rem] bg-gradient-to-br from-[#075e4a] to-[#0d8a6b] p-6 text-white shadow-xl sm:p-8"><p className="text-sm text-emerald-100">Operations overview</p><h2 className="mt-1 text-3xl font-bold">Tarteel platform health</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/90">A protected operational view of account and learning activity. No passwords, tokens or sensitive credentials are exposed here.</p></section>
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label,value,Icon]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={17}/></span></div><p className="mt-3 text-3xl font-bold">{value}</p></article>)}</section>
        <section className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h2 className="font-bold">Recent accounts</h2><p className="mt-1 text-sm text-slate-500">Latest registered users and learning activity counts.</p></div><Flame className="text-emerald-600" size={20}/></div>{loading ? <div className="space-y-3 p-5">{[1,2,3,4].map(item => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100"/>)}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Account</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3">Bookmarks</th><th className="px-5 py-3">Goals</th><th className="px-5 py-3">Sessions</th></tr></thead><tbody>{users.map(item => <tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-4"><p className="font-semibold text-slate-800">{item.name || 'Unnamed user'}</p><p className="text-xs text-slate-400">{item.email}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.role === 'ADMIN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.role}</span></td><td className="px-5 py-4 text-slate-500">{formatDate(item.createdAt)}</td><td className="px-5 py-4 font-semibold">{item._count?.bookmarks ?? 0}</td><td className="px-5 py-4 font-semibold">{item._count?.goals ?? 0}</td><td className="px-5 py-4 font-semibold">{item._count?.sessions ?? 0}</td></tr>)}</tbody></table>{users.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No accounts yet.</p>}</div>}</section>
      </>}
    </main>
  </div>
}
