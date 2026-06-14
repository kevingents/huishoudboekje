import { prisma } from '@/lib/db'
import { describeDate } from '@/lib/date'
import { requireHousehold, notFound } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)

  const existing = await prisma.outing.findFirst({ where: { id, householdId: hid } })
  if (!existing) return notFound()

  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const key of ['title', 'description', 'category', 'cost', 'area', 'status'] as const) {
    if (body[key] !== undefined) data[key] = body[key] === null ? null : String(body[key])
  }

  // Plannen/ontplannen: een datum koppelt het uitje aan een agenda-afspraak.
  if (body.date !== undefined) {
    const date = body.date ? String(body.date) : ''
    const title = `Uitje: ${data.title ?? existing.title}`
    if (date) {
      data.date = date
      if (!data.status) data.status = 'gepland'
      const parts = describeDate(date)
      if (existing.agendaEventId) {
        await prisma.agendaEvent.updateMany({
          where: { id: existing.agendaEventId, householdId: hid },
          data: { ...parts, title },
        })
      } else {
        const ev = await prisma.agendaEvent.create({
          data: { householdId: hid, ...parts, title, time: '', who: 'Gezin', accent: 'amber', source: 'manual', remindMinutes: 1440 },
        })
        data.agendaEventId = ev.id
      }
    } else {
      // Ontplannen: agenda-afspraak verwijderen.
      data.date = null
      if (existing.agendaEventId) {
        await prisma.agendaEvent.deleteMany({ where: { id: existing.agendaEventId, householdId: hid } })
        data.agendaEventId = null
      }
      if (!data.status) data.status = 'idee'
    }
  }

  await prisma.outing.update({ where: { id }, data })
  const outing = await prisma.outing.findUnique({ where: { id } })
  return Response.json(outing)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const existing = await prisma.outing.findFirst({ where: { id, householdId: hid } })
  if (existing?.agendaEventId) {
    await prisma.agendaEvent.deleteMany({ where: { id: existing.agendaEventId, householdId: hid } })
  }
  await prisma.outing.deleteMany({ where: { id, householdId: hid } })
  return new Response(null, { status: 204 })
}
