import { prisma } from '@/lib/db'
import { describeDate } from '@/lib/date'

export const dynamic = 'force-dynamic'

export async function GET() {
  const events = await prisma.agendaEvent.findMany({
    orderBy: [{ dateKey: 'asc' }, { id: 'asc' }],
  })
  return Response.json(events)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body?.title || !body?.date) {
    return Response.json({ error: 'title en date zijn verplicht' }, { status: 400 })
  }
  const parts = describeDate(body.date)
  const event = await prisma.agendaEvent.create({
    data: {
      ...parts,
      title: String(body.title),
      time: String(body.time ?? ''),
      who: String(body.who ?? 'Gezin'),
      accent: String(body.accent ?? 'sky'),
      source: 'manual',
    },
  })
  return Response.json(event, { status: 201 })
}
