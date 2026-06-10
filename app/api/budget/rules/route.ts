import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { RULE_KINDS, type RuleKind } from '@/lib/budget'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function normalizePattern(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const rules = await prisma.merchantRule.findMany({ where: { householdId: hid }, orderBy: { id: 'desc' } })
  return Response.json(rules)
}

/** Slaat één regel of een lijst regels op (onthouden). Bestaand pattern → bijwerken. */
export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json().catch(() => ({}))
  const incoming = (Array.isArray(body?.rules) ? body.rules : [body]) as Array<{
    pattern?: string
    kind?: string
    category?: string
  }>

  // Bestaande regels één keer ophalen → bestaande bijwerken, nieuwe in bulk maken.
  const existing = await prisma.merchantRule.findMany({ where: { householdId: hid } })
  const byPattern = new Map(existing.map((r) => [r.pattern, r.id]))
  const toCreate: { householdId: number; pattern: string; category: string; kind: string }[] = []
  let updated = 0
  for (const r of incoming) {
    const pattern = normalizePattern(r?.pattern)
    if (!pattern) continue
    const kind: RuleKind = RULE_KINDS.includes((r?.kind ?? 'expense') as RuleKind)
      ? (r!.kind as RuleKind)
      : 'expense'
    const category = String(r?.category ?? '').slice(0, 60)
    const id = byPattern.get(pattern)
    if (id) {
      await prisma.merchantRule.update({ where: { id }, data: { category, kind } })
      updated++
    } else if (!toCreate.some((c) => c.pattern === pattern)) {
      toCreate.push({ householdId: hid, pattern, category, kind })
    }
  }
  if (toCreate.length) await prisma.merchantRule.createMany({ data: toCreate })
  return Response.json({ ok: true, created: toCreate.length, updated }, { status: 201 })
}
