'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Lock, ArrowRight } from 'lucide-react'
import DashboardCard from '@/components/DashboardCard'
import { useHousehold } from '@/lib/hooks'
import { MODULES, TIERS, type Tier } from '@/lib/modules'

interface ModuleGateProps {
  module: string
  children: ReactNode
}

/**
 * Toont de inhoud alleen als het huishouden de module in zijn pakket heeft.
 * Anders een nette upsell-kaart met een knop naar de Modules-pagina.
 * De echte afscherming gebeurt server-side (requireModule); dit is de UI-laag.
 */
export default function ModuleGate({ module, children }: ModuleGateProps) {
  const { can, isLoading } = useHousehold()
  const info = MODULES.find((m) => m.key === module)

  if (isLoading) {
    return <p className="text-sm text-slate-400">Laden…</p>
  }

  if (can(module)) {
    return <>{children}</>
  }

  const needsTier: Tier = info?.minTier ?? 'plus'
  const tierName = TIERS.find((t) => t.key === needsTier)?.name ?? 'Plus'

  return (
    <DashboardCard bg="bg-gradient-to-br from-violet-50 to-white" bordered={false} className="ring-1 ring-violet-100">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-500">
          <Lock className="h-7 w-7" strokeWidth={2} />
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">
            {info?.name ?? 'Deze module'} zit in {tierName}
          </h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            {info?.description ?? 'Upgrade je pakket om deze functie te gebruiken.'} Werk je pakket bij om
            deze module te ontgrendelen voor het hele gezin.
          </p>
        </div>
        <Link
          href="/modules"
          className="pill bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-violet-500/30 transition-colors hover:bg-violet-700"
        >
          Bekijk pakketten
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </DashboardCard>
  )
}
