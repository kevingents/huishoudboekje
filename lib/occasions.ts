// Slimme gelegenheid-seintjes: Nederlandse feest-/cadeaudagen (Vaderdag,
// Moederdag, Sinterklaas, …) en verjaardagen van gezinsleden. Bewust
// dagscherp (de cron draait dagelijks), met een ruime aanlooptijd voor
// cadeaudagen zodat je nog iets kunt regelen.

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
  month: number // 1-12
  day: number
  gift: boolean // cadeaudag → langere aanlooptijd
}

/** Alle vaste en berekende gelegenheden voor een kalenderjaar. */
export function occasionsForYear(year: number): Occasion[] {
  return [
    { name: 'Valentijnsdag', month: 2, day: 14, gift: true },
    { name: 'Moederdag', month: 5, day: nthSunday(year, 5, 2), gift: true },
    { name: 'Vaderdag', month: 6, day: nthSunday(year, 6, 3), gift: true },
    { name: 'Koningsdag', month: 4, day: 27, gift: false },
    { name: 'Sinterklaas', month: 12, day: 5, gift: true },
    { name: 'Eerste Kerstdag', month: 12, day: 25, gift: true },
    { name: 'Oudjaarsavond', month: 12, day: 31, gift: false },
  ]
}

function daysBetweenUTC(from: Date, y: number, m: number, d: number): number {
  const target = Date.UTC(y, m - 1, d)
  const today = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  return Math.round((target - today) / 86_400_000)
}

export interface OccasionReminder {
  name: string
  day: number
  month: number
  daysUntil: number
  gift: boolean
}

// Cadeaudagen seinen ruim vooruit (plannen + kopen); overige dagen kort.
const GIFT_THRESHOLDS = [10, 3, 0]
const PLAIN_THRESHOLDS = [1, 0]

/** Gelegenheden waarvan de reminder vandaag (op een drempeldag) moet afgaan. */
export function dueOccasionReminders(now: Date): OccasionReminder[] {
  const out: OccasionReminder[] = []
  // Kijk naar dit jaar én volgend jaar, zodat eind december een gelegenheid in
  // januari ook al binnen de aanlooptijd valt.
  const candidates = [...occasionsForYear(now.getUTCFullYear()), ...occasionsForYear(now.getUTCFullYear() + 1)]
  for (const o of candidates) {
    let d = daysBetweenUTC(now, now.getUTCFullYear(), o.month, o.day)
    if (d < 0) continue // hoort bij het volgend-jaar-exemplaar
    const thresholds = o.gift ? GIFT_THRESHOLDS : PLAIN_THRESHOLDS
    if (!thresholds.includes(d)) continue
    out.push({ name: o.name, day: o.day, month: o.month, daysUntil: d, gift: o.gift })
  }
  return out
}

/** Leesbare datum, bijv. "21 jun". */
export function shortDate(day: number, month: number): string {
  return `${day} ${MONTHS_SHORT[month - 1] ?? ''}`
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

/** Parse een vrij ingevulde verjaardag ("12 april", "12 apr", "12-4") → maand/dag. */
export function parseBirthday(value: string): { month: number; day: number } | null {
  const v = value.trim().toLowerCase()
  if (!v) return null
  // "12 april" / "12 apr"
  const named = v.match(/(\d{1,2})\s+([a-z]+)/)
  if (named) {
    const day = Number(named[1])
    const mi = MONTHS_LONG.findIndex((m) => m.startsWith(named[2])) // april, apr → 3
    const mi2 = mi >= 0 ? mi : MONTHS_SHORT.findIndex((m) => m === named[2].slice(0, 3))
    if (mi2 >= 0 && day >= 1 && day <= 31) return { month: mi2 + 1, day }
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
  daysUntil: number
}

/** Verjaardag-reminder die vandaag (op een drempeldag) moet afgaan, of null. */
export function dueBirthdayReminder(now: Date, memberName: string, birthday: string): BirthdayReminder | null {
  const parsed = parseBirthday(birthday)
  if (!parsed) return null
  let d = daysBetweenUTC(now, now.getUTCFullYear(), parsed.month, parsed.day)
  if (d < 0) d = daysBetweenUTC(now, now.getUTCFullYear() + 1, parsed.month, parsed.day)
  if (!BIRTHDAY_THRESHOLDS.includes(d)) return null
  return { name: memberName, day: parsed.day, month: parsed.month, daysUntil: d }
}

/** Bericht voor een verjaardag-reminder. */
export function birthdayMessage(r: BirthdayReminder): { title: string; body: string } {
  const date = shortDate(r.day, r.month)
  if (r.daysUntil === 0) return { title: `${r.name} is jarig!`, body: `${r.name} is vandaag jarig.` }
  const when = r.daysUntil === 1 ? 'morgen' : `over ${r.daysUntil} dagen`
  return { title: `${r.name} is bijna jarig`, body: `${r.name} is ${when} jarig (${date}).` }
}
