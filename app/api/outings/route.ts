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
  const outing = await prisma.outing.create({
    data: {
      householdId: hid,
      title,
      description: body?.description ? String(body.description) : null,
      category: body?.category ? String(body.category) : null,
      cost: body?.cost ? String(body.cost) : null,
      ageBand: body?.ageBand ? String(body.ageBand) : null,
      area: body?.area ? String(body.area) : null,
      status: 'idee',
      source: body?.source === 'osm' ? 'osm' : 'manual',
    },
  })
  return Response.json(outing, { status: 201 })
}
