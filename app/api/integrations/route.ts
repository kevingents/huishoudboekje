import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

function parseConfig(config: string): Record<string, unknown> {
  try {
    return JSON.parse(config)
  } catch {
    return {}
  }
}

export async function GET() {
  const rows = await prisma.integration.findMany({ orderBy: { key: 'asc' } })
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
