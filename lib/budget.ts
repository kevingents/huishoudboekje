/** Zet een bedrag met willekeurig interval om naar een maandbedrag. */
export function monthlyEquivalent(amount: number, interval: string): number {
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
