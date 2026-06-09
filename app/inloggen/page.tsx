'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogIn, Mail, MailCheck } from 'lucide-react'
import { apiPost } from '@/lib/api'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function InloggenPage() {
  const [mode, setMode] = useState<'password' | 'link'>('password')
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('fout') === 'link') {
      setError('Deze inloglink is ongeldig of verlopen. Vraag een nieuwe aan.')
    }
  }, [])

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await apiPost('/api/auth/login', form)
      window.location.href = '/vandaag'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inloggen mislukt.')
      setBusy(false)
    }
  }

  const submitLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email.trim()) return
    setError(null)
    setBusy(true)
    try {
      await apiPost('/api/auth/login-link', { email: form.email })
      setLinkSent(true)
    } catch {
      setLinkSent(true) // geen info lekken over bestaande accounts
    } finally {
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
        <h1 className="text-lg font-extrabold text-slate-800">Welkom terug</h1>
        <p className="text-sm text-slate-500">Log in op je gezinsdashboard.</p>
      </div>

      {/* Methode-keuze */}
      <div className="flex rounded-full border border-cardborder bg-white p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode('password')
            setError(null)
          }}
          className={`flex-1 rounded-full px-4 py-2 transition-colors ${
            mode === 'password' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Wachtwoord
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('link')
            setError(null)
          }}
          className={`flex-1 rounded-full px-4 py-2 transition-colors ${
            mode === 'link' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          E-maillink
        </button>
      </div>

      {mode === 'password' ? (
        <form onSubmit={submitPassword} className="rounded-card border border-cardborder bg-white p-5 shadow-card sm:p-6">
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
              <span className="flex items-center justify-between">
                Wachtwoord
                <Link href="/wachtwoord-vergeten" className="font-semibold text-brand hover:underline">
                  Vergeten?
                </Link>
              </span>
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
      ) : linkSent ? (
        <div className="rounded-card border border-cardborder bg-white p-6 text-center shadow-card">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <MailCheck className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <p className="text-sm text-slate-600">
            Als er een account bestaat met <strong>{form.email}</strong>, hebben we een inloglink
            gestuurd. Klik op de link in de e-mail om in te loggen (15 minuten geldig).
          </p>
        </div>
      ) : (
        <form onSubmit={submitLink} className="rounded-card border border-cardborder bg-white p-5 shadow-card sm:p-6">
          <p className="mb-3 text-sm text-slate-500">
            Vul je e-mailadres in — we sturen je een veilige inloglink. Geen wachtwoord nodig.
          </p>
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

          {error && <p className="mt-4 text-sm font-medium text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="pill mt-5 w-full bg-brand px-4 py-3 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            {busy ? 'Versturen…' : 'Stuur inloglink'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-500">
        Nog geen account?{' '}
        <Link href="/registreren" className="font-semibold text-brand hover:underline">
          Account aanmaken
        </Link>
      </p>
    </div>
  )
}
