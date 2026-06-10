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

/** Groepeert de nog in te delen "Overig"-uitgaven én "Inkomsten"-bijschrijvingen
 *  per winkel/tegenpartij. Posten waarvoor al een (geleerde) regel bestaat, vallen
 *  weg uit de lijst — die zijn immers al ingedeeld. */
export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const [overig, inkomsten, rules] = await Promise.all([
    prisma.transaction.findMany({ where: { householdId: hid, category: 'Overig' }, select: { label: true, amount: true } }),
    prisma.transaction.findMany({ where: { householdId: hid, category: 'Inkomsten' }, select: { label: true, amount: true } }),
    prisma.merchantRule.findMany({ where: { householdId: hid } }),
  ])

  const unhandled = (groups: Group[]) => groups.filter((g) => !matchRule(g.example, rules))
  const sum = (txs: { amount: number }[]) => Math.round(txs.reduce((s, t) => s + t.amount, 0) * 100) / 100

  const expGroups = unhandled(groupByMerchant(overig))
  const incGroups = unhandled(groupByMerchant(inkomsten))

  return Response.json({
    expenses: { total: sum(overig), count: expGroups.length, groups: expGroups.slice(0, 80) },
    income: { total: sum(inkomsten), count: incGroups.length, groups: incGroups.slice(0, 80) },
  })
}
