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
  { key: 'pasjes', name: 'Pasjes', description: 'Bewaar klantenkaarten via foto of barcode en deel ze met je gezin.', minTier: 'plus' },
  { key: 'koelkast', name: 'Koelkast-scan', description: 'Maak een foto, de AI ziet wat je kunt koken.', minTier: 'compleet' },
  { key: 'gezinsspel', name: 'Gezinsspel', description: 'Taakjes, punten en beloningen voor het gezin.', minTier: 'compleet' },
  { key: 'gezinsmail', name: 'Gezinsmail', description: 'Stuur facturen, garanties en afspraken door; de AI zet ze automatisch op de juiste plek.', minTier: 'compleet' },
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

/** Jaarkorting bij een jaarabonnement. */
export const YEARLY_DISCOUNT = 0.1

/** Jaarprijs (12 maanden − 10% korting), afgerond op centen. */
export function yearlyPrice(monthly: number): number {
  return Math.round(monthly * 12 * (1 - YEARLY_DISCOUNT) * 100) / 100
}

/** Wat je krijgt per pakket (voor de marketing- en modules-pagina). */
export const TIER_FEATURES: Record<Tier, string[]> = {
  basis: [
    'Agenda met Google-, Outlook-, Apple- & Parro-koppeling',
    'Boodschappenlijst voor het hele gezin',
    'Recepten & weekmenu',
    'Documenten & garantiebewijzen met verloop-reminders',
    'Belangrijke contacten en adressen',
    'Live weer',
  ],
  plus: [
    'Alles uit Basis',
    'AI-assistent (chat & recepten)',
    'Budgetplanner met spaardoelen',
    'Gedeelde pasjes (klantenkaarten & barcodes)',
  ],
  compleet: [
    'Alles uit Plus',
    'Koelkast-scan: foto → wat kun je koken',
    'Gezinsspel: taken, punten & beloningen',
    'Gezinsmail: mail facturen & garanties, AI sorteert ze automatisch',
  ],
}
