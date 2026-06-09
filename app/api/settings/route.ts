import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

function parse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const rows = await prisma.setting.findMany({ where: { householdId: hid } })
  const map: Record<string, unknown> = {}
  for (const row of rows) map[row.key] = parse(row.value)
  return Response.json(map)
}

/** Upsert één instelling voor dit huishouden: { key, value }. */
export async function PUT(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.key) {
    return Response.json({ error: 'key is verplicht' }, { status: 400 })
  }
  const value = JSON.stringify(body.value ?? null)
  const row = await prisma.setting.upsert({
    where: { householdId_key: { householdId: hid, key: String(body.key) } },
    update: { value },
    create: { householdId: hid, key: String(body.key), value },
  })
  return Response.json({ key: row.key, value: parse(row.value) })
}
