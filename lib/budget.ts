/** Categorieën voor vaste lasten (selecteerbaar in de UI). */
export const FIXED_COST_CATEGORIES = [
  'Wonen',
  'Energie',
  'Water',
  'Verzekering',
  'Telecom',
  'Vervoer',
  'Zorg',
  'Belasting',
  'Abonnement',
  'Aflossingen',
  'Overig',
] as const

// Trefwoorden → categorie. Volgorde telt: specifiekere regels eerst.
const COST_CATEGORY_RULES: [RegExp, string][] = [
  [/zorgverzeker|aansprakelijk|inboedel|opstal|uitvaart|reisverzeker|verzeker/i, 'Verzekering'],
  [/huur|hypotheek|woning|vve|servicekosten|kosten koper/i, 'Wonen'],
  [/energie|gas|stroom|elektr|eneco|vattenfall|essent|greenchoice|warmte|budget energie/i, 'Energie'],
  [/water|vitens|pwn|evides|dunea|waternet|brabant water/i, 'Water'],
  [/internet|telefoon|mobiel|kpn|ziggo|vodafone|odido|t-?mobile|tele2|simyo|telecom|glasvezel/i, 'Telecom'],
  [/auto|benzine|diesel|tank|ov-?|trein|ns abonnement|lease|parkeer|wegenbelasting|motorrijtuig|fiets/i, 'Vervoer'],
  [/tandarts|fysio|apotheek|huisarts|zorgkosten/i, 'Zorg'],
  [/belasting|gemeente|waterschap|afval|riool|ozb|hondenbelasting/i, 'Belasting'],
  [/netflix|spotify|disney|videoland|hbo|prime|abonnement|sport|gym|fitness|krant|tijdschrift/i, 'Abonnement'],
]

/** Stelt een categorie voor op basis van de naam van een vaste last. */
export function suggestCostCategory(name: string): string {
  const n = name.trim()
  if (!n) return 'Overig'
  for (const [re, cat] of COST_CATEGORY_RULES) {
    if (re.test(n)) return cat
  }
  return 'Overig'
}

/* -------------------------------------------------------------------------- */
/*  Categorisatie met geheugen (geleerde regels) + uitgesloten categorieën     */
/* -------------------------------------------------------------------------- */

/** Categorie waaronder vaste lasten in de uitgaven-grafiek vallen. */
export const FIXED_CATEGORY = 'Vaste lasten'

/** Gereserveerde categorieën die NIET als variabele uitgave meetellen (telt als €0):
 *  inkomsten, bewust genegeerde posten (sparen/overboeking eigen rekening), vaste
 *  lasten én aflossingen — die worden apart bijgehouden (FixedCost/Loan), dus
 *  meetellen als variabele uitgave zou ze dubbel tellen. Consistent met het
 *  dagbudget, dat dezelfde vier uitsluit. */
export const EXCLUDED_CATEGORIES = ['Inkomsten', 'Negeren', 'Vaste lasten', 'Aflossingen'] as const

/** Telt deze categorie mee als uitgave? (Inkomsten/Negeren = nee.) */
export function isSpendingCategory(name: string): boolean {
  return !EXCLUDED_CATEGORIES.includes((name || '') as (typeof EXCLUDED_CATEGORIES)[number])
}

// expense=uitgave in category · income=vaste inkomst · income_once=eenmalige
// inkomst (terugbetaling/teruggave) · fixed=vaste last · subscription=vaste last die
// ook een abonnement is · ignore=eigen overboeking/sparen.
export type RuleKind = 'expense' | 'income' | 'income_once' | 'fixed' | 'subscription' | 'ignore'

export const RULE_KINDS: RuleKind[] = ['expense', 'income', 'income_once', 'fixed', 'subscription', 'ignore']

/** Inkomensoorten waaruit je kunt kiezen bij het indelen. */
export const INCOME_TYPES = ['loon', 'kinderbijslag', 'toeslag', 'uitkering', 'alimentatie', 'overig'] as const

export interface MerchantRuleLike {
  pattern: string
  category: string
  kind: string
}

/** De uiteindelijke (transactie-)categorie horend bij een soort. */
export function categoryForKind(kind: string, category: string, fallback = 'Overig'): string {
  if (kind === 'income' || kind === 'income_once') return 'Inkomsten'
  if (kind === 'ignore') return 'Negeren'
  if (kind === 'fixed' || kind === 'subscription') return FIXED_CATEGORY
  return category || fallback
}

// Ruiswoorden die op bankafschriften staan maar niets over de winkel zeggen.
const MERCHANT_NOISE = new Set([
  'bea', 'gea', 'betaalpas', 'geldautomaat', 'sepa', 'ideal', 'incasso', 'incassant', 'machtiging',
  'overboeking', 'overschrijving', 'spoed', 'verzamelbetaling', 'kenmerk', 'omschrijving', 'omschr', 'naam',
  'name', 'iban', 'bic', 'trtp', 'rtyp', 'ecom', 'wero', 'eref', 'mref', 'csid', 'pas', 'pasvolgnr', 'volgnr',
  'reservering', 'factuur', 'factuurnummer', 'klantnr', 'contactloos', 'transactie', 'betaling', 'valuta',
  'datum', 'kaart', 'kaartnummer', 'term', 'apple', 'pay', 'bck', 'ccv', 'terugkerend', 'algemeen',
  'doorlopend', 'land', 'usa', 'loc', 'omzet', 'via', 'nr',
])

/**
 * Destilleert een stabiele "winkel-sleutel" uit een omschrijving. Pakt bij voorkeur
 * de tegenpartij-NAAM/NAME (overboeking/incasso/iDEAL); anders strip datums, tijden,
 * IBAN's, bedragen, betaalverwerker-prefixes (BCK, CCV) en ruiswoorden en houd de
 * eerste ~3 betekenisvolle woorden over. "BEA, APPLE PAY ALBERT HEIJN 1353 HAARLEM"
 * en "ALBERT HEIJN VOS" geven allebei "albert heijn".
 */
export function merchantKey(label: string): string {
  const original = label || ''
  let s =
    /\/NAME\/([^\/]{2,40})/i.exec(original)?.[1] ??
    /NAAM:\s*(.+?)(?:\s+(?:MACHTIGING|OMSCHRIJVING|OMSCHR|IBAN|KENMERK|BIC|RCUR)\b|$)/i.exec(original)?.[1] ??
    original
  s = s.toLowerCase()
  s = s.replace(/\bnr:?\s*[a-z0-9]+/g, ' ') // betaalautomaat-referentie (NR:CT966236)
  s = s.replace(/\b[a-z&]{2,5}\*/g, ' ') // betaalverwerker-prefix (bck* ccv* c&m*)
  s = s.replace(/nl\d{2}[a-z]{4}\d{6,}/g, ' ') // IBAN
  s = s.replace(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/g, ' ') // datums
  s = s.replace(/\d{1,2}:\d{2}/g, ' ') // tijden
  s = s.replace(/[^a-z0-9&\s]/g, ' ') // leestekens
  s = s.replace(/\d[\d.,]*/g, ' ') // getallen/bedragen
  const words = s
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !MERCHANT_NOISE.has(w))
    .filter((w, i, arr) => w !== arr[i - 1]) // dubbele woorden achter elkaar weg
  return words.slice(0, 3).join(' ').slice(0, 32)
}

// Merknamen die we netjes willen tonen (key = merchantKey-uitvoer).
const BRAND_CASES: Record<string, string> = {
  'bol com': 'Bol.com',
  'albert heijn': 'Albert Heijn',
  'h&m': 'H&M',
  mcdonald: "McDonald's",
  mcdonalds: "McDonald's",
  'apple com bill': 'Apple',
  ics: 'Creditcard (ICS)',
}

/** Schoon, leesbaar merk/winkel-label voor in de UI. "BEA, APPLE PAY HEMA EV0323
 *  HAARLEM" -> "Hema"; "/TRTP/IDEAL/.../NAME/BOL.COM/REMI/.." -> "Bol.com". De ruwe
 *  omschrijving kan als title-attribuut behouden blijven. */
export function cleanLabel(label: string): string {
  const key = merchantKey(label)
  if (!key) return (label || '').trim().slice(0, 30) || 'Onbekend'
  if (BRAND_CASES[key]) return BRAND_CASES[key]
  return key
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/** Periode-sleutel (yyyy-mm van de START-maand) voor een datum, gegeven de dag
 *  waarop de budgetperiode begint (1 = gewone kalendermaand). Een datum vóór de
 *  startdag hoort bij de periode die de vorige maand begon — zo lopen periodes door
 *  over maandgrenzen heen (bijv. 25 jan–24 feb hoort allemaal bij periode jan). */
export function periodKeyOf(dateStr: string | null | undefined, startDay = 1): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '')
  if (!m) {
    const ym = /^(\d{4})-(\d{2})/.exec(dateStr || '')
    return ym ? `${ym[1]}-${ym[2]}` : null
  }
  let y = Number(m[1])
  let mo = Number(m[2])
  const d = Number(m[3])
  if (startDay > 1 && d < startDay) {
    mo -= 1
    if (mo < 1) {
      mo = 12
      y -= 1
    }
  }
  return `${y}-${String(mo).padStart(2, '0')}`
}

/** Periode-sleutel van een transactie: gebruik de (ISO-)datum. Alleen voor échte
 *  "nu"-posten (handmatig toegevoegd met "Vandaag" of leeg) vallen we terug op
 *  createdAt. Een geïmporteerde post zónder echte datum ("Geïmporteerd") krijgen
 *  we NIET op import-tijd ingedeeld — die import-tijd zegt niets over wanneer de
 *  uitgave was — dus die valt buiten de periode-indeling (null). */
export function txPeriodKey(
  t: { date?: string | null; createdAt?: string | Date | null },
  startDay = 1,
): string | null {
  const direct = periodKeyOf(t.date, startDay)
  if (direct) return direct
  const label = (t.date ?? '').trim().toLowerCase()
  if (label !== '' && label !== 'vandaag') return null
  if (!t.createdAt) return null
  const iso = typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString()
  return periodKeyOf(iso, startDay)
}

/** Begin- en einddatum (lokale Date, middernacht) van de budgetperiode die `date`
 *  bevat, gegeven de startdag (1 = kalendermaand). Periodes lopen door over
 *  maandgrenzen: bij startdag 25 loopt de periode van de 25e t/m de 24e. */
export function periodRangeOf(date: Date, startDay = 1): { start: Date; end: Date } {
  const sd = Math.min(28, Math.max(1, Math.floor(startDay) || 1)) // veilige startdag (1–28)
  let m = date.getMonth()
  if (sd > 1 && date.getDate() < sd) m -= 1 // hoort nog bij de vorige periode
  const start = new Date(date.getFullYear(), m, sd)
  const end = new Date(date.getFullYear(), m + 1, sd - 1) // dag vóór de volgende start
  return { start, end }
}

/** Verschuift een periode-sleutel (yyyy-mm van de startmaand) met N maanden —
 *  jaarwissel- en tijdzone-veilig (rekent op de maand-sleutel, niet op timestamps). */
export function shiftPeriodKey(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Aantal maanden dat een reeks datums (yyyy-mm-dd) beslaat — de spanwijdte van
 *  eerste t/m laatste maand (jan–dec = 12), ook als tussenliggende maanden leeg
 *  zijn. Gebruikt om inkomsten naar een eerlijk maandbedrag te delen. */
export function monthsInData(dates: (string | undefined | null)[]): number {
  const idx: number[] = []
  for (const d of dates) {
    const m = /^(\d{4})-(\d{2})/.exec(d || '')
    if (m) idx.push(Number(m[1]) * 12 + (Number(m[2]) - 1))
  }
  if (!idx.length) return 1
  return Math.max(1, Math.max(...idx) - Math.min(...idx) + 1)
}

/** Past een trefwoord op een omschrijving (op de winkel-sleutel én de ruwe tekst)?
 *  Gebruikt o.a. om aflossings-transacties aan een lening te koppelen. */
export function labelMatchesPattern(label: string, pattern: string): boolean {
  const p = (pattern || '').toLowerCase().trim()
  if (p.length < 3) return false // te korte/generieke patronen matchen op van alles
  return merchantKey(label).includes(p) || (label || '').toLowerCase().includes(p)
}

/** Vindt de eerste (specifiekste) geleerde regel die op deze omschrijving past. */
export function matchRule<T extends MerchantRuleLike>(description: string, rules: T[]): T | null {
  const key = merchantKey(description)
  const raw = (description || '').toLowerCase()
  const sorted = [...rules].sort((a, b) => b.pattern.length - a.pattern.length)
  for (const r of sorted) {
    const p = (r.pattern || '').toLowerCase().trim()
    if (p.length >= 3 && (key.includes(p) || raw.includes(p))) return r
  }
  return null
}

/**
 * Bepaalt categorie + soort voor een omschrijving: eerst de geleerde regels
 * (langste/specifiekste trefwoord wint), anders de meegegeven standaardcategorie
 * als gewone uitgave.
 */
export function classifyWithRules(
  description: string,
  rules: MerchantRuleLike[],
  fallbackCategory: string,
): { category: string; kind: RuleKind } {
  const r = matchRule(description, rules)
  if (r) {
    const kind = (RULE_KINDS.includes(r.kind as RuleKind) ? r.kind : 'expense') as RuleKind
    return { category: categoryForKind(kind, r.category, fallbackCategory), kind }
  }
  return { category: fallbackCategory || 'Overig', kind: 'expense' }
}

/** Zet een bedrag met willekeurig interval om naar een maandbedrag.
 *  Eenmalige posten tellen niet mee in een maand-/toekomstprognose. */
export function monthlyEquivalent(amount: number, interval: string): number {
  if (/eenmalig|once|one-?time/i.test(interval)) return 0
  const m = /(\d+)\s*(day|week|month|year)/i.exec(interval)
  if (!m) return amount
  const n = Number(m[1]) || 1
  const unit = m[2].toLowerCase()
  if (unit === 'month') return amount / n
  if (unit === 'week') return (amount * 4.345) / n
  if (unit === 'year') return amount / (12 * n)
  if (unit === 'day') return (amount * 30) / n
  return amount
}

/** Maandbedrag van een vaste last: jaarlijkse abonnementen worden naar maand
 *  omgerekend (/12); de rest is gewoon het maandbedrag. */
export function fixedCostMonthly(cost: {
  amount: number
  isSubscription?: boolean
  subscriptionInterval?: string | null
}): number {
  if (cost.isSubscription && cost.subscriptionInterval) return monthlyEquivalent(cost.amount, cost.subscriptionInterval)
  return cost.amount
}

/** "Wat overblijft" om vrij te besteden per maand: inkomen − vaste lasten −
 *  abonnementen − aflossingen. Gedeeld zodat het dagbudget en de periode-terugblik
 *  exact hetzelfde bedrag gebruiken. Nooit negatief. */
export function spendablePerMonth(opts: {
  incomes: { amount: number; interval: string }[]
  costs: { amount: number; isSubscription?: boolean; subscriptionInterval?: string | null }[]
  subscriptions: { amount: number; interval: string; status?: string }[]
  loans: { termAmount?: number | null }[]
}): number {
  const income = opts.incomes.reduce((s, i) => s + monthlyEquivalent(i.amount, i.interval), 0)
  const fixed = opts.costs.reduce((s, c) => s + fixedCostMonthly(c), 0)
  const subs = opts.subscriptions
    .filter((s) => (s.status ?? 'active') === 'active')
    .reduce((s, x) => s + monthlyEquivalent(x.amount, x.interval), 0)
  const loansMonthly = opts.loans.reduce((s, l) => s + (l.termAmount || 0), 0)
  return Math.max(0, income - fixed - subs - loansMonthly)
}

/**
 * Maandelijkse reservering voor één spaardoel: het resterende bedrag verdeeld
 * over het aantal hele maanden tot de streefdatum. Zonder streefdatum (of al
 * gehaald) is er geen verplichte maandinleg → 0. Een datum in (bijna) dit
 * maand telt als 1 maand, zodat het hele restbedrag gereserveerd wordt.
 */
export function goalReservePerMonth(
  goal: { target: number; saved: number; targetDate?: string | null },
  now: Date,
): number {
  const remaining = Math.max(0, (goal.target || 0) - (goal.saved || 0))
  if (remaining <= 0 || !goal.targetDate) return 0
  // YYYY-MM-DD lokaal lezen (niet als UTC), zodat de maand-telling tijdzone-onafhankelijk is.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(goal.targetDate)
  if (!m) return 0
  const ty = Number(m[1])
  const tm = Number(m[2]) - 1
  const td = Number(m[3])
  let months = (ty - now.getFullYear()) * 12 + (tm - now.getMonth())
  if (td < now.getDate()) months -= 1
  months = Math.max(1, months)
  return Math.ceil(remaining / months)
}

/** Totale maandelijkse reservering voor alle spaardoelen samen. */
export function savingsReservePerMonth(
  goals: { target: number; saved: number; targetDate?: string | null }[],
  now: Date,
): number {
  return goals.reduce((s, g) => s + goalReservePerMonth(g, now), 0)
}

/**
 * Verdeel een potje (euro's) over categorieën — naar verhouding van het gemiddelde
 * dat per categorie wordt uitgegeven, of gelijk over alle categorieën. Geeft hele
 * euro's die precies optellen tot Math.round(pot).
 */
export function allocateBudget(
  pot: number,
  cats: { id: number; name: string }[],
  averages: Map<string, number>,
  basis: 'verhouding' | 'gelijk' = 'verhouding',
): Map<number, number> {
  const result = new Map<number, number>()
  const total = Math.max(0, Math.round(pot))
  if (cats.length === 0 || total <= 0) {
    cats.forEach((c) => result.set(c.id, 0))
    return result
  }
  const avgs = cats.map((c) => Math.max(0, averages.get(c.name) ?? 0))
  const totalAvg = avgs.reduce((a, b) => a + b, 0)
  const weights =
    basis === 'verhouding' && totalAvg > 0 ? avgs.map((a) => a / totalAvg) : cats.map(() => 1 / cats.length)
  const raw = weights.map((w) => w * total)
  const floored = raw.map((v) => Math.floor(v))
  let remainder = total - floored.reduce((a, b) => a + b, 0)
  const byFrac = raw.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f)
  for (let k = 0; k < byFrac.length && remainder > 0; k++) {
    floored[byFrac[k].i] += 1
    remainder -= 1
  }
  cats.forEach((c, i) => result.set(c.id, floored[i]))
  return result
}
