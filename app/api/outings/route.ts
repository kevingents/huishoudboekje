import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const outings = await prisma.outing.findMany({ where: { householdId: hid }, orderBy: { id: 'desc' } })
  return Response.json(outings)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json().catch(() => ({}))
  const title = String(body?.title ?? '').trim()
  if (!title) return Response.json({ error: 'title is verplicht' }, { status: 400 })
  const osmId = body?.osmId ? String(body.osmId) : null

  try {
    const outing = await prisma.outing.create({
      data: {
        householdId: hid,
        title,
        description: body?.description ? String(body.description) : null,
        category: body?.category ? String(body.category) : null,
        cost: body?.cost ? String(body.cost) : null,
        ageBand: body?.ageBand ? String(body.ageBand) : null,
        area: body?.area ? String(body.area) : null,
        osmId,
        status: 'idee',
        source: body?.source === 'osm' ? 'osm' : 'manual',
      },
    })
    return Response.json(outing, { status: 201 })
  } catch {
    // Unieke (householdId, osmId): deze plek staat er al — geef 'm idempotent terug.
    if (osmId) {
      const existing = await prisma.outing.findFirst({ where: { householdId: hid, osmId } })
      if (existing) return Response.json(existing, { status: 200 })
    }
    return Response.json({ error: 'Aanmaken mislukt' }, { status: 400 })
  }
}
