import { prisma } from '@/lib/db'
import { describeDate } from '@/lib/date'
import { requireHousehold, notFound } from '@/lib/guard'
import { parseNames, serializeNames, displayNames } from '@/lib/assignees'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)

  const existing = await prisma.agendaEvent.findFirst({ where: { id, householdId: hid } })
  if (!existing) return notFound()
  // Afspraken van de andere ouder (coparent) horen bij een ander huishouden en
  // zijn read-only; die kun je hier niet bewerken.
  if (existing.source === 'coparent') {
    return Response.json({ error: 'Gedeelde afspraken van de andere ouder kun je niet bewerken.' }, { status: 403 })
  }

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.date) Object.assign(data, describeDate(body.date))
  for (const key of ['title', 'time', 'accent'] as const) {
    if (body[key] !== undefined) data[key] = String(body[key])
  }
  // "Voor wie": een lijst (whoList) heeft voorrang; anders het losse who-veld.
  if (body.whoList !== undefined) {
    const names = parseNames(body.whoList)
    data.whoList = serializeNames(names)
    data.who = names.length ? displayNames(names) : String(body.who ?? 'Gezin')
  } else if (body.who !== undefined) {
    data.who = String(body.who)
    data.whoList = null
  }
  if (body.coShared !== undefined) data.coShared = Boolean(body.coShared)
  if (body.remindDays !== undefined) {
    data.remindDays =
      body.remindDays === null ? null : Math.max(0, Math.min(30, Math.floor(Number(body.remindDays)) || 0))
  }
  // Bewerk je een gesynct (iCal) item, dan koppelen we het los: het wordt jouw
  // eigen afspraak (source 'manual') zodat de volgende sync je wijziging niet
  // overschrijft. De externalId blijft staan zodat de sync 'm niet dubbel toevoegt.
  if (existing.source === 'ical') data.source = 'manual'

  await prisma.agendaEvent.update({ where: { id }, data })
  const event = await prisma.agendaEvent.findUnique({ where: { id } })
  return Response.json(event)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)

  const existing = await prisma.agendaEvent.findFirst({ where: { id, householdId: hid } })
  if (!existing) return new Response(null, { status: 204 })
  if (existing.source === 'coparent') {
    return Response.json({ error: 'Gedeelde afspraken van de andere ouder kun je niet verwijderen.' }, { status: 403 })
  }
  // Verwijder je een (ooit) gesynct item, onthoud de externalId zodat het niet
  // bij de volgende iCal-sync terugkomt. Atomaire upsert: dubbele/gelijktijdige
  // verwijderingen botsen niet (unieke index), en dit gebeurt vóór de delete.
  if (existing.externalId) {
    await prisma.hiddenIcalEvent
      .create({ data: { householdId: hid, externalId: existing.externalId } })
      .catch(() => {}) // al verborgen → prima
  }
  await prisma.agendaEvent.deleteMany({ where: { id, householdId: hid } })
  return new Response(null, { status: 204 })
}
