/**
 * Persoonlijk uitgave-inzicht: per gezinslid optellen WÁT er gekocht wordt en HOE
 * VAAK. We groeperen de boekingen (entries) van de potjes die aan dat lid hangen
 * op een genormaliseerde omschrijving, zodat "Gezichtscreme", "gezichtscreme" en
 * "Gezichts creme" samen één regel worden: bijv. "Gezichtscreme · 3× deze periode".
 *
 * Bron is bewust de potje-boeking (heeft een omschrijving + datum + is aan een lid
 * gekoppeld), niet de losse banktransactie (die heeft geen persoon).
 */
import { periodRangeOf, periodEndExclusive } from './budget'
import type { BudgetEntry, FamilyBudget } from './types'

export interface InsightItem {
  /** Best leesbare vorm van de omschrijving (meest voorkomende schrijfwijze). */
  label: string
  count: number // totaal aantal boekingen (over de meegegeven entries)
  total: number // som € over alle boekingen
  periodCount: number // aantal boekingen in de lopende periode
  periodTotal: number // som € in de lopende periode
  perMonth: number // gemiddeld aantal keer per maand over de gedekte maanden
  lastAt: string // ISO van de meest recente boeking
}

export interface MemberInsight {
  member: string
  potNames: string[]
  count: number // totaal boekingen
  total: number // som € over alle boekingen
  periodCount: number
  periodTotal: number
  /** Items gesorteerd: meeste boekingen deze periode eerst, dan vaakst totaal. */
  items: InsightItem[]
}

/** Normaliseert een omschrijving tot een groepeersleutel (kleine letters, zonder
 *  accenten, leestekens en losse bedragen/getallen). */
export function normalizeItemKey(label: string): string {
  return (label || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // accenten (combining marks)
    .replace(/[^a-z0-9\s]/g, ' ') // leestekens → spatie
    .replace(/\b\d+(?:[.,]\d+)?\b/g, ' ') // losse getallen/bedragen
    .replace(/\s+/g, ' ')
    .trim()
}

function monthIndexLocal(iso: string): number | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.getFullYear() * 12 + d.getMonth()
}

/** Aantal maanden dat een reeks boekingen beslaat (eerste t/m laatste, inclusief). */
function monthsSpanned(entries: BudgetEntry[]): number {
  const idx: number[] = []
  for (const e of entries) {
    const m = monthIndexLocal(e.at)
    if (m != null) idx.push(m)
  }
  if (idx.length === 0) return 1
  return Math.max(1, Math.max(...idx) - Math.min(...idx) + 1)
}

function buildItems(entries: BudgetEntry[], periodStart: number, periodEndExclusiveMs: number): InsightItem[] {
  // Groepeer op genormaliseerde sleutel; onthoud per groep de schrijfwijzen.
  const groups = new Map<string, { entries: BudgetEntry[]; forms: Map<string, number> }>()
  for (const e of entries) {
    const key = normalizeItemKey(e.label) || (e.label || '').trim().toLowerCase() || 'overig'
    let g = groups.get(key)
    if (!g) {
      g = { entries: [], forms: new Map() }
      groups.set(key, g)
    }
    g.entries.push(e)
    const form = (e.label || '').trim() || 'Uitgave'
    g.forms.set(form, (g.forms.get(form) ?? 0) + 1)
  }

  const items: InsightItem[] = []
  for (const g of groups.values()) {
    // Toonbare vorm = meest voorkomende schrijfwijze (bij gelijkspel: langste).
    let label = 'Uitgave'
    let best = -1
    for (const [form, n] of g.forms) {
      if (n > best || (n === best && form.length > label.length)) {
        best = n
        label = form
      }
    }
    let total = 0
    let periodCount = 0
    let periodTotal = 0
    let lastMs = -1
    let lastAt = g.entries[0]?.at ?? ''
    for (const e of g.entries) {
      const amt = e.amount || 0
      total += amt
      const t = new Date(e.at).getTime()
      if (!Number.isNaN(t)) {
        if (t >= periodStart && t < periodEndExclusiveMs) {
          periodCount += 1
          periodTotal += amt
        }
        if (t > lastMs) {
          lastMs = t
          lastAt = e.at
        }
      }
    }
    const span = monthsSpanned(g.entries)
    items.push({
      label,
      count: g.entries.length,
      total,
      periodCount,
      periodTotal,
      perMonth: g.entries.length / span,
      lastAt,
    })
  }

  items.sort((a, b) => b.periodCount - a.periodCount || b.count - a.count || b.total - a.total)
  return items
}

/** Per-gezinslid inzicht, afgeleid uit de potjes die aan een lid gekoppeld zijn. */
export function memberInsights(budgets: FamilyBudget[], now: Date, startDay = 1): MemberInsight[] {
  const { start } = periodRangeOf(now, startDay)
  const periodStart = start.getTime()
  const periodEnd = periodEndExclusive(now, startDay) // DST-veilige bovengrens (exclusief)

  const byMember = new Map<string, FamilyBudget[]>()
  for (const b of budgets) {
    const m = (b.member || '').trim()
    if (!m) continue
    const arr = byMember.get(m) ?? []
    arr.push(b)
    byMember.set(m, arr)
  }

  const result: MemberInsight[] = []
  for (const [member, pots] of byMember) {
    const entries = pots.flatMap((p) => p.entries ?? [])
    if (entries.length === 0) continue
    const items = buildItems(entries, periodStart, periodEnd)
    const total = items.reduce((s, i) => s + i.total, 0)
    const periodTotal = items.reduce((s, i) => s + i.periodTotal, 0)
    const periodCount = items.reduce((s, i) => s + i.periodCount, 0)
    result.push({
      member,
      potNames: pots.map((p) => p.name),
      count: entries.length,
      total,
      periodCount,
      periodTotal,
      items,
    })
  }

  result.sort((a, b) => b.total - a.total)
  return result
}

/** Heeft dit gezin minstens één aan-een-lid-gekoppeld potje? (Voor het tonen van de kaart.) */
export function hasMemberPotjes(budgets: FamilyBudget[]): boolean {
  return budgets.some((b) => (b.member || '').trim() !== '')
}
