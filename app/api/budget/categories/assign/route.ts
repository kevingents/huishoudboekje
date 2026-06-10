import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { isSpendingCategory, labelMatchesPattern } from '@/lib/budget'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function normalizePattern(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/**
 * Koppelt alle transacties die op een winkel-trefwoord (pattern) matchen aan een
 * uitgave-categorie en onthoudt dat als MerchantRule, zodat ook latere imports
 * automatisch in dezelfde categorie vallen. "Ontkoppelen" = verplaatsen naar
 * 'Overig'. Met `remember:false` wordt alleen verplaatst (geen regel onthouden).
 */
export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const body = await req.json().catch(() => ({}))
  const pattern = normalizePattern(body?.pattern)
  const category = String(body?.category ?? '').slice(0, 60).trim()
  const remember = body?.remember !== false // standaard: onthouden
  if (!pattern || !category) {
    return Response.json({ error: 'pattern en category zijn verplicht' }, { status: 400 })
  }

  // Doelcategorie moet bestaan voor dit huishouden (geen vervuilde category-namen
  // via directe API-aanroepen).
  const target = await prisma.budgetCategory.findFirst({ where: { householdId: hid, name: category } })
  if (!target) {
    return Response.json({ error: 'Doelcategorie bestaat niet' }, { status: 400 })
  }

  // Matchen gebeurt op de genormaliseerde winkel-sleutel (in JS), niet in SQL.
  // Alleen uitgave-transacties verplaatsen — inkomsten/genegeerde posten blijven.
  const txs = await prisma.transaction.findMany({
    where: { householdId: hid },
    select: { id: true, label: true, category: true, amount: true },
  })
  const matches = txs.filter(
    (t) => t.category !== category && isSpendingCategory(t.category) && labelMatchesPattern(t.label, pattern),
  )
  const ids = matches.map((t) => t.id)

  let moved = 0
  if (ids.length) {
    const res = await prisma.transaction.updateMany({
      where: { id: { in: ids }, householdId: hid },
      data: { category },
    })
    moved = res.count

    // Houd het 'spent'-veld in sync: herbereken het (absolute som uit transacties)
    // voor de doel- én bron-categorieën die door deze verplaatsing geraakt zijn.
    const affected = new Set<string>([category, ...matches.map((t) => t.category)])
    const after = await prisma.transaction.findMany({
      where: { householdId: hid },
      select: { category: true, amount: true },
    })
    for (const name of affected) {
      const sum = after.filter((t) => t.category === name).reduce((s, t) => s + (t.amount || 0), 0)
      await prisma.budgetCategory.updateMany({ where: { householdId: hid, name }, data: { spent: sum } })
    }
  }

  if (remember) {
    const existing = await prisma.merchantRule.findFirst({ where: { householdId: hid, pattern } })
    if (existing) {
      await prisma.merchantRule.update({ where: { id: existing.id }, data: { category, kind: 'expense' } })
    } else {
      await prisma.merchantRule.create({ data: { householdId: hid, pattern, category, kind: 'expense' } })
    }
  }

  return Response.json({ ok: true, moved, pattern, category })
}
