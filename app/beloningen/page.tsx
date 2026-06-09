'use client'

import { useState } from 'react'
import { Gift, BadgeCheck, Percent, Plus, Trash2, Sparkles, Home } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import Modal from '@/components/Modal'
import { useRewards, useFamilyRewards } from '@/lib/hooks'

const inputClass =
  'w-full rounded-xl border border-cardborder bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

export default function BeloningenPage() {
  const { rewards: partnerRewards, isLoading } = useRewards()
  const { rewards: ownRewards, addReward, removeReward } = useFamilyRewards()
  const [tab, setTab] = useState<'partners' | 'eigen'>('partners')

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', cost: '' })

  const submitOwn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    await addReward({
      title: form.title.trim(),
      description: form.description.trim() || null,
      cost: Number(form.cost) || 0,
    })
    setForm({ title: '', description: '', cost: '' })
    setAddOpen(false)
  }

  return (
    <>
      <PageHeader
        title="Beloningen"
        subtitle="Spaar samen voor een beloning"
        icon={Gift}
        iconClassName="bg-violet-100 text-violet-500"
      />

      {/* Twee delen */}
      <div className="mb-5 flex rounded-full border border-cardborder bg-white p-1 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setTab('partners')}
          className={`flex-1 rounded-full px-4 py-2 transition-colors ${
            tab === 'partners' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Van partners
        </button>
        <button
          type="button"
          onClick={() => setTab('eigen')}
          className={`flex-1 rounded-full px-4 py-2 transition-colors ${
            tab === 'eigen' ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Van ons gezin
        </button>
      </div>

      {tab === 'partners' ? (
        isLoading && partnerRewards.length === 0 ? (
          <p className="text-sm text-slate-400">Laden…</p>
        ) : partnerRewards.length === 0 ? (
          <DashboardCard bg="bg-gradient-to-br from-violet-50 to-white" bordered={false} className="ring-1 ring-violet-100">
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-500">
                <Percent className="h-7 w-7" strokeWidth={2} />
              </span>
              <p className="max-w-md text-sm text-slate-600">
                Nog geen partner-acties. Binnenkort krijg je hier korting bij partners van Fam — denk
                aan “doe 5x de afwas voor 10% korting”.
              </p>
            </div>
          </DashboardCard>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {partnerRewards.map((r) => (
              <article
                key={r.id}
                className="flex flex-col overflow-hidden rounded-card border border-cardborder bg-white shadow-card"
              >
                {r.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.imageUrl} alt={r.title} className="h-40 w-full object-cover" />
                ) : (
                  <div className="grid h-40 w-full place-items-center bg-gradient-to-br from-violet-100 to-violet-50 text-violet-400">
                    <Gift className="h-10 w-10" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600">
                    <BadgeCheck className="h-3 w-3" />
                    {r.partner}
                  </span>
                  <h3 className="text-base font-bold text-slate-800">{r.title}</h3>
                  {r.description && <p className="mt-1 text-sm text-slate-500">{r.description}</p>}
                  {r.conditions && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                      <Percent className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Voorwaarde: {r.conditions}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled
                    className="pill mt-4 w-full cursor-not-allowed justify-center bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400"
                  >
                    <Sparkles className="h-4 w-4" />
                    Kies als doel — binnenkort
                  </button>
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        <>
          <DashboardCard
            title="Eigen beloningen"
            icon={Home}
            iconClassName="text-emerald-500"
            headerRight={
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="pill bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark"
              >
                <Plus className="h-3.5 w-3.5" />
                Beloning
              </button>
            }
          >
            {ownRewards.length === 0 ? (
              <p className="text-sm text-slate-500">
                Bedenk zelf beloningen voor het gezin, bijv. “30 min extra schermtijd” of “samen een
                film kiezen”. Hang er een aantal punten/taken aan.
              </p>
            ) : (
              <ul className="flex flex-col">
                {ownRewards.map((r, i) => (
                  <li key={r.id}>
                    <div className="group flex items-center gap-3 py-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                        <Gift className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{r.title}</p>
                        {r.description && <p className="truncate text-xs text-slate-500">{r.description}</p>}
                      </div>
                      {r.cost > 0 && (
                        <span className="pill shrink-0 bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand">
                          {r.cost} punten
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeReward(r.id)}
                        aria-label={`${r.title} verwijderen`}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {i < ownRewards.length - 1 && <hr className="border-cardborder" />}
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
          <p className="mt-3 text-center text-xs text-slate-400">
            Binnenkort koppel je een beloning als doel aan een taak in het gezinsspel.
          </p>
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Eigen beloning toevoegen">
        <form onSubmit={submitOwn} className="flex flex-col gap-3">
          <label className="text-xs font-semibold text-slate-500">
            Beloning
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Bijv. 30 min extra schermtijd"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Omschrijving (optioneel)
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Korte toelichting"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="w-32 text-xs font-semibold text-slate-500">
            Punten
            <input
              inputMode="numeric"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              placeholder="0"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            className="pill mt-1 bg-brand px-4 py-2.5 text-white shadow-sm shadow-brand/20 hover:bg-brand-dark"
          >
            Beloning opslaan
          </button>
        </form>
      </Modal>
    </>
  )
}
