'use client'

import { Megaphone, ExternalLink } from 'lucide-react'
import DashboardCard from './DashboardCard'
import { useAds } from '@/lib/hooks'

/** Toont actieve aanbiedingen/advertenties (AH-bonus-stijl). Verbergt zich als er geen zijn. */
export default function SponsoredAds({ className }: { className?: string }) {
  const { ads } = useAds()
  if (ads.length === 0) return null

  return (
    <DashboardCard
      title="Aanbiedingen"
      icon={Megaphone}
      iconClassName="text-amber-500"
      className={className}
      headerRight={
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Advertentie</span>
      }
    >
      <div className="flex flex-col gap-2.5">
        {ads.slice(0, 3).map((ad) => {
          const inner = (
            <div className="flex items-center gap-3">
              {ad.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-500">
                  <Megaphone className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">{ad.title}</p>
                {ad.body && <p className="truncate text-xs text-slate-500">{ad.body}</p>}
                <p className="text-[11px] font-semibold text-amber-600">{ad.sponsor}</p>
              </div>
              {ad.linkUrl && <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />}
            </div>
          )
          return ad.linkUrl ? (
            <a
              key={ad.id}
              href={ad.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-cardborder p-2.5 transition-colors hover:bg-slate-50"
            >
              {inner}
            </a>
          ) : (
            <div key={ad.id} className="rounded-2xl border border-cardborder p-2.5">
              {inner}
            </div>
          )
        })}
      </div>
    </DashboardCard>
  )
}
