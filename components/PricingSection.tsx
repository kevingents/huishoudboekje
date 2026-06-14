'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { TIERS, TIER_FEATURES, yearlyPrice, LAUNCH_OFFER, type Tier } from '@/lib/modules'

const euro = (n: number) => `€${n.toFixed(2).replace('.', ',')}`

export default function PricingSection() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pakketten" className="bg-canvas py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Een pakket dat met jullie meegroeit</h2>
          <p className="mt-3 text-slate-500">
            Begin gratis, breid uit wanneer je wilt. Maandelijks opzegbaar, up- of downgraden kan altijd.
          </p>
          {LAUNCH_OFFER.active && (
            <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-700">
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                {LAUNCH_OFFER.label}
              </span>
              {LAUNCH_OFFER.sub}
            </div>
          )}

          {/* Maand / jaar-schakelaar */}
          <div className="mx-auto mt-6 inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-card ring-1 ring-cardborder">
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
                2 mnd gratis
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl items-stretch gap-5 sm:grid-cols-3">
          {TIERS.map((t) => {
            const popular = t.key === 'plus'
            const yearPrice = yearlyPrice(t.price)
            return (
              <div
                key={t.key}
                className={`relative flex flex-col rounded-card bg-white p-6 shadow-card ${
                  popular ? 'ring-2 ring-brand' : 'ring-1 ring-cardborder'
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                    Populair
                  </span>
                )}
                <h3 className="text-lg font-extrabold text-slate-800">{t.name}</h3>

                <div className="mt-2 flex items-end gap-1">
                  {t.price === 0 ? (
                    <span className="text-3xl font-extrabold">Gratis</span>
                  ) : yearly ? (
                    <>
                      <span className="text-3xl font-extrabold">{euro(yearPrice)}</span>
                      <span className="pb-1 text-sm text-slate-400">/ jaar</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold">{euro(t.price)}</span>
                      <span className="pb-1 text-sm text-slate-400">/ mnd</span>
                    </>
                  )}
                </div>

                {t.price > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {LAUNCH_OFFER.active && (
                      <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">
                        {LAUNCH_OFFER.sub}
                      </span>
                    )}
                    {yearly && (
                      <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                        ≈ {euro(yearPrice / 12)} p/m · 2 mnd gratis
                      </span>
                    )}
                  </div>
                )}

                <p className="mt-3 text-sm text-slate-500">{t.blurb}</p>

                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {TIER_FEATURES[t.key as Tier].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={2.4} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/registreren"
                  className={`pill mt-5 w-full justify-center px-4 py-2.5 text-sm font-semibold ${
                    popular
                      ? 'bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-dark'
                      : 'border border-cardborder text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t.price === 0 ? 'Gratis beginnen' : `Kies ${t.name}`}
                </Link>
              </div>
            )
          })}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-slate-400">
          {LAUNCH_OFFER.active ? `Launch-aanbieding: ${LAUNCH_OFFER.sub}. ` : ''}Kies je voor een jaarabonnement, dan
          krijg je 2 maanden gratis. Je kunt op elk moment up- of downgraden en betaalt nooit voor functies die je
          niet gebruikt. Betalingen lopen veilig via Mollie.
        </p>
      </div>
    </section>
  )
}
