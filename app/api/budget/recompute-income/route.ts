import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { merchantKey } from '@/lib/budget'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STRONG =
  /salaris|\bloon\b|kinderbijslag|toeslag|\baow\b|pensioen|uitkering|alimentatie|belastingdienst|sociale verzekeringsbank|teruggaaf|teruggave/i

function incomeBucket(label: string): string {
  const c = label.toLowerCase()
  if (c.includes('kinderbijslag')) return 'kinderbijslag'
  if (c.includes('belastingdienst') || c.includes('teruggaaf') || c.includes('teruggave') || c.includes('toeslag'))
    return 'toeslag'
  if (c.includes('uitkering') || c.includes('aow') || c.includes('pensioen')) return 'uitkering'
  if (c.includes('alimentatie')) return 'alimentatie'
  if (c.includes('netto-inkomen') || c.includes('loon') || c.includes('salaris')) return 'loon'
  return 'overig'
}
function titleCase(s: string): string {
  return s.split(' ').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Herberekent terugkerende inkomsten uit de opgeslagen 'Inkomsten'-transacties:
 * totaal per bron ÷ aantal maanden in de data = een eerlijk maandgemiddelde.
 * Bestaande inkomsten met dezelfde naam worden bijgewerkt (idempotent).
 */
export async function POST() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const txs = await prisma.transaction.findMany({
    where: { householdId: hid },
    select: { label: true, amount: true, date: true, category: true },
  })

  const periodMonths = new Set<string>()
  for (const t of txs) {
    const m = /^(\d{4})-(\d{2})/.exec(t.date || '')
    if (m) periodMonths.add(`${m[1]}-${m[2]}`)
  }
  const monthsInPeriod = Math.max(1, periodMonths.size)

  const agg = new Map<string, { label: string; sum: number; subtype: string }>()
  for (const c of txs) {
    if (c.category !== 'Inkomsten' || !STRONG.test(c.label)) continue
    const key = merchantKey(c.label) || c.label.toLowerCase().slice(0, 32)
    const subtype = incomeBucket(c.label)
    const g = agg.get(key) ?? { label: titleCase(merchantKey(c.label) || 'Inkomst'), sum: 0, subtype }
    g.sum += c.amount
    g.subtype = subtype
    agg.set(key, g)
  }

  const existing = await prisma.income.findMany({ where: { householdId: hid }, select: { id: true, label: true } })
  const byLabel = new Map(existing.map((i) => [i.label.toLowerCase(), i.id]))

  let updated = 0
  let created = 0
  for (const g of agg.values()) {
    const amount = Math.round((g.sum / monthsInPeriod) * 100) / 100
    if (amount <= 0) continue
    const id = byLabel.get(g.label.toLowerCase())
    if (id) {
      await prisma.income.update({ where: { id }, data: { amount, category: g.subtype, interval: '1 month' } })
      updated++
    } else {
      await prisma.income.create({
        data: { householdId: hid, label: g.label, amount, category: g.subtype, interval: '1 month' },
      })
      created++
    }
  }

  return Response.json({ ok: true, updated, created, monthsInPeriod })
}
