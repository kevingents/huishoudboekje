import * as XLSX from 'xlsx'
import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { parseBankStatement } from '@/lib/bankImport'
import { classifyWithRules, isSpendingCategory, matchRule, suggestCostCategory } from '@/lib/budget'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const COLORS = ['emerald', 'violet', 'amber', 'sky']

function fmtDate(v: unknown): string {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`
  }
  return String(v ?? '')
}

interface Row {
  date: string
  category: string
  label: string
  amount: number
  ym: string
}

/** Leest een logboek-tabblad (Datum/Categorie/Omschrijving/Bedrag) robuust uit. */
function parseLog(wb: XLSX.WorkBook, sheetName: string): Row[] {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false }) as unknown[][]

  let hi = -1
  let di = -1
  let ci = -1
  let oi = -1
  let ai = -1
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const r = (rows[i] ?? []).map((c) => String(c ?? '').toLowerCase())
    const ciX = r.findIndex((c) => c.includes('categorie'))
    const aiX = r.findIndex((c) => c.includes('bedrag'))
    if (ciX !== -1 && aiX !== -1) {
      hi = i
      ci = ciX
      ai = aiX
      di = r.findIndex((c) => c.includes('datum'))
      oi = r.findIndex((c) => c.includes('omschrijving'))
      break
    }
  }
  if (hi === -1) return []

  const out: Row[] = []
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const amount = Number(r[ai])
    if (!amount || isNaN(amount)) continue
    const category = String(r[ci] ?? '').trim()
    if (!category) continue
    const date = di !== -1 ? fmtDate(r[di]) : ''
    const label = (oi !== -1 ? String(r[oi] ?? '').trim() : '') || category
    const ym = /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : ''
    out.push({ date, category, label, amount, ym })
  }
  return out
}

function titleCase(s: string): string {
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Sleutel om een transactie te herkennen: richting (bij/af) + datum + bedrag +
 *  (genormaliseerde) omschrijving. De richting voorkomt dat een afschrijving en
 *  bijschrijving van hetzelfde bedrag/dag/omschrijving elkaar als dubbel zien. */
function txKey(date: string, amount: number, label: string, isIncome = false): string {
  const l = label.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80)
  return `${isIncome ? 'C' : 'D'}|${date}|${amount.toFixed(2)}|${l}`
}

/** Telling (multiset) van bestaande transacties, zodat overlappende afschriften
 *  precies ontdubbeld worden: een transactie die al N keer in het budget staat,
 *  wordt N keer overgeslagen — echte dubbele binnen één afschrift blijven staan.
 *  Bestaande inkomsten staan in categorie 'Inkomsten' (= bijschrijving). */
async function loadTxMultiset(hid: number): Promise<Map<string, number>> {
  const existing = await prisma.transaction.findMany({
    where: { householdId: hid },
    select: { date: true, amount: true, label: true, category: true },
  })
  const m = new Map<string, number>()
  for (const e of existing) {
    const k = txKey(e.date, e.amount, e.label, e.category === 'Inkomsten')
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

/** Sla transacties op in stukken (geen stille afkapping bij grote afschriften). */
async function insertTransactions(
  hid: number,
  rows: { label: string; category: string; amount: number; date: string }[],
): Promise<number> {
  let stored = 0
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000)
    await prisma.transaction.createMany({
      data: chunk.map((d) => ({ householdId: hid, label: d.label, category: d.category, amount: d.amount, date: d.date })),
    })
    stored += chunk.length
  }
  return stored
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const body = await req.json().catch(() => ({}))
  const base64 = String(body?.file ?? '').replace(/^data:[^;]+;base64,/, '')
  if (!base64) return Response.json({ error: 'Geen bestand ontvangen.' }, { status: 400 })

  const filename = String(body?.filename ?? '').toLowerCase()
  const buf = Buffer.from(base64, 'base64')
  const isXlsx = filename.endsWith('.xlsx') || (buf.length > 1 && buf[0] === 0x50 && buf[1] === 0x4b)

  // Bankafschrift (CSV / CAMT.053 (XML) / MT940) — werkt voor alle SEPA-banken.
  // Wat importeren: alleen uitgaven (standaard), alleen inkomsten, of beide.
  const importMode = ['expenses', 'income', 'both'].includes(String(body?.importMode))
    ? (String(body.importMode) as 'expenses' | 'income' | 'both')
    : 'expenses'
  const wantExpenses = importMode !== 'income'
  const wantIncome = importMode !== 'expenses'

  if (!isXlsx) {
    const text = buf.toString('utf8')
    const txs = parseBankStatement(filename, text)
    const debits = wantExpenses ? txs.filter((t) => !t.isIncome && t.amount > 0) : []
    const credits = wantIncome ? txs.filter((t) => t.isIncome && t.amount > 0) : []
    if (debits.length === 0 && credits.length === 0) {
      const what = importMode === 'income' ? 'bijschrijvingen' : importMode === 'expenses' ? 'afschrijvingen' : 'transacties'
      return Response.json(
        { error: `Geen ${what} herkend. Upload een CSV, CAMT.053 (XML) of MT940 van je bank.` },
        { status: 400 },
      )
    }
    // Ontdubbelen tegen wat al in het budget staat (overlappende afschriften).
    const seen = await loadTxMultiset(hid)
    const fresh: { label: string; category: string; amount: number; date: string }[] = []
    let skipped = 0
    for (const d of debits) {
      const label = (d.description || d.category).slice(0, 120)
      const date = d.date || 'Geïmporteerd'
      const k = txKey(date, d.amount, label)
      const cnt = seen.get(k) ?? 0
      if (cnt > 0) {
        seen.set(k, cnt - 1)
        skipped++
        continue
      }
      fresh.push({ label, category: d.category, amount: d.amount, date })
    }

    // Geleerde regels toepassen: inkomsten/negeren overslaan, vaste lasten doorzetten.
    const rules = await prisma.merchantRule.findMany({ where: { householdId: hid } })
    const toStore: { label: string; category: string; amount: number; date: string }[] = []
    const fixedAgg = new Map<
      string,
      { name: string; sum: number; count: number; category: string; isSub: boolean; months: Set<string> }
    >()
    let skippedKind = 0
    for (const d of fresh) {
      const { category, kind } = classifyWithRules(d.label, rules, d.category)
      if (kind === 'income' || kind === 'ignore') {
        skippedKind++
        continue
      }
      if (kind === 'fixed' || kind === 'subscription') {
        const rule = matchRule(d.label, rules)
        const name = titleCase(rule?.pattern || d.label).slice(0, 60)
        const fa =
          fixedAgg.get(name) ??
          { name, sum: 0, count: 0, category: rule?.category || '', isSub: kind === 'subscription', months: new Set<string>() }
        fa.sum += d.amount
        fa.count += 1
        const ym = /^(\d{4})-(\d{2})/.exec(d.date || '')
        if (ym) fa.months.add(`${ym[1]}-${ym[2]}`)
        fixedAgg.set(name, fa)
      }
      toStore.push({ label: d.label, category, amount: d.amount, date: d.date })
    }

    const existingCats = await prisma.budgetCategory.findMany({ where: { householdId: hid }, select: { name: true } })
    const haveCats = new Set(existingCats.map((c) => c.name.toLowerCase()))
    const cats = [...new Set(toStore.map((d) => d.category))].filter(isSpendingCategory)
    let ci = existingCats.length
    for (const cat of cats) {
      if (haveCats.has(cat.toLowerCase())) continue
      await prisma.budgetCategory.create({
        data: { householdId: hid, name: cat, color: COLORS[ci % COLORS.length], icon: 'ShoppingCart', limit: 0, spent: 0 },
      })
      haveCats.add(cat.toLowerCase())
      ci++
    }

    const expensesStored = await insertTransactions(hid, toStore)

    // Vaste lasten uit fixed-regels aanmaken: maandbedrag = totaal ÷ aantal MAANDEN
    // (2× per maand, zoals een gesplitste hypotheek, telt zo op tot het maandbedrag).
    let fixedCreated = 0
    if (fixedAgg.size) {
      const existingFixed = await prisma.fixedCost.findMany({ where: { householdId: hid }, select: { name: true } })
      const haveFixed = new Set(existingFixed.map((f) => f.name.toLowerCase()))
      for (const fa of fixedAgg.values()) {
        if (!fa.count || haveFixed.has(fa.name.toLowerCase())) continue
        await prisma.fixedCost.create({
          data: {
            householdId: hid,
            name: fa.name,
            amount: Math.round((fa.sum / Math.max(1, fa.months.size || fa.count)) * 100) / 100,
            category: fa.category || suggestCostCategory(fa.name),
            isSubscription: fa.isSub,
            subscriptionInterval: fa.isSub ? '1 month' : null,
          },
        })
        haveFixed.add(fa.name.toLowerCase())
        fixedCreated++
      }
    }

    // Bijschrijvingen (inkomsten): alleen als gekozen. Ontdubbeld en opgeslagen in
    // de categorie 'Inkomsten' (telt niet mee als variabele uitgave).
    let incomeStored = 0
    if (credits.length) {
      const incFresh: { label: string; category: string; amount: number; date: string }[] = []
      for (const c of credits) {
        const label = (c.description || c.category).slice(0, 120)
        const date = c.date || 'Geïmporteerd'
        const k = txKey(date, c.amount, label, true)
        const cnt = seen.get(k) ?? 0
        if (cnt > 0) {
          seen.set(k, cnt - 1)
          skipped++
          continue
        }
        incFresh.push({ label, category: 'Inkomsten', amount: c.amount, date })
      }
      if (incFresh.length) {
        const hasInkomsten = await prisma.budgetCategory.findFirst({ where: { householdId: hid, name: 'Inkomsten' } })
        if (!hasInkomsten) {
          await prisma.budgetCategory.create({
            data: { householdId: hid, name: 'Inkomsten', color: 'emerald', icon: 'TrendingUp', limit: 0, spent: 0 },
          })
        }
        incomeStored = await insertTransactions(hid, incFresh)
      }
    }

    return Response.json({
      ok: true,
      source: 'bank',
      expenses: expensesStored,
      incomes: incomeStored,
      categories: cats.length,
      skipped,
      skippedKind,
      fixedCreated,
    })
  }

  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
  } catch {
    return Response.json({ error: 'Kon het Excel-bestand niet lezen.' }, { status: 400 })
  }

  // Tabbladen lezen volgens de gekozen modus (uitgaven / inkomsten / beide).
  const expenses = wantExpenses ? parseLog(wb, 'Uitgaven Logboek').slice(0, 20000) : []
  const incomeRows = wantIncome ? parseLog(wb, 'Inkomsten Logboek').slice(0, 20000) : []
  if (expenses.length === 0 && incomeRows.length === 0) {
    const what =
      importMode === 'income'
        ? 'inkomsten gevonden. Verwacht een tabblad "Inkomsten Logboek"'
        : importMode === 'both'
          ? 'transacties gevonden. Verwacht tabbladen "Uitgaven Logboek" en/of "Inkomsten Logboek"'
          : 'uitgaven gevonden. Verwacht een tabblad "Uitgaven Logboek"'
    return Response.json({ error: `Geen herkenbare ${what}.` }, { status: 400 })
  }

  // Ontbrekende categorieën aanmaken (uitgaven + 'Inkomsten' als er bijschrijvingen zijn).
  const existing = await prisma.budgetCategory.findMany({ where: { householdId: hid }, select: { name: true } })
  const have = new Set(existing.map((c) => c.name.toLowerCase()))
  const expCats = [...new Set(expenses.map((e) => e.category))]
  let colorI = existing.length
  for (const cat of expCats) {
    if (have.has(cat.toLowerCase())) continue
    await prisma.budgetCategory.create({
      data: { householdId: hid, name: cat, color: COLORS[colorI % COLORS.length], icon: 'ShoppingCart', limit: 0, spent: 0 },
    })
    have.add(cat.toLowerCase())
    colorI++
  }
  if (incomeRows.length && !have.has('inkomsten')) {
    await prisma.budgetCategory.create({
      data: { householdId: hid, name: 'Inkomsten', color: 'emerald', icon: 'TrendingUp', limit: 0, spent: 0 },
    })
    have.add('inkomsten')
  }

  // Uitgaven + inkomsten → transacties (ontdubbeld tegen wat al in het budget staat).
  const seen = await loadTxMultiset(hid)
  let skipped = 0
  const dedup = (rows: typeof expenses, category: string | null, isIncome: boolean) => {
    const fresh: { label: string; category: string; amount: number; date: string }[] = []
    for (const e of rows) {
      const label = e.label.slice(0, 120)
      const date = e.date || 'Geïmporteerd'
      const k = txKey(date, e.amount, label, isIncome)
      const cnt = seen.get(k) ?? 0
      if (cnt > 0) {
        seen.set(k, cnt - 1)
        skipped++
        continue
      }
      fresh.push({ label, category: category ?? e.category, amount: e.amount, date })
    }
    return fresh
  }
  const freshExp = dedup(expenses, null, false)
  const freshInc = dedup(incomeRows, 'Inkomsten', true)
  const expStored = await insertTransactions(hid, freshExp)
  const incStored = await insertTransactions(hid, freshInc)

  return Response.json({
    ok: true,
    expenses: expStored,
    incomes: incStored,
    categories: expCats.length,
    skipped,
  })
}
