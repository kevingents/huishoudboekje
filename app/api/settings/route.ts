import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

function parse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export async function GET() {
  const rows = await prisma.setting.findMany()
  const map: Record<string, unknown> = {}
  for (const row of rows) map[row.key] = parse(row.value)
  return Response.json(map)
}

/** Upsert één instelling: { key, value } (value mag elk JSON-type zijn). */
export async function PUT(req: Request) {
  const body = await req.json()
  if (!body?.key) {
    return Response.json({ error: 'key is verplicht' }, { status: 400 })
  }
  const value = JSON.stringify(body.value ?? null)
  const row = await prisma.setting.upsert({
    where: { key: String(body.key) },
    update: { value },
    create: { key: String(body.key), value },
  })
  return Response.json({ key: row.key, value: parse(row.value) })
}
