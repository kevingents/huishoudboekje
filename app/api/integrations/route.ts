import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

function parseConfig(config: string): Record<string, unknown> {
  try {
    return JSON.parse(config)
  } catch {
    return {}
  }
}

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const rows = await prisma.integration.findMany({ where: { householdId: hid }, orderBy: { key: 'asc' } })
  // AI/Mollie gelden als 'connected' zodra de bijbehorende env-key is gezet.
  const aiHasKey = Boolean(process.env.ANTHROPIC_API_KEY)
  const mollieHasKey = Boolean(process.env.MOLLIE_API_KEY)
  const result = rows.map((row) => {
    let status = row.status
    if (row.key === 'ai' && aiHasKey) status = 'connected'
    if (row.key === 'mollie' && mollieHasKey) status = 'connected'
    return { ...row, status, config: parseConfig(row.config) }
  })
  return Response.json(result)
}
