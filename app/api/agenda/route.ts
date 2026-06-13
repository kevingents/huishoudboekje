import { prisma } from '@/lib/db'
import { describeDate } from '@/lib/date'
import { requireHousehold } from '@/lib/guard'
import { notify } from '@/lib/notify'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const own = await prisma.agendaEvent.findMany({
    where: { householdId: hid },
    orderBy: [{ dateKey: 'asc' }, { id: 'asc' }],
  })
  // Gedeelde afspraken van het gekoppelde co-ouder-huishouden meenemen (read-only).
  const hh = await prisma.household.findUnique({
    where: { id: hid },
    select: { coParentHouseholdId: true },
  })
  let shared: typeof own = []
  if (hh?.coParentHouseholdId) {
    const ext = await prisma.agendaEvent.findMany({
      where: { householdId: hh.coParentHouseholdId, coShared: true },
    })
    shared = ext.map((e) => ({ ...e, source: 'coparent' }))
  }
  const all = [...own, ...shared].sort((a, b) =>
    a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : a.id - b.id,
  )
  return Response.json(all)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  if (!body?.title || !body?.date) {
    return Response.json({ error: 'title en date zijn verplicht' }, { status: 400 })
  }
  const parts = describeDate(body.date)
  const event = await prisma.agendaEvent.create({
    data: {
      householdId: hid,
      ...parts,
      title: String(body.title),
      time: String(body.time ?? ''),
      who: String(body.who ?? 'Gezin'),
      accent: String(body.accent ?? 'sky'),
      source: 'manual',
      coShared: Boolean(body.coShared),
      remindDays:
        body.remindDays === null || body.remindDays === undefined
          ? null
          : Math.max(0, Math.min(30, Math.floor(Number(body.remindDays)) || 0)),
    },
  })

  // Iedereen in het huishouden een melding geven (in-app, en e-mail als dat
  // aanstaat in de notificatie-voorkeuren).
  await notify({
    householdId: hid,
    type: 'agenda',
    title: 'Nieuwe afspraak',
    body: `${event.title} op ${event.weekday} ${event.day} ${event.month}${event.time ? ` om ${event.time}` : ''} — voor ${event.who}.`,
    targetMember: event.who && event.who !== 'Gezin' ? event.who : null,
  }).catch(() => {})

  return Response.json(event, { status: 201 })
}
