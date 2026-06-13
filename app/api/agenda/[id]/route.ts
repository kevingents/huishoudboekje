import { prisma } from '@/lib/db'
import { describeDate } from '@/lib/date'
import { requireHousehold, notFound } from '@/lib/guard'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.date) Object.assign(data, describeDate(body.date))
  for (const key of ['title', 'time', 'who', 'accent'] as const) {
    if (body[key] !== undefined) data[key] = String(body[key])
  }
  if (body.remindDays !== undefined) {
    data.remindDays =
      body.remindDays === null ? null : Math.max(0, Math.min(30, Math.floor(Number(body.remindDays)) || 0))
  }
  const result = await prisma.agendaEvent.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const event = await prisma.agendaEvent.findUnique({ where: { id } })
  return Response.json(event)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.agendaEvent.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
