import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { merchantKey, matchRule } from '@/lib/budget'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Group {
  key: string
  example: string
  total: number
  count: number
  currentCategory: string
  hasRule: boolean
}

function groupByMerchant(
  txs: { label: string; amount: number; category: string }[],
  rules: { pattern: string; category: string; kind: string }[],
): Group[] {
  const groups = new Map<string, Group>()
  for (const t of txs) {
    const key = merchantKey(t.label) || (t.label || 'onbekend').toLowerCase().slice(0, 32)
    const g = groups.get(key) ?? {
      key,
      example: t.label,
      total: 0,
      count: 0,
      currentCategory: t.category,
      hasRule: !!matchRule(t.label, rules),
    }
    g.total += t.amount
    g.count += 1
    groups.set(key, g)
  }
  // Alle groepen teruggeven (incl. al-ingedeelde, met hasRule-vlag) — de client toont
  // standaard alleen de niet-ingedeelde en kan via een toggle ook de rest tonen.
  return [...groups.values()]
    .map((g) => ({ ...g, total: Math.round(g.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
}

/** Toont ÁLLE uitgaven-transacties (gegroepeerd per winkel, met hun huidige
 *  categorie) zodat je elke post kunt herindelen — niet alleen 'Overig'. Posten
 *  waarvoor al een regel bestaat vallen weg. Inkomsten apart. */
export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const [allTx, rules] = await Promise.all([
    prisma.transaction.findMany({ where: { householdId: hid }, select: { label: true, amount: true, category: true } }),
    prisma.merchantRule.findMany({ where: { householdId: hid } }),
  ])

  const all = groupByMerchant(allTx, rules)
  const expenses = all.filter((g) => g.currentCategory !== 'Inkomsten')
  const income = all.filter((g) => g.currentCategory === 'Inkomsten')

  const sum = (groups: Group[]) => Math.round(groups.reduce((s, g) => s + g.total, 0) * 100) / 100

  return Response.json({
    expenses: { total: sum(expenses), count: expenses.length, groups: expenses.slice(0, 200) },
    income: { total: sum(income), count: income.length, groups: income.slice(0, 200) },
  })
}
