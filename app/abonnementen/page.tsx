'use client'

import { useState } from 'react'
import { CreditCard, Plus, Trash2, ExternalLink } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import { useSubscriptions, useIntegrations } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

const intervals = [
  { value: '1 month', label: 'Per maand' },
  { value: '3 months', label: 'Per kwartaal' },
  { value: '12 months', label: 'Per jaar' },
  { value: '1 week', label: 'Per week' },
]

const statusBadge: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-600',
  pending: 'bg-amber-100 text-amber-600',
  canceled: 'bg-slate-100 text-slate-500',
}

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AbonnementenPage() {
  const { subscriptions, isLoading, addSubscription, removeSubscription } = useSubscriptions()
  const { integrations } = useIntegrations()
  const mollie = integrations.find((i) => i.key === 'mollie')
  const connected = mollie?.status === 'connected'

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', interval: '1 month' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(form.amount.replace(',', '.'))
    if (!form.name.trim() || !amount) return
    const res = await addSubscription({ name: form.name, amount, interval: form.interval })
    setForm({ name: '', amount: '', interval: '1 month' })
    setOpen(false)
    if (res?.checkoutUrl) window.location.href = res.checkoutUrl
  }

  return (
    <>
      <PageHeader
        title="Abonnementen"
        subtitle="Terugkerende betalingen via Mollie"
        icon={CreditCard}
        iconClassName="bg-sky-100 text-sky-500"
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pill bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Nieuw abonnement
          </button>
        }
      />

      {!connected && (
        <DashboardCard bg="bg-amber-50/70" bordered={false} className="mb-5 ring-1 ring-amber-100">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Mollie nog niet gekoppeld.</span> Abonnementen worden nu
            lokaal bijgehouden. Vul een Mollie API-key in (via <code>MOLLIE_API_KEY</code>) om echte
            terugkerende betalingen aan te maken.
          </p>
        </DashboardCard>
      )}

      {isLoading && subscriptions.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : subscriptions.length === 0 ? (
        <DashboardCard>
          <p className="text-sm text-slate-500">Nog geen abonnementen. Voeg er een toe.</p>
        </DashboardCard>
      ) : (
        <div className="flex flex-col gap-4">
          {subscriptions.map((sub) => (
            <DashboardCard key={sub.id}>
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-500">
                  <CreditCard className="h-6 w-6" strokeWidth={2.1} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-800">{sub.name}</p>
                  <p className="text-sm text-slate-500">
                    €{euro(sub.amount)} · {sub.interval}
                  </p>
                </div>
                <span className={`pill px-2.5 py-1 text-xs font-semibold ${statusBadge[sub.status] ?? statusBadge.pending}`}>
                  {sub.status}
                </span>
                <button
                  type="button"
                  onClick={() => removeSubscription(sub.id)}
                  aria-label={`${sub.name} opzeggen`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cardborder bg-white text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </DashboardCard>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nieuw abonnement">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Omschrijving
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bijv. Krant-abonnement"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <div className="flex gap-3">
            <label className="w-32 text-xs font-semibold text-slate-500">
              Bedrag (€)
              <input
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="9,99"
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <label className="flex-1 text-xs font-semibold text-slate-500">
              Interval
              <select
                value={form.interval}
                onChange={(e) => setForm({ ...form, interval: e.target.value })}
                className={`mt-1 ${inputClass}`}
              >
                {intervals.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="pill mt-2 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            {connected ? (
              <>
                Doorgaan naar betaling
                <ExternalLink className="h-4 w-4" />
              </>
            ) : (
              'Abonnement opslaan'
            )}
          </button>
        </form>
      </Modal>
    </>
  )
}
