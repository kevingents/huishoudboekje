'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserPlus, Plus, Trash2, Users } from 'lucide-react'
import { apiPost } from '@/lib/api'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

interface DraftMember {
  name: string
  role: string
  birthday: string
}

export default function RegistrerenPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [members, setMembers] = useState<DraftMember[]>([])
  const [memberDraft, setMemberDraft] = useState<DraftMember>({ name: '', role: '', birthday: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const addMember = () => {
    if (!memberDraft.name.trim()) return
    setMembers((prev) => [...prev, memberDraft])
    setMemberDraft({ name: '', role: '', birthday: '' })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await apiPost('/api/auth/register', { ...form, members })
      window.location.href = '/vandaag'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registratie mislukt.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Brand */}
      <div className="flex flex-col items-center gap-2">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-xl font-extrabold text-white shadow-sm shadow-brand/30">
          F
        </div>
        <h1 className="text-lg font-extrabold text-slate-800">Account aanmaken</h1>
        <p className="text-sm text-slate-500">Zet je gezinsdashboard op.</p>
      </div>

      <form onSubmit={submit} className="rounded-card border border-cardborder bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Je naam
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Sanne Jansen"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            E-mailadres
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="naam@voorbeeld.nl"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Wachtwoord
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minstens 6 tekens"
              className={`mt-1 ${inputClass}`}
            />
          </label>
        </div>

        {/* Family members */}
        <div className="mt-5 rounded-2xl bg-slate-50 p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Users className="h-4 w-4 text-emerald-500" />
            Gezinsleden (optioneel)
          </p>

          {members.length > 0 && (
            <ul className="mb-2 flex flex-col gap-1.5">
              {members.map((m, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="min-w-0 flex-1 truncate">
                    {m.name}
                    {m.role && <span className="text-slate-400"> · {m.role}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMembers((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`${m.name} verwijderen`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              value={memberDraft.name}
              onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addMember()
                }
              }}
              placeholder="Naam"
              className="min-w-[7rem] flex-1 rounded-full border border-cardborder bg-white px-3.5 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            />
            <input
              value={memberDraft.role}
              onChange={(e) => setMemberDraft({ ...memberDraft, role: e.target.value })}
              placeholder="Rol"
              className="w-24 rounded-full border border-cardborder bg-white px-3.5 py-2 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
            />
            <button
              type="button"
              onClick={addMember}
              className="pill bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-cardborder hover:bg-slate-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Toevoegen
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="pill mt-5 w-full bg-brand px-4 py-3 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          {busy ? 'Bezig…' : 'Account aanmaken'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Heb je al een account?{' '}
        <Link href="/inloggen" className="font-semibold text-brand hover:underline">
          Inloggen
        </Link>
      </p>
    </div>
  )
}
