import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { categorizeTx } from '@/lib/bankImport'
import { categoryForKind, isSpendingCategory, matchRule, monthsInData, suggestCostCategory } from '@/lib/budget'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COLORS = ['emerald', 'violet', 'amber', 'sky']

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function titleCase(s: string): string {
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function POST() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const [rules, txs, cats] = await Promise.all([
    prisma.merchantRule.findMany({ where: { householdId: hid } }),
    prisma.transaction.findMany({
      where: { householdId: hid },
      select: { id: true, label: true, amount: true, category: true, date: true },
    }),
    prisma.budgetCategory.findMany({ where: { householdId: hid }, select: { id: true, name: true } }),
  ])

  const overigBefore = txs.filter((t) => t.category === 'Overig').length

  // Per transactie de definitieve categorie bepalen (regels > ingebouwd > met rust laten).
  const updates: { id: number; category: string }[] = []
  const spentByCat = new Map<string, number>()
  const fixedAgg = new Map<string, { name: string; sum: number; count: number; category: string; isSub: boolean }>()
  const incAgg = new Map<string, { name: string; sum: number; count: number; subtype: string }>()

  for (const t of txs) {
    const rule = matchRule(t.label, rules)
    let finalCat = t.category
    if (rule) {
      finalCat = categoryForKind(rule.kind, rule.category, categorizeTx(t.label))
      if (rule.kind === 'fixed' || rule.kind === 'subscription') {
        const name = titleCase(rule.pattern)
        const fa =
          fixedAgg.get(rule.pattern) ??
          { name, sum: 0, count: 0, category: rule.category || '', isSub: rule.kind === 'subscription' }
        fa.sum += t.amount
        fa.count += 1
        fixedAgg.set(rule.pattern, fa)
      } else if (rule.kind === 'income') {
        const name = titleCase(rule.pattern)
        const g = incAgg.get(rule.pattern) ?? { name, sum: 0, count: 0, subtype: rule.category || 'overig' }
        g.sum += t.amount
        g.count += 1
        incAgg.set(rule.pattern, g)
      }
    } else if (t.category === 'Overig') {
      finalCat = categorizeTx(t.label)
    }
    if (finalCat !== t.category) updates.push({ id: t.id, category: finalCat })
    if (isSpendingCategory(finalCat)) spentByCat.set(finalCat, (spentByCat.get(finalCat) ?? 0) + t.amount)
  }

  // Wijzigingen wegschrijven, gegroepeerd per categorie (in stukjes).
  const byCat = new Map<string, number[]>()
  for (const u of updates) {
    const list = byCat.get(u.category) ?? []
    list.push(u.id)
    byCat.set(u.category, list)
  }
  for (const [cat, ids] of byCat) {
    for (const part of chunk(ids, 1000)) {
      await prisma.transaction.updateMany({ where: { id: { in: part }, householdId: hid }, data: { category: cat } })
    }
  }

  // Ontbrekende (zichtbare) categorieën aanmaken zodat ze in de grafiek verschijnen.
  // spent (= "deze maand") laten we met rust: dat hoort bij handmatige uitgaven.
  const have = new Set(cats.map((c) => c.name.toLowerCase()))
  let ci = cats.length
  for (const cat of spentByCat.keys()) {
    if (have.has(cat.toLowerCase())) continue
    await prisma.budgetCategory.create({
      data: { householdId: hid, name: cat, color: COLORS[ci % COLORS.length], icon: 'ShoppingCart', limit: 0, spent: 0 },
    })
    have.add(cat.toLowerCase())
    ci++
  }

  // Vaste lasten uit fixed-regels aanmaken (gemiddeld bedrag per afschrijving).
  let fixedCreated = 0
  if (fixedAgg.size) {
    const existingFixed = await prisma.fixedCost.findMany({ where: { householdId: hid }, select: { name: true } })
    const haveFixed = new Set(existingFixed.map((f) => f.name.toLowerCase()))
    for (const fa of fixedAgg.values()) {
      if (!fa.count || haveFixed.has(fa.name.toLowerCase())) continue
      const amount = Math.round((fa.sum / fa.count) * 100) / 100
      await prisma.fixedCost.create({
        data: {
          householdId: hid,
          name: fa.name,
          amount,
          category: fa.category || suggestCostCategory(fa.name),
          isSubscription: fa.isSub,
          subscriptionInterval: fa.isSub ? '1 month' : null,
        },
      })
      fixedCreated++
    }
  }

  // Vaste inkomsten uit income-regels aanmaken (eenmalig = income_once telt niet mee).
  // Bedrag = totaal ÷ aantal maanden in de data → een eerlijk maandgemiddelde
  // (jaarsalaris wordt het echte maandsalaris, kwartaal-/eenmalige posten niet te hoog).
  const monthsInPeriod = monthsInData(txs.map((t) => t.date))

  let incomeCreated = 0
  if (incAgg.size) {
    const existingIncome = await prisma.income.findMany({ where: { householdId: hid }, select: { id: true, label: true } })
    const byLabel = new Map(existingIncome.map((i) => [i.label.toLowerCase(), i.id]))
    for (const g of incAgg.values()) {
      if (!g.count) continue
      const amount = Math.round((g.sum / monthsInPeriod) * 100) / 100
      const id = byLabel.get(g.name.toLowerCase())
      if (id) {
        // Bestaande inkomst bijwerken (soort + bedrag) — zo blijft je keuze onthouden.
        await prisma.income.update({ where: { id }, data: { amount, category: g.subtype, interval: '1 month' } })
      } else {
        await prisma.income.create({
          data: { householdId: hid, label: g.name, amount, category: g.subtype, interval: '1 month' },
        })
        byLabel.set(g.name.toLowerCase(), -1)
      }
      incomeCreated++
    }
  }

  // Hoeveel posten ná deze ronde nog in Overig vallen.
  let overigAfter = 0
  for (const t of txs) {
    const rule = matchRule(t.label, rules)
    const finalCat = rule
      ? categoryForKind(rule.kind, rule.category, categorizeTx(t.label))
      : t.category === 'Overig'
        ? categorizeTx(t.label)
        : t.category
    if (finalCat === 'Overig') overigAfter++
  }

  return Response.json({ ok: true, updated: updates.length, overigBefore, overigAfter, fixedCreated, incomeCreated })
}
