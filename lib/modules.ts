/* Pakketten (tiers) en betaalde modules. Gedeeld door client (gating-UI) en
   server (entitlement-guard). Een huishouden heeft één tier (Household.tier). */

export type Tier = 'basis' | 'plus' | 'compleet'

export const TIER_RANK: Record<Tier, number> = { basis: 0, plus: 1, compleet: 2 }

export interface TierInfo {
  key: Tier
  name: string
  /** Prijs per maand in euro's (0 = gratis). */
  price: number
  blurb: string
}

export const TIERS: TierInfo[] = [
  { key: 'basis', name: 'Basis', price: 0, blurb: 'Alles voor het dagelijkse gezinsleven.' },
  { key: 'plus', name: 'Plus', price: 3.99, blurb: 'Basis + AI-assistent en budgetplanner.' },
  { key: 'compleet', name: 'Compleet', price: 6.99, blurb: 'Alles, inclusief koelkast-scan en gezinsspel.' },
]

export interface ModuleInfo {
  key: string
  name: string
  description: string
  /** Laagste tier die deze module ontgrendelt. */
  minTier: Tier
}

export const MODULES: ModuleInfo[] = [
  { key: 'ai', name: 'AI Assistent', description: 'Chat met de gezins-AI en laat recepten genereren.', minTier: 'plus' },
  { key: 'budgetplanner', name: 'Budgetplanner', description: 'Spaardoelen, vaste lasten en maandprognose.', minTier: 'plus' },
  { key: 'koelkast', name: 'Koelkast-scan', description: 'Maak een foto, de AI ziet wat je kunt koken.', minTier: 'compleet' },
  { key: 'gezinsspel', name: 'Gezinsspel', description: 'Taakjes, punten en beloningen voor het gezin.', minTier: 'compleet' },
]

export function normalizeTier(tier: string | undefined | null): Tier {
  return tier === 'plus' || tier === 'compleet' ? tier : 'basis'
}

/** Heeft een huishouden met deze tier toegang tot de module? */
export function hasModule(tier: string | undefined | null, moduleKey: string): boolean {
  const mod = MODULES.find((m) => m.key === moduleKey)
  if (!mod) return true // onbekend = gratis/kern
  return TIER_RANK[normalizeTier(tier)] >= TIER_RANK[mod.minTier]
}

/** De modules met of ze actief zijn voor deze tier. */
export function modulesForTier(tier: string | undefined | null) {
  return MODULES.map((m) => ({ ...m, enabled: hasModule(tier, m.key) }))
}

export function tierInfo(tier: string | undefined | null): TierInfo {
  return TIERS.find((t) => t.key === normalizeTier(tier)) ?? TIERS[0]
}
