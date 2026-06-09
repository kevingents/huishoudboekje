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
