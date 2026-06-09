'use client'

import { Gift, BadgeCheck, Sparkles } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import { useRewards } from '@/lib/hooks'

export default function BeloningenPage() {
  const { rewards, isLoading } = useRewards()

  return (
    <>
      <PageHeader
        title="Beloningen"
        subtitle="Spaar samen voor een leuke beloning van onze partners"
        icon={Gift}
        iconClassName="bg-violet-100 text-violet-500"
      />

      {isLoading && rewards.length === 0 ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : rewards.length === 0 ? (
        <DashboardCard bg="bg-gradient-to-br from-violet-50 to-white" bordered={false} className="ring-1 ring-violet-100">
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-500">
              <Gift className="h-7 w-7" strokeWidth={2} />
            </span>
            <p className="max-w-md text-sm text-slate-600">
              Er zijn nog geen beloningen beschikbaar. Houd het in de gaten — binnenkort komen er
              leuke acties van partners van Fam, zoals een dagje uit als jullie samen genoeg
              taken volbrengen.
            </p>
          </div>
        </DashboardCard>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {rewards.map((r) => (
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
                  <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                    Voorwaarden: {r.conditions}
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
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Beloningen worden mogelijk gemaakt door partners van Fam. Binnenkort koppel je een
        beloning als doel aan een taak in het gezinsspel.
      </p>
    </>
  )
}
