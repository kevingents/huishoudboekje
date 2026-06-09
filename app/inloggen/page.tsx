'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogIn } from 'lucide-react'
import { apiPost } from '@/lib/api'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function InloggenPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await apiPost('/api/auth/login', form)
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggen mislukt.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Brand */}
      <div className="flex flex-col items-center gap-2">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-xl font-extrabold text-white shadow-sm shadow-brand/30">
          h
        </div>
        <h1 className="text-lg font-extrabold text-slate-800">Welkom terug</h1>
        <p className="text-sm text-slate-500">Log in op je gezinsdashboard.</p>
      </div>

      <form onSubmit={submit} className="rounded-card border border-cardborder bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            E-mailadres
            <input
              type="email"
              autoFocus
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
              placeholder="Je wachtwoord"
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
          <LogIn className="h-4 w-4" />
          {busy ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-500">
        Nog geen account?{' '}
        <Link href="/registreren" className="font-semibold text-brand hover:underline">
          Account aanmaken
        </Link>
      </p>
    </div>
  )
}
