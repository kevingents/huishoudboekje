/* Co-ouderschap: een eenvoudig om-en-om-weekschema. Opgeslagen als household-
   setting "coParenting" (blob), conform de regel: config in de tool. */

export interface CoParenting {
  enabled?: boolean
  parentA?: string
  parentB?: string
  evenWeekParent?: 'A' | 'B' // bij wie zijn de kinderen in even ISO-weken
}

/** ISO-weeknummer (1-53). */
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

/** Bij welke ouder de kinderen deze week zijn (of null als niet ingesteld). */
export function coParentNow(cp: CoParenting, now: Date): { parent: string; isEven: boolean } | null {
  if (!cp.enabled || !cp.parentA || !cp.parentB) return null
  const isEven = isoWeek(now) % 2 === 0
  const evenParent = cp.evenWeekParent ?? 'A'
  const which = isEven ? evenParent : evenParent === 'A' ? 'B' : 'A'
  return { parent: which === 'A' ? cp.parentA : cp.parentB, isEven }
}
