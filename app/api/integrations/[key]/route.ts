import { prisma } from '@/lib/db'

function parseConfig(config: string): Record<string, unknown> {
  try {
    return JSON.parse(config)
  } catch {
    return {}
  }
}

/** Werk status en/of config van één integratie bij. */
export async function PATCH(req: Request, { params }: { params: { key: string } }) {
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = String(body.status)
  if (body.config !== undefined) data.config = JSON.stringify(body.config)
  const row = await prisma.integration.update({ where: { key: params.key }, data })
  return Response.json({ ...row, config: parseConfig(row.config) })
}
