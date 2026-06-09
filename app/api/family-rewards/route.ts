import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const items = await prisma.familyReward.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(items)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  const title = String(body?.title ?? '').trim()
  if (!title) return Response.json({ error: 'title is verplicht' }, { status: 400 })
  const item = await prisma.familyReward.create({
    data: {
      householdId: hid,
      title,
      description: body?.description ? String(body.description) : null,
      cost: Number(body?.cost ?? 0) || 0,
    },
  })
  return Response.json(item, { status: 201 })
}
