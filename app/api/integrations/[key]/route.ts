import { prisma } from '@/lib/db'
import { requireHousehold, notFound } from '@/lib/guard'

function parseConfig(config: string): Record<string, unknown> {
  try {
    return JSON.parse(config)
  } catch {
    return {}
  }
}

/** Werk status en/of config van één integratie van dit huishouden bij. */
export async function PATCH(req: Request, { params }: { params: { key: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = String(body.status)
  if (body.config !== undefined) data.config = JSON.stringify(body.config)
  const result = await prisma.integration.updateMany({ where: { householdId: hid, key: params.key }, data })
  if (result.count === 0) return notFound()
  const row = await prisma.integration.findFirst({ where: { householdId: hid, key: params.key } })
  return Response.json(row ? { ...row, config: parseConfig(row.config) } : null)
}
