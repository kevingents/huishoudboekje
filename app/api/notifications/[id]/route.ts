import { prisma } from '@/lib/db'
import { requireHousehold, notFound } from '@/lib/guard'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const result = await prisma.notification.updateMany({
    where: { id, householdId: hid },
    data: { read: Boolean(body?.read ?? true) },
  })
  if (result.count === 0) return notFound()
  const notification = await prisma.notification.findUnique({ where: { id } })
  return Response.json(notification)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.notification.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
