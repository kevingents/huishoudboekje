/* Co-ouderschap: een AANPASBAAR zorgschema. Per weekdag bepaal je bij wie de
   kinderen zijn — een vaste ouder, of "wisselt" (om-en-om per week). Zo dek je
   week-om-week, alleen-de-weekenden, en alles daartussen. Opgeslagen als
   household-setting "coParenting" (blob), conform de regel: config in de tool. */

/** Toewijzing van één dag: vaste ouder A/B, of 'wissel' (om-en-om per ISO-week). */
export type DayAssign = 'A' | 'B' | 'wissel'

export interface CoParenting {
  enabled?: boolean
  parentA?: string
  parentB?: string
  /** Wie de 'wissel'-dagen in EVEN ISO-weken heeft (de andere ouder in oneven weken). */
  evenWeekParent?: 'A' | 'B'
  /** 7-daags schema, index = JS getDay() (0=zo … 6=za). Afwezig = alle dagen 'wissel'
   *  (= klassiek om-en-om hele weken; backward compatible met oude config). */
  days?: DayAssign[]
}

/** ISO-weeknummer (1-53). Constant binnen een ma–zo-week, dus 'wissel' is hele week gelijk. */
export function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

export function readCoParenting(value: unknown): CoParenting {
  if (value && typeof value === 'object') return value as CoParenting
  return {}
}

const ALL_WISSEL: DayAssign[] = ['wissel', 'wissel', 'wissel', 'wissel', 'wissel', 'wissel', 'wissel']

/** Het 7-daags schema (index = getDay 0=zo..6=za); standaard alles 'wissel'. */
export function scheduleDays(cp: CoParenting): DayAssign[] {
  const d = cp.days
  if (Array.isArray(d) && d.length === 7) return d.map((x) => (x === 'A' || x === 'B' ? x : 'wissel'))
  return [...ALL_WISSEL]
}

function resolveAssign(a: DayAssign, isEvenWeek: boolean, evenParent: 'A' | 'B'): 'A' | 'B' {
  if (a === 'A' || a === 'B') return a
  return isEvenWeek ? evenParent : evenParent === 'A' ? 'B' : 'A'
}

/** Bij welke ouder de kinderen op de dag van `now` zijn (of null als niet ingesteld). */
export function coParentToday(cp: CoParenting, now: Date): { parent: string; which: 'A' | 'B' } | null {
  if (!cp.enabled || !cp.parentA || !cp.parentB) return null
  const days = scheduleDays(cp)
  const which = resolveAssign(days[now.getDay()], isoWeek(now) % 2 === 0, cp.evenWeekParent ?? 'A')
  return { parent: which === 'A' ? cp.parentA : cp.parentB, which }
}

export interface CoParentDay {
  label: string // Ma, Di, …
  dayNum: number // datum (1-31)
  which: 'A' | 'B'
  parent: string
  isToday: boolean
}

const WD_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'] // index = getDay()

/** De huidige week (maandag…zondag) met per dag bij wie de kinderen zijn. */
export function coParentWeek(cp: CoParenting, now: Date): CoParentDay[] {
  if (!cp.enabled || !cp.parentA || !cp.parentB) return []
  const days = scheduleDays(cp)
  const evenParent = cp.evenWeekParent ?? 'A'
  // Maandag van deze week (ma=0): getDay zo=0 → offset 6.
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const todayKey = now.toDateString()
  const out: CoParentDay[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const which = resolveAssign(days[d.getDay()], isoWeek(d) % 2 === 0, evenParent)
    out.push({
      label: WD_SHORT[d.getDay()],
      dayNum: d.getDate(),
      which,
      parent: which === 'A' ? cp.parentA! : cp.parentB!,
      isToday: d.toDateString() === todayKey,
    })
  }
  return out
}

/** Snelkeuze-schema's om het 7-daags schema mee voor te vullen. */
export function presetSchedule(kind: 'om-en-om' | 'weekend'): DayAssign[] {
  // 'weekend': doordeweeks (ma-vr) vast bij A, weekend (za+zo) om-en-om per week.
  if (kind === 'weekend') return ['wissel', 'A', 'A', 'A', 'A', 'A', 'wissel'] // index: zo,ma,di,wo,do,vr,za
  return [...ALL_WISSEL]
}
