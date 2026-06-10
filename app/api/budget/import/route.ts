import * as XLSX from 'xlsx'
import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { parseBankStatement } from '@/lib/bankImport'
import { classifyWithRules, isSpendingCategory, matchRule, merchantKey, suggestCostCategory } from '@/lib/budget'

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

function incomeBucket(cat: string): string {
  const c = cat.toLowerCase()
  if (c.includes('kinderbijslag')) return 'kinderbijslag'
  if (c.includes('belastingdienst') || c.includes('teruggaaf') || c.includes('teruggave') || c.includes('toeslag'))
    return 'toeslag'
  if (c.includes('uitkering') || c.includes('aow') || c.includes('pensioen')) return 'uitkering'
  if (c.includes('alimentatie')) return 'alimentatie'
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

    // Geleerde regels toepassen: inkomsten/negeren overslaan, vaste lasten doorzetten.
    const rules = await prisma.merchantRule.findMany({ where: { householdId: hid } })
    const toStore: { label: string; category: string; amount: number; date: string }[] = []
    const fixedAgg = new Map<string, { name: string; sum: number; count: number; category: string }>()
    let skippedKind = 0
    for (const d of fresh) {
      const { category, kind } = classifyWithRules(d.label, rules, d.category)
      if (kind === 'income' || kind === 'ignore') {
        skippedKind++
        continue
      }
      if (kind === 'fixed') {
        const rule = matchRule(d.label, rules)
        const name = titleCase(rule?.pattern || d.label).slice(0, 60)
        const fa = fixedAgg.get(name) ?? { name, sum: 0, count: 0, category: rule?.category || '' }
        fa.sum += d.amount
        fa.count += 1
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

    const slice = toStore.slice(0, 5000)
    if (slice.length) {
      await prisma.transaction.createMany({
        data: slice.map((d) => ({ householdId: hid, label: d.label, category: d.category, amount: d.amount, date: d.date })),
      })
    }

    // Vaste lasten uit fixed-regels aanmaken (gemiddeld bedrag, geen dubbele namen).
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
            amount: Math.round((fa.sum / fa.count) * 100) / 100,
            category: fa.category || suggestCostCategory(fa.name),
          },
        })
        haveFixed.add(fa.name.toLowerCase())
        fixedCreated++
      }
    }

    // Bijschrijvingen → opslaan als (uitgesloten) 'Inkomsten'-transacties zodat ze
    // indeelbaar zijn; herkenbare vaste inkomsten ook als terugkerende Income-post.
    const credits = txs.filter((t) => t.isIncome && t.amount > 0)
    const incomeTx: { label: string; amount: number; date: string }[] = []
    const incAgg = new Map<string, { label: string; sum: number; count: number; subtype: string }>()
    for (const c of credits) {
      const label = (c.description || 'Inkomst').slice(0, 120)
      const date = c.date || 'Geïmporteerd'
      const k = txKey(date, c.amount, label)
      const cnt = seen.get(k) ?? 0
      if (cnt > 0) {
        seen.set(k, cnt - 1)
        skipped++
        continue
      }
      const rule = matchRule(label, rules)
      if (rule?.kind === 'ignore') continue // eigen overboeking/sparen → niet opslaan
      incomeTx.push({ label, amount: c.amount, date })
      const strong =
        rule?.kind === 'income' ||
        /salaris|\bloon\b|kinderbijslag|toeslag|\baow\b|pensioen|uitkering|alimentatie|belastingdienst|sociale verzekeringsbank/i.test(
          label,
        )
      if (strong) {
        const key = merchantKey(label) || label.toLowerCase().slice(0, 32)
        const subtype = rule?.kind === 'income' && rule.category ? rule.category : incomeBucket(label)
        const g = incAgg.get(key) ?? {
          label: titleCase(merchantKey(label) || 'Inkomst'),
          sum: 0,
          count: 0,
          subtype,
        }
        g.sum += c.amount
        g.count += 1
        g.subtype = subtype
        incAgg.set(key, g)
      }
    }
    if (incomeTx.length) {
      await prisma.transaction.createMany({
        data: incomeTx
          .slice(0, 5000)
          .map((d) => ({ householdId: hid, label: d.label, category: 'Inkomsten', amount: d.amount, date: d.date })),
      })
    }
    // Aantal maanden in dit afschrift → inkomsten eerlijk over de maanden verdelen,
    // zodat een jaarsalaris het echte maandsalaris wordt (niet 12× opgeteld) en
    // kwartaal-/eenmalige posten niet als vol maandbedrag tellen.
    const periodMonths = new Set<string>()
    for (const t of txs) {
      const mm = /^(\d{4})-(\d{2})/.exec(t.date || '')
      if (mm) periodMonths.add(`${mm[1]}-${mm[2]}`)
    }
    const monthsInPeriod = Math.max(1, periodMonths.size)

    let incomesCreated = 0
    if (incAgg.size) {
      const existingIncome = await prisma.income.findMany({ where: { householdId: hid }, select: { label: true } })
      const haveIncome = new Set(existingIncome.map((i) => i.label.toLowerCase()))
      for (const g of incAgg.values()) {
        if (!g.count || haveIncome.has(g.label.toLowerCase())) continue
        await prisma.income.create({
          data: {
            householdId: hid,
            label: g.label,
            amount: Math.round((g.sum / monthsInPeriod) * 100) / 100,
            category: g.subtype,
            interval: '1 month',
          },
        })
        haveIncome.add(g.label.toLowerCase())
        incomesCreated++
      }
    }

    return Response.json({
      ok: true,
      source: 'bank',
      expenses: slice.length,
      incomes: incomesCreated,
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
