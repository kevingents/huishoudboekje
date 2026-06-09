import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const docs = await prisma.document.findMany({ where: { householdId: hid }, orderBy: { id: 'asc' } })
  return Response.json(docs)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  const title = String(body?.title ?? '').trim()
  if (!title) return Response.json({ error: 'title is verplicht' }, { status: 400 })
  const doc = await prisma.document.create({
    data: {
      householdId: hid,
      title,
      type: String(body?.type ?? 'garantie'),
      owner: body?.owner ? String(body.owner) : null,
      imageUrl: body?.imageUrl ? String(body.imageUrl) : null,
      expiresAt: body?.expiresAt ? String(body.expiresAt) : null,
      notes: body?.notes ? String(body.notes) : null,
    },
  })
  return Response.json(doc, { status: 201 })
}
