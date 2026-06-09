'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { apiPost } from '@/lib/api'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function WachtwoordHerstellenPage() {
  const [token, setToken] = useState<string | null>(null)
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get('token'))
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 6) {
      setError('Kies een wachtwoord van minstens 6 tekens.')
      return
    }
    if (form.password !== form.confirm) {
      setError('De wachtwoorden komen niet overeen.')
      return
    }
    setBusy(true)
    try {
      await apiPost('/api/auth/reset-password', { token, password: form.password })
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Herstellen mislukt.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-white shadow-sm shadow-brand/30">
          <KeyRound className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <h1 className="text-lg font-extrabold text-slate-800">Nieuw wachtwoord</h1>
        <p className="text-center text-sm text-slate-500">Kies een nieuw wachtwoord voor je account.</p>
      </div>

      {token === null ? (
        <div className="rounded-card border border-cardborder bg-white p-6 text-center shadow-card">
          <p className="text-sm text-slate-600">
            Geen geldige herstel-link gevonden. Vraag een nieuwe aan via{' '}
            <Link href="/wachtwoord-vergeten" className="font-semibold text-brand hover:underline">
              wachtwoord vergeten
            </Link>
            .
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-card border border-cardborder bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-slate-500">
              Nieuw wachtwoord
              <input
                type="password"
                autoFocus
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimaal 6 tekens"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Herhaal wachtwoord
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                placeholder="Nogmaals je wachtwoord"
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
            {busy ? 'Bezig…' : 'Wachtwoord opslaan'}
          </button>
        </form>
      )}

      <Link
        href="/inloggen"
        className="text-center text-sm font-semibold text-slate-500 hover:text-brand"
      >
        Terug naar inloggen
      </Link>
    </div>
  )
}
