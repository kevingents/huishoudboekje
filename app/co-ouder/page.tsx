'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users2, Check, ArrowRight } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import { apiPost } from '@/lib/api'

export default function CoOuderPage() {
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token'))
  }, [])

  const link = async () => {
    if (!token) return
    setBusy(true)
    setError('')
    try {
      const res = (await apiPost('/api/coparent', { token })) as { linkedName?: string }
      setName(res.linkedName ?? '')
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Koppelen mislukt.')
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Co-ouderschap koppelen"
        subtitle="Deel de kinder-agenda met de andere ouder"
        icon={Users2}
        iconClassName="bg-violet-100 text-violet-500"
      />

      <DashboardCard>
        {token === null ? (
          <p className="text-sm text-slate-600">
            Geen geldige koppel-link gevonden. Vraag de andere ouder om een nieuwe link te delen
            (Instellingen → Co-ouderschap).
          </p>
        ) : status === 'done' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" strokeWidth={2.2} />
            </span>
            <p className="text-sm text-slate-600">
              Gekoppeld met <strong>{name}</strong>. Gedeelde afspraken verschijnen nu in beide
              agenda&apos;s.
            </p>
            <Link href="/agenda" className="pill bg-brand px-5 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark">
              Naar de agenda
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-500">
              <Users2 className="h-6 w-6" />
            </span>
            <p className="max-w-md text-sm text-slate-600">
              Koppel jullie gezin aan dat van de andere ouder. Daarna kunnen jullie afspraken delen
              die je als &lsquo;voor de andere ouder zichtbaar&rsquo; markeert.
            </p>
            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            <button
              type="button"
              onClick={link}
              disabled={busy}
              className="pill bg-brand px-5 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? 'Bezig…' : 'Onze gezinnen koppelen'}
            </button>
          </div>
        )}
      </DashboardCard>
    </>
  )
}
