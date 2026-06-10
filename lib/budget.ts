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

/** Gereserveerde categorieën die NIET als uitgave meetellen (telt als €0):
 *  inkomsten en bewust genegeerde posten (sparen/overboeking eigen rekening). */
export const EXCLUDED_CATEGORIES = ['Inkomsten', 'Negeren'] as const

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
