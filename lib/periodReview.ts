// Terugblik op een budgetperiode: hoe is het gegaan en wat houd je over (om te
// sparen)? Pure functie, gedeeld door de in-app kaart en (later) de cron.

import { txPeriodKey, isSpendingCategory } from './budget'

export interface PeriodCategoryLine {
  name: string
  spent: number
  limit: number
}

export interface PeriodReviewResult {
  spent: number // totaal variabel uitgegeven in de periode
  spendable: number // wat er te besteden was ("wat overblijft")
  surplus: number // spendable − spent, nooit negatief — kandidaat om te sparen
  overspend: number // spent − spendable als je eroverheen ging, anders 0
  withinBudget: boolean
  categories: PeriodCategoryLine[] // per spending-categorie, gesorteerd op meeste uitgaven
}

export function reviewPeriod(opts: {
  transactions: { category?: string | null; amount: number; date?: string; createdAt?: string | Date | null }[]
  spendingCategories: { name: string; limit: number }[]
  spendable: number
  periodKey: string
  periodStart: number
}): PeriodReviewResult {
  const { transactions, spendingCategories, spendable, periodKey, periodStart } = opts
  const byCat = new Map<string, number>()
  let spent = 0
  for (const t of transactions) {
    const amount = Number(t.amount) || 0
    if (amount <= 0 || !isSpendingCategory(t.category || '')) continue
    // Datum kan een sentinel zijn ("Vandaag"/"Geïmporteerd"); val terug op createdAt.
    if (txPeriodKey(t, periodStart) !== periodKey) continue
    const name = t.category || 'Overig'
    byCat.set(name, (byCat.get(name) ?? 0) + amount)
    spent += amount
  }
  const categories = spendingCategories
    .map((c) => ({ name: c.name, spent: byCat.get(c.name) ?? 0, limit: c.limit }))
    .sort((a, b) => b.spent - a.spent)
  const diff = spendable - spent
  return {
    spent,
    spendable,
    surplus: Math.max(0, diff),
    overspend: Math.max(0, -diff),
    withinBudget: diff >= 0,
    categories,
  }
}
