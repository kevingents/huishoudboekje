import * as XLSX from 'xlsx'
import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

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

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid

  const body = await req.json().catch(() => ({}))
  const base64 = String(body?.file ?? '').replace(/^data:[^;]+;base64,/, '')
  if (!base64) return Response.json({ error: 'Geen bestand ontvangen.' }, { status: 400 })

  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(Buffer.from(base64, 'base64'), { type: 'buffer', cellDates: true })
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

  // Uitgaven → transacties.
  if (expenses.length) {
    await prisma.transaction.createMany({
      data: expenses.map((e) => ({
        householdId: hid,
        label: e.label.slice(0, 120),
        category: e.category,
        amount: e.amount,
        date: e.date || 'Geïmporteerd',
      })),
    })
  }

  // Inkomsten → maandgemiddelde per categorie als terugkerend inkomen.
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
    if (monthly <= 0) continue
    await prisma.income.create({
      data: { householdId: hid, label: cat, amount: monthly, category: incomeBucket(cat), interval: '1 month' },
    })
    incomeCreated++
  }

  return Response.json({
    ok: true,
    expenses: expenses.length,
    incomes: incomeCreated,
    categories: expCats.length,
  })
}
