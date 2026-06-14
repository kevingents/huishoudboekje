'use client'

import { useState } from 'react'
import { Package, Check, Lock, Sparkles, ExternalLink, Crown } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import { useHousehold, useAuth } from '@/lib/hooks'
import { apiPost } from '@/lib/api'
import { TIERS, MODULES, TIER_RANK, yearlyPrice, type Tier } from '@/lib/modules'

const CORE_FEATURES = [
  'Agenda & school (iCal)',
  'Boodschappenlijst',
  'Recepten',
  'Budgetoverzicht',
  'Gezinsleden & uitnodigingen',
  'Weer',
]

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Modules die exact bij deze tier worden ontgrendeld (niet in de tier eronder). */
function modulesUnlockedAt(tier: Tier) {
  return MODULES.filter((m) => m.minTier === tier)
}

const accent: Record<Tier, { ring: string; badge: string; btn: string }> = {
  basis: {
    ring: 'ring-cardborder',
    badge: 'bg-slate-100 text-slate-500',
    btn: 'bg-slate-800 hover:bg-slate-900',
  },
  plus: {
    ring: 'ring-brand/30',
    badge: 'bg-brand-light text-brand',
    btn: 'bg-brand hover:bg-brand-dark',
  },
  compleet: {
    ring: 'ring-violet-300',
    badge: 'bg-violet-100 text-violet-600',
    btn: 'bg-violet-600 hover:bg-violet-700',
  },
}

export default function ModulesPage() {
  const { household, tier, isLoading, mutate } = useHousehold()
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'
  const [busy, setBusy] = useState<Tier | null>(null)
  const [error, setError] = useState('')
  const [yearly, setYearly] = useState(false)

  const currentRank = TIER_RANK[tier]

  async function choose(target: Tier) {
    setError('')
    if (target === tier) return
    setBusy(target)
    try {
      const res = (await apiPost('/api/modules/upgrade', {
        tier: target,
        billing: yearly ? 'yearly' : 'monthly',
      })) as {
        checkoutUrl?: string
        activated?: boolean
        error?: string
      }
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl
        return
      }
      if (res?.activated) {
        await mutate()
      } else if (res?.error) {
        setError(res.error)
      }
    } catch (e) {
      setError('Er ging iets mis. Probeer het later opnieuw.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Modules"
        subtitle="Kies het pakket dat bij jullie gezin past"
        icon={Package}
        iconClassName="bg-brand-light text-brand"
      />

      {/* Huidige pakket-strip */}
      <DashboardCard bg="bg-gradient-to-br from-brand-light to-white" bordered={false} className="mb-5 ring-1 ring-brand/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 text-brand">
              <Crown className="h-6 w-6" strokeWidth={2.1} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">Huidig pakket</p>
              <p className="text-lg font-extrabold text-slate-800">
                {isLoading ? '…' : TIERS.find((t) => t.key === tier)?.name}
              </p>
            </div>
          </div>
          {household && (
            <p className="text-sm text-slate-500">
              Huishouden <span className="font-semibold text-slate-700">{household.name}</span>
            </p>
          )}
        </div>
      </DashboardCard>

      {!isOwner && (
        <DashboardCard bg="bg-amber-50/70" bordered={false} className="mb-5 ring-1 ring-amber-100">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Alleen de gezinseigenaar</span> kan het pakket wijzigen.
            Je ziet hier wat er in elk pakket zit.
          </p>
        </DashboardCard>
      )}

      {error && (
        <DashboardCard bg="bg-rose-50/70" bordered={false} className="mb-5 ring-1 ring-rose-100">
          <p className="text-sm text-rose-700">{error}</p>
        </DashboardCard>
      )}

      {/* Maand / jaar-schakelaar */}
      <div className="mb-5 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-card ring-1 ring-cardborder">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              !yearly ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Maandelijks
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              yearly ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Jaarlijks
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                yearly ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              −10%
            </span>
          </button>
        </div>
      </div>

      {/* Pakketten */}
      <div className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((t) => {
          const isCurrent = t.key === tier
          const isUpgrade = TIER_RANK[t.key] > currentRank
          const a = accent[t.key]
          const unlocked = modulesUnlockedAt(t.key)
          const prevName = TIERS[TIER_RANK[t.key] - 1]?.name

          return (
            <section
              key={t.key}
              className={`relative flex flex-col rounded-card bg-white p-5 shadow-card ring-1 ${a.ring} ${
                isCurrent ? 'ring-2' : ''
              } sm:p-6`}
            >
              {t.key === 'plus' && (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                  <Sparkles className="h-3 w-3" />
                  Populair
                </span>
              )}

              <div className="mb-3">
                <h2 className="text-lg font-extrabold text-slate-800">{t.name}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{t.blurb}</p>
              </div>

              <div className="mb-4 flex items-end gap-1">
                {t.price === 0 ? (
                  <span className="text-2xl font-extrabold text-slate-800">Gratis</span>
                ) : yearly ? (
                  <>
                    <span className="text-2xl font-extrabold text-slate-800">€{euro(yearlyPrice(t.price))}</span>
                    <span className="pb-1 text-sm text-slate-400">/ jaar</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-extrabold text-slate-800">€{euro(t.price)}</span>
                    <span className="pb-1 text-sm text-slate-400">/ maand</span>
                  </>
                )}
              </div>

              {t.price > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                    1e maand gratis
                  </span>
                  {yearly && (
                    <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">
                      10% jaarkorting
                    </span>
                  )}
                </div>
              )}

              <ul className="mb-5 flex flex-1 flex-col gap-2 text-sm">
                {t.key === 'basis'
                  ? CORE_FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-slate-600">
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.4} />
                        {f}
                      </li>
                    ))
                  : (
                    <>
                      <li className="flex items-center gap-2 font-semibold text-slate-700">
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.4} />
                        Alles in {prevName}
                      </li>
                      {unlocked.map((m) => (
                        <li key={m.key} className="flex items-start gap-2 text-slate-600">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.4} />
                          <span>
                            <span className="font-semibold text-slate-700">{m.name}</span>
                            <span className="block text-xs text-slate-400">{m.description}</span>
                          </span>
                        </li>
                      ))}
                    </>
                  )}
              </ul>

              <button
                type="button"
                disabled={isCurrent || !isOwner || busy !== null}
                onClick={() => choose(t.key)}
                className={`pill w-full justify-center px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed ${
                  isCurrent
                    ? 'bg-emerald-500'
                    : `${a.btn} ${!isOwner ? 'opacity-50' : ''}`
                }`}
              >
                {busy === t.key ? (
                  'Bezig…'
                ) : isCurrent ? (
                  <>
                    <Check className="h-4 w-4" />
                    Huidig pakket
                  </>
                ) : t.price === 0 ? (
                  'Kies Basis'
                ) : isUpgrade ? (
                  <>
                    Upgrade naar {t.name}
                    <ExternalLink className="h-4 w-4" />
                  </>
                ) : (
                  `Wissel naar ${t.name}`
                )}
              </button>
            </section>
          )
        })}
      </div>

      {/* Module-overzicht met slot-status */}
      <h2 className="mb-3 mt-8 text-base font-bold text-slate-800">Modules in jullie pakket</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {MODULES.map((m) => {
          const active = TIER_RANK[tier] >= TIER_RANK[m.minTier]
          const needs = TIERS.find((t) => t.key === m.minTier)?.name
          return (
            <DashboardCard key={m.key} className={active ? '' : 'opacity-80'}>
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                    active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {active ? <Check className="h-5 w-5" strokeWidth={2.4} /> : <Lock className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.description}</p>
                </div>
                {!active && (
                  <span className="pill shrink-0 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    Vanaf {needs}
                  </span>
                )}
              </div>
            </DashboardCard>
          )
        })}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Betalingen lopen veilig via Mollie. Je kunt op elk moment wisselen of opzeggen.
      </p>
    </>
  )
}
