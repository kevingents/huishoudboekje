import { prisma } from '@/lib/db'
import { requireModule } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUSES = ['nieuw', 'verwerkt', 'genegeerd']

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('gezinsmail')
  if (hid instanceof Response) return hid
  const body = await req.json().catch(() => ({}))
  const status = String(body?.status ?? '')
  if (!STATUSES.includes(status)) {
    return Response.json({ error: 'ongeldige status' }, { status: 400 })
  }
  const res = await prisma.mailItem.updateMany({
    where: { id: Number(params.id), householdId: hid },
    data: { status },
  })
  if (res.count === 0) return Response.json({ error: 'niet gevonden' }, { status: 404 })
  const item = await prisma.mailItem.findFirst({ where: { id: Number(params.id), householdId: hid } })
  return Response.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('gezinsmail')
  if (hid instanceof Response) return hid
  await prisma.mailItem.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
