import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { merchantKey } from '@/lib/budget'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Group {
  key: string
  example: string
  total: number
  count: number
}

function groupByMerchant(txs: { label: string; amount: number }[]): Group[] {
  const groups = new Map<string, Group>()
  for (const t of txs) {
    const key = merchantKey(t.label) || (t.label || 'onbekend').toLowerCase().slice(0, 32)
    const g = groups.get(key) ?? { key, example: t.label, total: 0, count: 0 }
    g.total += t.amount
    g.count += 1
    groups.set(key, g)
  }
  return [...groups.values()]
    .map((g) => ({ ...g, total: Math.round(g.total * 100) / 100 }))
    .sort((a, b) => b.total - a.total)
}

/** Groepeert de in te delen "Overig"-uitgaven én de "Inkomsten"-bijschrijvingen
 *  per winkel/tegenpartij, zodat de gebruiker ze één voor één kan indelen. */
export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const [overig, inkomsten] = await Promise.all([
    prisma.transaction.findMany({ where: { householdId: hid, category: 'Overig' }, select: { label: true, amount: true } }),
    prisma.transaction.findMany({ where: { householdId: hid, category: 'Inkomsten' }, select: { label: true, amount: true } }),
  ])

  const sum = (txs: { amount: number }[]) => Math.round(txs.reduce((s, t) => s + t.amount, 0) * 100) / 100
  return Response.json({
    expenses: { total: sum(overig), count: overig.length, groups: groupByMerchant(overig).slice(0, 80) },
    income: { total: sum(inkomsten), count: inkomsten.length, groups: groupByMerchant(inkomsten).slice(0, 80) },
  })
}
