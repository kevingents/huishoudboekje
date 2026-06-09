'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { readInviteUnverified } from '@/lib/invite'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function UitnodigingPage() {
  const [token, setToken] = useState('')
  const [info, setInfo] = useState<{ householdName?: string; email?: string; name?: string } | null>(null)
  const [form, setForm] = useState({ name: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') ?? ''
    setToken(t)
    const p = t ? readInviteUnverified(t) : null
    if (p) {
      setInfo(p)
      setForm((f) => ({ ...f, name: p.name ?? '' }))
    }
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await apiPost('/api/auth/accept-invite', { token, ...form })
      window.location.href = '/vandaag'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aanmelden mislukt.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-xl font-extrabold text-white shadow-sm shadow-brand/30">
          F
        </div>
        <h1 className="text-lg font-extrabold text-slate-800">Je bent uitgenodigd</h1>
        <p className="text-center text-sm text-slate-500">
          {info?.householdName ? (
            <>Word lid van <strong>{info.householdName}</strong> in Fam.</>
          ) : (
            'Maak je account aan om lid te worden.'
          )}
        </p>
      </div>

      {!token ? (
        <div className="rounded-card border border-cardborder bg-white p-5 text-sm text-slate-500 shadow-card">
          Geen geldige uitnodiging gevonden. Vraag de afzender om een nieuwe link.
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-card border border-cardborder bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-3">
            {info?.email && (
              <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">{info.email}</p>
            )}
            <label className="text-xs font-semibold text-slate-500">
              Je naam
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Bijv. Mark"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Kies een wachtwoord
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minstens 6 tekens"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          </div>

          {error && <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="pill mt-5 w-full bg-brand px-4 py-3 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {busy ? 'Bezig…' : 'Lid worden'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-500">
        Verkeerde plek?{' '}
        <Link href="/inloggen" className="font-semibold text-brand hover:underline">
          Inloggen
        </Link>
      </p>
    </div>
  )
}
