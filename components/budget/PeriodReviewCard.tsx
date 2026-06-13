'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TrendingUp, PiggyBank, Check, AlertTriangle } from 'lucide-react'
import DashboardCard from '../DashboardCard'
import {
  useBudget,
  useFixedCosts,
  useSubscriptions,
  useIncome,
  useLoans,
  useSettings,
  useSavings,
} from '@/lib/hooks'
import { isSpendingCategory, periodKeyOf, shiftPeriodKey, spendablePerMonth } from '@/lib/budget'
import { reviewPeriod } from '@/lib/periodReview'

const round = (n: number) => Math.round(n)

/**
 * Terugblik op de vorige budgetperiode: hoe je het deed (totaal + per categorie)
 * en wat je overhield — met één klik over te zetten naar een spaardoel.
 */
export default function PeriodReviewCard() {
  const { categories, transactions } = useBudget()
  const { costs } = useFixedCosts()
  const { subscriptions } = useSubscriptions()
  const { incomes } = useIncome()
  const { loans } = useLoans()
  const { settings } = useSettings()
  const { goals, deposit } = useSavings()

  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => setNow(new Date()), [])

  const [goalId, setGoalId] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const depositing = useRef(false) // synchrone guard tegen dubbelklik (state is async)

  const periodStart =
    typeof settings.budgetPeriodStart === 'number' && settings.budgetPeriodStart >= 1 && settings.budgetPeriodStart <= 28
      ? settings.budgetPeriodStart
      : 1
  const periodWord = periodStart > 1 ? 'periode' : 'maand'

  const review = useMemo(() => {
    if (!now) return null
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const currentKey = periodKeyOf(nowStr, periodStart) ?? ''
    const prevKey = shiftPeriodKey(currentKey, -1)
    const spendable = spendablePerMonth({ incomes, costs, subscriptions, loans })
    const spendingCats = categories.filter((c) => isSpendingCategory(c.name))
    return reviewPeriod({ transactions, spendingCategories: spendingCats, spendable, periodKey: prevKey, periodStart })
  }, [now, periodStart, incomes, costs, subscriptions, loans, categories, transactions])

  // Geen terugblik tonen zolang er in de vorige periode niets is uitgegeven.
  if (!now || !review || review.spent <= 0) return null

  const selectedGoal = goals.find((g) => g.id === goalId) ?? goals[0]

  const onDeposit = async () => {
    if (!selectedGoal || review.surplus <= 0 || depositing.current) return
    depositing.current = true
    setBusy(true)
    try {
      await deposit(selectedGoal, Math.round(review.surplus))
      setDone(`€${round(review.surplus)} bijgeschreven bij ${selectedGoal.name}.`)
    } catch {
      setDone('Inleggen mislukt — probeer het opnieuw.')
      depositing.current = false // bij fout opnieuw kunnen proberen
    } finally {
      setBusy(false)
    }
  }

  return (
    <DashboardCard
      title={`Terugblik vorige ${periodWord}`}
      icon={TrendingUp}
      iconClassName="text-brand"
      className="lg:col-span-2"
    >
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">€{round(review.spent)}</span>
        <span className="text-sm text-slate-500">uitgegeven van €{round(review.spendable)} te besteden</span>
        {review.withinBudget ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <Check className="h-3 w-3" /> binnen budget
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
            <AlertTriangle className="h-3 w-3" /> €{round(review.overspend)} over budget
          </span>
        )}
      </div>

      {/* Sparen-suggestie (de vergelijking + per categorie staat in Inzichten). */}
      <div className="mt-4 rounded-2xl bg-brand-light/60 p-3 dark:bg-white/5">
        {done ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            <Check className="h-4 w-4" />
            {done}
          </p>
        ) : review.surplus > 0 ? (
          <>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <PiggyBank className="h-4 w-4 text-brand" />
              Je hield €{round(review.surplus)} over — mooi om naar je spaarrekening over te maken.
            </p>
            {goals.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {goals.length > 1 && (
                  <select
                    value={selectedGoal?.id ?? ''}
                    onChange={(e) => setGoalId(e.target.value ? Number(e.target.value) : '')}
                    className="rounded-xl border border-cardborder bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20"
                  >
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDeposit}
                  className="pill bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:opacity-50"
                >
                  <PiggyBank className="h-4 w-4" />
                  {busy ? 'Bezig…' : `€${round(review.surplus)} inleggen bij ${selectedGoal?.name ?? 'spaardoel'}`}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">
                Maak een spaardoel aan (hieronder bij Spaardoelen) om dit met één klik opzij te zetten.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Je gaf deze {periodWord} alles uit wat je te besteden had — volgende {periodWord} een potje
            overhouden om te sparen?
          </p>
        )}
      </div>
    </DashboardCard>
  )
}
