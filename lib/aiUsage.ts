import { prisma } from './db'
import { normalizeTier, type Tier } from './modules'

/**
 * Zachte maandlimiet op AI-aanroepen per huishouden. Beschermt de unit-economics
 * tegen misbruik/uitschieters (vooral foto-scans) zonder normaal gebruik te raken.
 * Ruim bemeten; te overrulen met env AI_MONTHLY_LIMIT.
 */
const LIMITS: Record<Tier, number> = { basis: 0, plus: 200, compleet: 400 }

function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export function aiLimitFor(tier: string | null | undefined): number {
  const env = Number(process.env.AI_MONTHLY_LIMIT)
  if (Number.isFinite(env) && env > 0) return env
  return LIMITS[normalizeTier(tier)]
}

/**
 * Verbruik 1 AI-credit voor dit huishouden in de lopende maand (atomair via
 * upsert+increment). `ok=false` als de maandlimiet bereikt is — roep de AI dan niet aan.
 */
export async function consumeAiCredit(
  householdId: number,
): Promise<{ ok: boolean; used: number; limit: number }> {
  const hh = await prisma.household.findUnique({ where: { id: householdId }, select: { tier: true } })
  const limit = aiLimitFor(hh?.tier)
  const period = currentPeriod()
  const row = await prisma.aiUsage.upsert({
    where: { householdId_period: { householdId, period } },
    create: { householdId, period, count: 1 },
    update: { count: { increment: 1 } },
  })
  return { ok: row.count <= limit, used: row.count, limit }
}

/** Standaard 429-antwoord wanneer de AI-maandlimiet is bereikt. */
export function aiLimitResponse(): Response {
  return Response.json(
    { error: 'Je hebt het AI-maandmaximum van je pakket bereikt. Volgende maand weer beschikbaar, of upgrade je pakket.' },
    { status: 429 },
  )
}
