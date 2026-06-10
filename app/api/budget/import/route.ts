import * as XLSX from 'xlsx'
import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { parseBankStatement } from '@/lib/bankImport'

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

function incomeBucket(cat: string): string {
  const c = cat.toLowerCase()
  if (c.includes('toeslag') || c.includes('kinderbijslag')) return 'toeslag'
  if (c.includes('uitkering') || c.includes('aow') || c.includes('pensioen')) return 'uitkering'
  if (c.includes('netto-inkomen') || c.includes('loon') || c.includes('salaris')) return 'loon'
  return 'overig'
}

/** Sleutel om een transactie te herkennen: datum + bedrag + (genormaliseerde) omschrijving. */
function txKey(date: string, amount: number, label: string): string {
  const l = label.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80)
  return `${date}|${amount.toFixed(2)}|${l}`
}

/** Telling (multiset) van bestaande transacties, zodat overlappende afschriften
 *  precies ontdubbeld worden: een transactie die al N keer in het budget staat,
 *  wordt N keer overgeslagen — echte dubbele binnen één afschrift blijven staan. */
async function loadTxMultiset(hid: number): Promise<Map<string, number>> {
  const existing = await prisma.transaction.findMany({
    where: { householdId: hid },
    select: { date: true, amount: true, label: true },
  })
  const m = new Map<string, number>()
  for (const e of existing) {
    const k = txKey(e.date, e.amount, e.label)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
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
  if (!isXlsx) {
    const text = buf.toString('utf8')
    const txs = parseBankStatement(filename, text)
    const debits = txs.filter((t) => !t.isIncome && t.amount > 0)
    if (debits.length === 0) {
      return Response.json(
        { error: 'Geen afschrijvingen herkend. Upload een CSV, CAMT.053 (XML) of MT940 van je bank.' },
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

    const existingCats = await prisma.budgetCategory.findMany({ where: { householdId: hid }, select: { name: true } })
    const haveCats = new Set(existingCats.map((c) => c.name.toLowerCase()))
    const cats = [...new Set(fresh.map((d) => d.category))]
    let ci = 0
    for (const cat of cats) {
      if (haveCats.has(cat.toLowerCase())) continue
      await prisma.budgetCategory.create({
        data: { householdId: hid, name: cat, color: COLORS[ci % COLORS.length], icon: 'ShoppingCart', limit: 0, spent: 0 },
      })
      ci++
    }

    const slice = fresh.slice(0, 5000)
    if (slice.length) {
      await prisma.transaction.createMany({
        data: slice.map((d) => ({ householdId: hid, label: d.label, category: d.category, amount: d.amount, date: d.date })),
      })
    }
    return Response.json({ ok: true, source: 'bank', expenses: slice.length, incomes: 0, categories: cats.length, skipped })
  }

  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
  } catch {
    return Response.json({ error: 'Kon het Excel-bestand niet lezen.' }, { status: 400 })
  }

  const expenses = parseLog(wb, 'Uitgaven Logboek').slice(0, 3000)
  const incomes = parseLog(wb, 'Inkomsten Logboek').slice(0, 1000)
  if (expenses.length === 0 && incomes.length === 0) {
    return Response.json(
      {
        error:
          'Geen herkenbare uitgaven of inkomsten gevonden. Verwacht tabbladen "Uitgaven Logboek" en "Inkomsten Logboek".',
      },
      { status: 400 },
    )
  }

  // Ontbrekende categorieën aanmaken.
  const existing = await prisma.budgetCategory.findMany({ where: { householdId: hid }, select: { name: true } })
  const have = new Set(existing.map((c) => c.name.toLowerCase()))
  const expCats = [...new Set(expenses.map((e) => e.category))]
  let colorI = 0
  for (const cat of expCats) {
    if (have.has(cat.toLowerCase())) continue
    await prisma.budgetCategory.create({
      data: { householdId: hid, name: cat, color: COLORS[colorI % COLORS.length], icon: 'ShoppingCart', limit: 0, spent: 0 },
    })
    colorI++
  }

  // Uitgaven → transacties (ontdubbeld tegen wat al in het budget staat).
  const seen = await loadTxMultiset(hid)
  const freshExp: { label: string; category: string; amount: number; date: string }[] = []
  let skipped = 0
  for (const e of expenses) {
    const label = e.label.slice(0, 120)
    const date = e.date || 'Geïmporteerd'
    const k = txKey(date, e.amount, label)
    const cnt = seen.get(k) ?? 0
    if (cnt > 0) {
      seen.set(k, cnt - 1)
      skipped++
      continue
    }
    freshExp.push({ label, category: e.category, amount: e.amount, date })
  }
  if (freshExp.length) {
    await prisma.transaction.createMany({
      data: freshExp.map((e) => ({ householdId: hid, label: e.label, category: e.category, amount: e.amount, date: e.date })),
    })
  }

  // Inkomsten → maandgemiddelde per categorie (bestaande labels overslaan).
  const existingIncome = await prisma.income.findMany({ where: { householdId: hid }, select: { label: true } })
  const haveIncome = new Set(existingIncome.map((i) => i.label.toLowerCase()))
  const incByCat = new Map<string, { total: number; months: Set<string> }>()
  for (const inc of incomes) {
    const g = incByCat.get(inc.category) ?? { total: 0, months: new Set<string>() }
    g.total += inc.amount
    if (inc.ym) g.months.add(inc.ym)
    incByCat.set(inc.category, g)
  }
  let incomeCreated = 0
  for (const [cat, g] of incByCat) {
    const monthly = Math.round((g.total / Math.max(1, g.months.size)) * 100) / 100
    if (monthly <= 0 || haveIncome.has(cat.toLowerCase())) continue
    await prisma.income.create({
      data: { householdId: hid, label: cat, amount: monthly, category: incomeBucket(cat), interval: '1 month' },
    })
    incomeCreated++
  }

  return Response.json({
    ok: true,
    expenses: freshExp.length,
    incomes: incomeCreated,
    categories: expCats.length,
    skipped,
  })
}
