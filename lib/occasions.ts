// Slimme gelegenheid-seintjes: Nederlandse feest-/cadeaudagen (Vaderdag,
// Moederdag, Sinterklaas, …) en verjaardagen van gezinsleden. Bewust
// dagscherp (de cron draait dagelijks), met een ruime aanlooptijd voor
// cadeaudagen zodat je nog iets kunt regelen.
//
// Reminders werken band-gebaseerd: per drempel (bijv. 10 dagen vooruit) vuurt
// er één reminder. De cron dedupt op (huishouden, key) zodat een gemiste
// cron-dag de reminder niet permanent verliest én er geen dagelijkse spam komt.

const MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const MONTHS_LONG = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

/** Dag-van-de-maand van de n-de zondag in een maand (1-indexed maand). */
function nthSunday(year: number, month: number, n: number): number {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const firstSunday = 1 + ((7 - first.getUTCDay()) % 7)
  return firstSunday + (n - 1) * 7
}

export interface Occasion {
  name: string
  year: number
  month: number // 1-12
  day: number
  gift: boolean // cadeaudag → langere aanlooptijd
}

/** Alle vaste en berekende gelegenheden voor een kalenderjaar. */
export function occasionsForYear(year: number): Occasion[] {
  return [
    { name: 'Valentijnsdag', year, month: 2, day: 14, gift: true },
    { name: 'Moederdag', year, month: 5, day: nthSunday(year, 5, 2), gift: true },
    { name: 'Vaderdag', year, month: 6, day: nthSunday(year, 6, 3), gift: true },
    { name: 'Koningsdag', year, month: 4, day: 27, gift: false },
    { name: 'Sinterklaas', year, month: 12, day: 5, gift: true },
    { name: 'Eerste Kerstdag', year, month: 12, day: 25, gift: true },
    { name: 'Oudjaarsavond', year, month: 12, day: 31, gift: false },
  ]
}

/** De namen van de standaard-gelegenheden (om aan/uit te zetten in de UI). */
export const BUILTIN_OCCASIONS: { name: string; gift: boolean }[] = [
  { name: 'Valentijnsdag', gift: true },
  { name: 'Moederdag', gift: true },
  { name: 'Vaderdag', gift: true },
  { name: 'Koningsdag', gift: false },
  { name: 'Sinterklaas', gift: true },
  { name: 'Eerste Kerstdag', gift: true },
  { name: 'Oudjaarsavond', gift: false },
]

/** Een zelf toegevoegde gelegenheid (jaarlijks terugkerend op maand/dag). */
export interface CustomOccasion {
  id: string
  title: string
  month: number // 1-12
  day: number
  gift?: boolean
}

/** Door de gebruiker beheerde gelegenheden: standaard-dagen verbergen + eigen toevoegen. */
export interface OccasionConfig {
  hidden?: string[] // namen van standaard-gelegenheden die uit staan
  custom?: CustomOccasion[]
}

/** De effectieve gelegenheden voor een jaar: standaard (minus verborgen) + eigen. */
export function resolveOccasions(year: number, config?: OccasionConfig): Occasion[] {
  const hidden = new Set((config?.hidden ?? []).map((s) => s.toLowerCase()))
  const builtins = occasionsForYear(year).filter((o) => !hidden.has(o.name.toLowerCase()))
  const custom = (config?.custom ?? [])
    .filter((c) => c.title?.trim() && c.month >= 1 && c.month <= 12 && c.day >= 1 && c.day <= 31)
    .map((c) => ({ name: c.title.trim(), year, month: c.month, day: c.day, gift: !!c.gift }))
  return [...builtins, ...custom]
}

function daysBetweenUTC(from: Date, y: number, m: number, d: number): number {
  const target = Date.UTC(y, m - 1, d)
  const today = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  return Math.round((target - today) / 86_400_000)
}

/**
 * Welke reminder-"band" hoort bij d dagen-tot? Geeft de strakste drempel die d
 * al bereikt heeft (de kleinste drempel >= d), of null als het nog te vroeg is.
 * Zo vuurt elke band één keer en vangt een gemiste cron-dag de eerstvolgende dag.
 */
export function bandFor(thresholds: number[], d: number): number | null {
  const eligible = thresholds.filter((t) => t >= d)
  return eligible.length ? Math.min(...eligible) : null
}

// Cadeaudagen seinen ruim vooruit (plannen + kopen); overige dagen kort.
const GIFT_THRESHOLDS = [10, 3, 0]
const PLAIN_THRESHOLDS = [1, 0]

export interface OccasionReminder {
  name: string
  day: number
  month: number
  year: number
  daysUntil: number
  gift: boolean
  band: number
}

/** Gelegenheden waarvan vandaag een reminder-band actief is. */
export function dueOccasionReminders(now: Date, config?: OccasionConfig): OccasionReminder[] {
  const out: OccasionReminder[] = []
  // Dit jaar én volgend jaar, zodat eind december een gelegenheid begin volgend
  // jaar ook binnen de aanlooptijd valt. Elk exemplaar draagt zijn eigen jaar.
  const candidates = [...resolveOccasions(now.getUTCFullYear(), config), ...resolveOccasions(now.getUTCFullYear() + 1, config)]
  for (const o of candidates) {
    const d = daysBetweenUTC(now, o.year, o.month, o.day)
    if (d < 0) continue // al voorbij — hoort bij het volgend-jaar-exemplaar
    const band = bandFor(o.gift ? GIFT_THRESHOLDS : PLAIN_THRESHOLDS, d)
    if (band === null) continue // nog te vroeg
    out.push({ name: o.name, day: o.day, month: o.month, year: o.year, daysUntil: d, gift: o.gift, band })
  }
  return out
}

/** Leesbare datum, bijv. "21 jun". */
export function shortDate(day: number, month: number): string {
  return `${day} ${MONTHS_SHORT[month - 1] ?? ''}`
}

/** Aankomende gelegenheden binnen `within` dagen (voor het dashboard, niet de
 *  drempel-cron) — gesorteerd op nabijheid, zonder dubbele namen. */
export function upcomingOccasions(now: Date, within = 21, config?: OccasionConfig): OccasionReminder[] {
  const candidates = [...resolveOccasions(now.getUTCFullYear(), config), ...resolveOccasions(now.getUTCFullYear() + 1, config)]
  const out: OccasionReminder[] = []
  const seen = new Set<string>()
  for (const o of candidates) {
    const d = daysBetweenUTC(now, o.year, o.month, o.day)
    if (d < 0 || d > within || seen.has(o.name)) continue
    seen.add(o.name)
    out.push({ name: o.name, day: o.day, month: o.month, year: o.year, daysUntil: d, gift: o.gift, band: 0 })
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil)
}

/** Bericht voor een gelegenheid-reminder. */
export function occasionMessage(r: OccasionReminder): { title: string; body: string } {
  const date = shortDate(r.day, r.month)
  if (r.daysUntil === 0) return { title: `Het is vandaag ${r.name}`, body: `Vandaag is het ${r.name}.` }
  const when = r.daysUntil === 1 ? 'morgen' : `over ${r.daysUntil} dagen`
  if (r.gift) {
    return {
      title: `Bijna ${r.name}`,
      body: `${when} is het ${r.name} (${date}). Denk je op tijd aan een cadeautje of kaartje?`,
    }
  }
  return { title: `Bijna ${r.name}`, body: `${when} is het ${r.name} (${date}).` }
}

/* --------------------------------- Verjaardagen --------------------------- */

/** Parse een vrij ingevulde verjaardag ("12 april", "12 apr", "12-4") → maand/dag.
 *  Robuust tegen dubbelzinnige afkortingen: eerst exacte korte code, dan exacte
 *  volledige naam, dan een prefix die maar op één maand past. */
export function parseBirthday(value: string): { month: number; day: number } | null {
  const v = value.trim().toLowerCase()
  if (!v) return null

  const monthFromToken = (token: string): number => {
    const short = MONTHS_SHORT.indexOf(token) // exacte 3-letter code (jun/jul los van elkaar)
    if (short >= 0) return short + 1
    const exact = MONTHS_LONG.indexOf(token) // exacte volledige naam
    if (exact >= 0) return exact + 1
    if (token.length >= 3) {
      const matches = MONTHS_LONG.map((m, i) => (m.startsWith(token) ? i : -1)).filter((i) => i >= 0)
      if (matches.length === 1) return matches[0] + 1 // alleen een ÉÉNduidige prefix
    }
    return 0
  }

  // "12 april" / "12 apr"
  const named = v.match(/(\d{1,2})\s+([a-z]+)/)
  if (named) {
    const day = Number(named[1])
    const month = monthFromToken(named[2])
    if (month >= 1 && day >= 1 && day <= 31) return { month, day }
    return null
  }
  // "12-4" / "12/04" / "12.4"
  const numeric = v.match(/(\d{1,2})[\-/.](\d{1,2})/)
  if (numeric) {
    const day = Number(numeric[1])
    const month = Number(numeric[2])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day }
  }
  return null
}

const BIRTHDAY_THRESHOLDS = [7, 1, 0]

export interface BirthdayReminder {
  name: string
  day: number
  month: number
  year: number
  daysUntil: number
  band: number
}

/** Verjaardag-reminder waarvan vandaag een band actief is, of null. */
export function dueBirthdayReminder(now: Date, memberName: string, birthday: string): BirthdayReminder | null {
  const parsed = parseBirthday(birthday)
  if (!parsed) return null
  let year = now.getUTCFullYear()
  let d = daysBetweenUTC(now, year, parsed.month, parsed.day)
  if (d < 0) {
    year += 1
    d = daysBetweenUTC(now, year, parsed.month, parsed.day)
  }
  const band = bandFor(BIRTHDAY_THRESHOLDS, d)
  if (band === null) return null
  return { name: memberName, day: parsed.day, month: parsed.month, year, daysUntil: d, band }
}

/** Bericht voor een verjaardag-reminder. */
export function birthdayMessage(r: BirthdayReminder): { title: string; body: string } {
  const date = shortDate(r.day, r.month)
  if (r.daysUntil === 0) return { title: `${r.name} is jarig!`, body: `${r.name} is vandaag jarig.` }
  const when = r.daysUntil === 1 ? 'morgen' : `over ${r.daysUntil} dagen`
  return { title: `${r.name} is bijna jarig`, body: `${r.name} is ${when} jarig (${date}).` }
}
