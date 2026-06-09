'use client'

import useSWR from 'swr'
import {
  ShieldCheck,
  Building2,
  Users,
  UserRound,
  Wallet,
  Plug,
  ChefHat,
  Calendar,
  ShoppingCart,
  Receipt,
  Sparkles,
  PiggyBank,
  Repeat,
  Bell,
  Lock,
  type LucideIcon,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardCard from '@/components/DashboardCard'
import RewardsManager from '@/components/RewardsManager'
import { fetcher } from '@/lib/api'

interface AdminStats {
  totals: { households: number; users: number; members: number; activeSubs: number }
  tiers: Record<string, number>
  tierMeta: { key: string; name: string; price: number }[]
  revenueMonthly: number
  usage: Record<string, number>
  integrations: Record<string, number>
  signups: { date: string; count: number }[]
  recentHouseholds: { id: number; name: string; tier: string; createdAt: string }[]
}

function euro(value: number) {
  return value.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const tierBadge: Record<string, string> = {
  basis: 'bg-slate-100 text-slate-500',
  plus: 'bg-brand-light text-brand',
  compleet: 'bg-violet-100 text-violet-600',
}

const tierBar: Record<string, string> = {
  basis: 'bg-slate-400',
  plus: 'bg-brand',
  compleet: 'bg-violet-500',
}

const usageMeta: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'recipes', label: 'Recepten', icon: ChefHat },
  { key: 'agendaEvents', label: 'Afspraken', icon: Calendar },
  { key: 'shoppingItems', label: 'Boodschappen', icon: ShoppingCart },
  { key: 'transactions', label: 'Transacties', icon: Receipt },
  { key: 'chatMessages', label: 'AI-berichten', icon: Sparkles },
  { key: 'savingsGoals', label: 'Spaardoelen', icon: PiggyBank },
  { key: 'fixedCosts', label: 'Vaste lasten', icon: Repeat },
  { key: 'notifications', label: 'Meldingen', icon: Bell },
]

const integrationLabels: Record<string, string> = {
  weather: 'Weer',
  ical: 'Agenda (iCal)',
  ai: 'AI Assistent',
  mollie: 'Mollie',
  supermarkt: 'Supermarkt',
}

export default function BeheerPage() {
  const { data, error, isLoading } = useSWR<AdminStats>('/api/admin/stats', fetcher, {
    shouldRetryOnError: false,
  })

  if (error) {
    return (
      <>
        <PageHeader title="Beheer" subtitle="Platformstatistieken" icon={ShieldCheck} iconClassName="bg-slate-800 text-white" />
        <DashboardCard bg="bg-amber-50/70" bordered={false} className="ring-1 ring-amber-100">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Geen beheerrechten</p>
              <p className="mt-1 text-sm text-slate-600">
                Deze pagina is alleen voor platformbeheerders. Voeg je e-mailadres toe aan de
                omgevingsvariabele <code>ADMIN_EMAILS</code> (komma-gescheiden) in Vercel en log
                daarna opnieuw in.
              </p>
            </div>
          </div>
        </DashboardCard>
      </>
    )
  }

  const maxSignup = Math.max(1, ...(data?.signups ?? []).map((s) => s.count))
  const tierTotal = data ? Object.values(data.tiers).reduce((a, b) => a + b, 0) : 0

  return (
    <>
      <PageHeader
        title="Beheer"
        subtitle="Platformstatistieken & gebruik"
        icon={ShieldCheck}
        iconClassName="bg-slate-800 text-white"
      />

      {isLoading || !data ? (
        <p className="text-sm text-slate-400">Laden…</p>
      ) : (
        <div className="flex flex-col gap-5">
          {/* KPI's */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi icon={Building2} label="Huishoudens" value={data.totals.households} accent="bg-sky-100 text-sky-600" />
            <Kpi icon={Users} label="Gebruikers" value={data.totals.users} accent="bg-emerald-100 text-emerald-600" />
            <Kpi icon={UserRound} label="Gezinsleden" value={data.totals.members} accent="bg-violet-100 text-violet-600" />
            <Kpi
              icon={Wallet}
              label="Maandomzet"
              value={`€${euro(data.revenueMonthly)}`}
              accent="bg-amber-100 text-amber-600"
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            {/* Pakket-verdeling */}
            <DashboardCard title="Pakketten" icon={ShieldCheck} iconClassName="text-brand">
              <ul className="flex flex-col gap-3">
                {data.tierMeta.map((t) => {
                  const count = data.tiers[t.key] ?? 0
                  const pct = tierTotal ? Math.round((count / tierTotal) * 100) : 0
                  return (
                    <li key={t.key}>
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <span className={`pill px-2.5 py-0.5 text-xs font-semibold ${tierBadge[t.key]}`}>{t.name}</span>
                        <span className="text-slate-400">{t.price === 0 ? 'Gratis' : `€${euro(t.price)}/mnd`}</span>
                        <span className="ml-auto font-bold text-slate-800">{count}</span>
                        <span className="w-10 text-right text-xs text-slate-400">{pct}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${tierBar[t.key]} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 text-xs text-slate-400">
                {data.totals.activeSubs} actieve betaalde {data.totals.activeSubs === 1 ? 'abonnement' : 'abonnementen'} via Mollie.
              </p>
            </DashboardCard>

            {/* Aanmeldingen (14 dagen) */}
            <DashboardCard title="Nieuwe huishoudens" headerRight={<span className="text-xs text-slate-400">14 dagen</span>}>
              <div className="flex h-28 items-end gap-1">
                {data.signups.map((s) => (
                  <div key={s.date} className="group flex flex-1 flex-col items-center justify-end" title={`${s.date}: ${s.count}`}>
                    <div
                      className="w-full rounded-t bg-brand/80 transition-all group-hover:bg-brand"
                      style={{ height: `${(s.count / maxSignup) * 100}%`, minHeight: s.count > 0 ? '6px' : '2px' }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Totaal deze periode: {data.signups.reduce((a, b) => a + b.count, 0)}
              </p>
            </DashboardCard>
          </div>

          {/* Gebruik */}
          <DashboardCard title="Gebruik (totaal aangemaakt)">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {usageMeta.map((u) => {
                const Icon = u.icon
                return (
                  <div key={u.key} className="rounded-2xl bg-slate-50 p-3">
                    <Icon className="h-4 w-4 text-slate-400" />
                    <p className="mt-1.5 text-lg font-extrabold text-slate-800">{data.usage[u.key] ?? 0}</p>
                    <p className="text-xs text-slate-500">{u.label}</p>
                  </div>
                )
              })}
            </div>
          </DashboardCard>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            {/* Integraties */}
            <DashboardCard title="Gekoppelde integraties" icon={Plug} iconClassName="text-sky-500">
              <ul className="flex flex-col gap-2">
                {Object.keys(integrationLabels).map((key) => (
                  <li key={key} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{integrationLabels[key]}</span>
                    <span className="font-bold text-slate-800">{data.integrations[key] ?? 0}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400">Aantal huishoudens met deze koppeling actief.</p>
            </DashboardCard>

            {/* Recente huishoudens */}
            <DashboardCard title="Nieuwste huishoudens">
              {data.recentHouseholds.length === 0 ? (
                <p className="text-sm text-slate-500">Nog geen huishoudens.</p>
              ) : (
                <ul className="flex flex-col">
                  {data.recentHouseholds.map((h, i, arr) => (
                    <li key={h.id}>
                      <div className="flex items-center gap-3 py-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                          {h.name.replace(/^Het\s+/, '').charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{h.name}</span>
                        <span className={`pill px-2.5 py-0.5 text-xs font-semibold ${tierBadge[h.tier] ?? tierBadge.basis}`}>
                          {h.tier}
                        </span>
                        <span className="w-20 text-right text-xs text-slate-400">
                          {new Date(h.createdAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      {i < arr.length - 1 && <hr className="border-cardborder" />}
                    </li>
                  ))}
                </ul>
              )}
            </DashboardCard>
          </div>

          {/* Adverteerder-gesponsorde beloningen beheren */}
          <RewardsManager />
        </div>
      )}
    </>
  )
}

function Kpi({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: string | number; accent: string }) {
  return (
    <DashboardCard>
      <span className={`grid h-10 w-10 place-items-center rounded-2xl ${accent}`}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <p className="mt-3 text-2xl font-extrabold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </DashboardCard>
  )
}
