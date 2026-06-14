'use client'

import { useEffect, useMemo, useState } from 'react'
import { Scale, Check, PiggyBank, Loader2 } from 'lucide-react'
import DashboardCard from '@/components/DashboardCard'
import { allocateBudget, goalReservePerMonth, savingsReservePerMonth } from '@/lib/budget'
import type { SavingsGoal } from '@/lib/types'

type Cat = { id: number; name: string; color?: string; icon?: string; limit: number }

const euro = (n: number) => Math.round(n).toLocaleString('nl-NL')
const fieldClass =
  'w-24 rounded-lg border border-cardborder bg-white px-2.5 py-1.5 text-right text-sm font-semibold text-slate-800 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20'

/**
 * Verdeelt het maandelijkse overschot (inkomsten − vaste lasten − spaardoelen)
 * over de variabele categorieën en stelt met één klik de budget-limieten in.
 */
export default function BudgetAllocator({
  incomeMonthly,
  fixedMonthly,
  categories,
  averages,
  goals,
  onApply,
}: {
  incomeMonthly: number
  fixedMonthly: number
  categories: Cat[]
  averages: [string, number][]
  goals: SavingsGoal[]
  onApply: (limits: { id: number; limit: number }[]) => Promise<void>
}) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const [basis, setBasis] = useState<'verhouding' | 'gelijk'>('verhouding')
  const [edits, setEdits] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const avgMap = useMemo(() => new Map(averages), [averages])
  const savingsMonthly = now ? savingsReservePerMonth(goals, now) : 0
  const spendable = Math.max(0, Math.round(incomeMonthly - fixedMonthly))
  const pot = Math.max(0, spendable - savingsMonthly)

  const catKeys = categories.map((c) => ({ id: c.id, name: c.name }))
  const suggested = useMemo(
    () => allocateBudget(pot, catKeys, avgMap, basis),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pot, basis, avgMap, categories.map((c) => c.id).join(',')],
  )

  // Bij wijziging van basis of potje: terug naar het verse voorstel.
  useEffect(() => {
    setEdits({})
    setDone(false)
  }, [basis, pot])

  const valueOf = (id: number) => (edits[id] !== undefined ? Number(edits[id].replace(',', '.')) || 0 : suggested.get(id) ?? 0)
  const allocated = categories.reduce((s, c) => s + valueOf(c.id), 0)
  const remaining = Math.round(pot - allocated)

  const goalReserves = now
    ? goals
        .map((g) => ({ g, m: goalReservePerMonth(g, now) }))
        .filter((x) => x.m > 0)
        .sort((a, b) => b.m - a.m)
    : []

  const apply = async () => {
    setBusy(true)
    try {
      await onApply(categories.map((c) => ({ id: c.id, limit: Math.max(0, Math.round(valueOf(c.id))) })))
      setDone(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardCard title="Budget verdelen" icon={Scale} iconClassName="text-brand" className="lg:col-span-2">
      {incomeMonthly <= 0 ? (
        <p className="text-sm text-slate-600">
          Vul eerst je <span className="font-semibold">inkomsten</span> in (hieronder), dan kan Fam berekenen wat je
          maandelijks kunt verdelen.
        </p>
      ) : categories.length === 0 ? (
        <p className="text-sm text-slate-600">
          Je hebt nog geen categorieën. Voeg er een paar toe via <span className="font-semibold">Uitgave toevoegen</span>{' '}
          (je kunt daar een nieuwe categorie typen), dan verdeelt Fam je budget eroverheen.
        </p>
      ) : (
        <>
          {/* Rekensom: inkomsten − vaste lasten − spaardoelen = te verdelen */}
          <div className="flex flex-col gap-1.5 rounded-2xl bg-slate-50 p-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Inkomsten per maand</span>
              <span className="font-semibold text-slate-800">€{euro(incomeMonthly)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">− Vaste lasten, abonnementen &amp; aflossingen</span>
              <span className="font-semibold text-slate-800">−€{euro(fixedMonthly)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <PiggyBank className="h-4 w-4 text-emerald-500" />− Spaardoelen
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">−€{euro(savingsMonthly)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-cardborder pt-2">
              <span className="font-bold text-slate-800">Te verdelen over categorieën</span>
              <span className="text-lg font-extrabold text-brand">€{euro(pot)}</span>
            </div>
          </div>

          {/* Welke spaardoelen worden gereserveerd */}
          {goalReserves.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-400">
              Gereserveerd voor:{' '}
              {goalReserves.map((x, i) => (
                <span key={x.g.id}>
                  {i > 0 ? ' · ' : ''}
                  <span className="font-semibold text-slate-500">{x.g.name}</span> €{euro(x.m)}/mnd
                </span>
              ))}
              . Spaardoelen zonder streefdatum reserveren we niet automatisch — geef ze een datum om mee te tellen.
            </p>
          )}

          {/* Basis-keuze */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Verdeel:</span>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5">
              {([
                ['verhouding', 'Naar je uitgaven'],
                ['gelijk', 'Gelijk'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBasis(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    basis === key
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Per categorie */}
          <ul className="mt-3 flex flex-col divide-y divide-cardborder">
            {categories.map((c) => {
              const avg = avgMap.get(c.name) ?? 0
              return (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                    {avg > 0 && <p className="text-[11px] text-slate-400">gem. €{euro(avg)} p/m</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-slate-500">
                    <span className="text-sm">€</span>
                    <input
                      inputMode="numeric"
                      value={edits[c.id] ?? String(suggested.get(c.id) ?? 0)}
                      onChange={(e) => setEdits((p) => ({ ...p, [c.id]: e.target.value }))}
                      className={fieldClass}
                      aria-label={`Budget voor ${c.name}`}
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Restant + opslaan */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-cardborder pt-3">
            <p
              className={`text-sm font-semibold ${
                remaining === 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : remaining > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {remaining === 0
                ? 'Alles verdeeld'
                : remaining > 0
                  ? `Nog €${euro(remaining)} te verdelen`
                  : `€${euro(-remaining)} te veel verdeeld`}
            </p>
            <button
              type="button"
              onClick={apply}
              disabled={busy}
              className="pill bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : done ? (
                <Check className="h-4 w-4" />
              ) : (
                <Scale className="h-4 w-4" />
              )}
              {busy ? 'Instellen…' : done ? 'Budgetten ingesteld' : 'Stel deze budgetten in'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Hiermee zet je de maandlimiet per categorie. Je dagbudget (&ldquo;te besteden&rdquo;) en de
            voortgangsbalken volgen automatisch. Je spaardoelen blijven er apart van.
          </p>
        </>
      )}
    </DashboardCard>
  )
}
