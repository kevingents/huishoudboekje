/**
 * Prognose per gezinspotje: op basis van de geboekte uitgaven (entries) deze
 * periode kijken we hoe hard een potje "leegloopt" en projecteren we het eind van
 * de periode. Zo zie je op tijd of een potje dreigt te overschrijden — en of je
 * kunt schuiven met een potje dat juist ruimte overhoudt.
 *
 * We rekenen bewust met de entries-van-deze-periode (niet het cumulatieve
 * `spent`-veld, dat over maanden doorloopt), zodat de prognose echt over de
 * lopende periode gaat.
 */
import { periodRangeOf } from './budget'
import type { FamilyBudget } from './types'

export type PotjeStatus = 'op-koers' | 'krap' | 'over'

export interface PotjeForecast {
  id: number
  name: string
  member?: string | null
  color: string
  limit: number
  /** Uitgegeven in de lopende periode (som van entries in deze periode). */
  periodSpent: number
  /** Aantal boekingen deze periode. */
  count: number
  /** Verwachte eind-van-periode-uitgave bij dit tempo. */
  projected: number
  /** limit − projected; negatief = verwacht tekort. */
  surplus: number
  status: PotjeStatus
  /** Genoeg data om iets zinnigs te zeggen (een paar dagen ver + ≥1 boeking). */
  hasData: boolean
}

const DAY = 86_400_000

/** Voortgang binnen de huidige periode: hoeveelste dag (1-based) en de lengte. */
export function periodProgress(now: Date, startDay = 1): { elapsed: number; total: number; fraction: number } {
  const { start, end } = periodRangeOf(now, startDay)
  const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY) + 1)
  const elapsedRaw = Math.floor((now.getTime() - start.getTime()) / DAY) + 1
  const elapsed = Math.min(total, Math.max(1, elapsedRaw))
  return { elapsed, total, fraction: elapsed / total }
}

/** Prognose voor één potje. `minDays` = vanaf hoeveel dagen we durven te projecteren. */
export function forecastPotje(b: FamilyBudget, now: Date, startDay = 1, minDays = 4): PotjeForecast {
  const { start, end } = periodRangeOf(now, startDay)
  const endMs = end.getTime() + DAY - 1 // t/m het einde van de laatste dag
  let periodSpent = 0
  let count = 0
  for (const e of b.entries ?? []) {
    const t = new Date(e.at).getTime()
    if (!Number.isNaN(t) && t >= start.getTime() && t <= endMs) {
      periodSpent += e.amount || 0
      count += 1
    }
  }
  const { elapsed, fraction } = periodProgress(now, startDay)
  const projected = fraction > 0 ? periodSpent / fraction : periodSpent
  const limit = b.limit || 0
  const surplus = limit - projected
  let status: PotjeStatus = 'op-koers'
  if (limit > 0) {
    if (projected > limit * 1.03) status = 'over'
    else if (projected > limit * 0.9) status = 'krap'
  }
  return {
    id: b.id,
    name: b.name,
    member: b.member,
    color: b.color,
    limit,
    periodSpent,
    count,
    projected,
    surplus,
    status,
    hasData: count > 0 && elapsed >= minDays,
  }
}

/** Prognose voor alle potjes (alleen potjes mét een maandbudget zijn zinvol). */
export function forecastPotjes(budgets: FamilyBudget[], now: Date, startDay = 1, minDays = 4): PotjeForecast[] {
  return budgets.filter((b) => (b.limit || 0) > 0).map((b) => forecastPotje(b, now, startDay, minDays))
}

export interface ShiftSuggestion {
  from: PotjeForecast
  to: PotjeForecast
  amount: number
}

/**
 * Schuif-advies: als een potje dreigt te overschrijden én een ander potje ruim
 * binnen budget blijft, stel voor om geld te verschuiven. Bedrag = het kleinste
 * van het tekort en de helft van het overschot van de donor, afgerond op €5.
 */
export function suggestShift(forecasts: PotjeForecast[]): ShiftSuggestion | null {
  const usable = forecasts.filter((f) => f.hasData && f.limit > 0)
  const over = usable.filter((f) => f.status === 'over').sort((a, b) => a.surplus - b.surplus)[0]
  const donor = usable
    .filter((f) => f.status === 'op-koers' && f.surplus > 0)
    .sort((a, b) => b.surplus - a.surplus)[0]
  if (!over || !donor || over.id === donor.id) return null
  const need = -over.surplus // > 0
  const give = donor.surplus / 2
  const amount = Math.round(Math.min(need, give) / 5) * 5
  if (amount < 5) return null
  return { from: donor, to: over, amount }
}
