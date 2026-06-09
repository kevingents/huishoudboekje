'use client'

import { useState } from 'react'
import Link from 'next/link'
import { KeyRound, MailCheck, ArrowLeft } from 'lucide-react'
import { apiPost } from '@/lib/api'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    try {
      await apiPost('/api/auth/forgot-password', { email })
      setSent(true)
    } catch {
      // We tonen sowieso de bevestiging — geen info lekken over bestaande accounts.
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-emerald-600 text-white shadow-sm shadow-brand/30">
          <KeyRound className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <h1 className="text-lg font-extrabold text-slate-800">Wachtwoord vergeten</h1>
        <p className="text-center text-sm text-slate-500">
          Vul je e-mailadres in. We sturen je een link om een nieuw wachtwoord te kiezen.
        </p>
      </div>

      {sent ? (
        <div className="rounded-card border border-cardborder bg-white p-6 text-center shadow-card">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <MailCheck className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <p className="text-sm text-slate-600">
            Als er een account bestaat met <strong>{email}</strong>, ontvang je binnen enkele
            minuten een e-mail met een herstel-link. Vergeet niet je spam-map te checken.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-card border border-cardborder bg-white p-5 shadow-card sm:p-6">
          <label className="text-xs font-semibold text-slate-500">
            E-mailadres
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@voorbeeld.nl"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="pill mt-5 w-full bg-brand px-4 py-3 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? 'Bezig…' : 'Stuur herstel-link'}
          </button>
        </form>
      )}

      <Link
        href="/inloggen"
        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Terug naar inloggen
      </Link>
    </div>
  )
}
