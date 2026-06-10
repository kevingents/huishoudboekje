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

  const saved = []
  for (const r of incoming) {
    const pattern = normalizePattern(r?.pattern)
    if (!pattern) continue
    const kind: RuleKind = RULE_KINDS.includes((r?.kind ?? 'expense') as RuleKind)
      ? (r!.kind as RuleKind)
      : 'expense'
    const category = String(r?.category ?? '').slice(0, 60)
    const existing = await prisma.merchantRule.findFirst({ where: { householdId: hid, pattern } })
    if (existing) {
      saved.push(await prisma.merchantRule.update({ where: { id: existing.id }, data: { category, kind } }))
    } else {
      saved.push(await prisma.merchantRule.create({ data: { householdId: hid, pattern, category, kind } }))
    }
  }
  return Response.json({ ok: true, rules: saved }, { status: 201 })
}
