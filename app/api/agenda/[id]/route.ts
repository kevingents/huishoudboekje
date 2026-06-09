import { prisma } from '@/lib/db'
import { describeDate } from '@/lib/date'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.date) Object.assign(data, describeDate(body.date))
  for (const key of ['title', 'time', 'who', 'accent'] as const) {
    if (body[key] !== undefined) data[key] = String(body[key])
  }
  const event = await prisma.agendaEvent.update({ where: { id }, data })
  return Response.json(event)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.agendaEvent.delete({ where: { id: Number(params.id) } })
  return new Response(null, { status: 204 })
}
