import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { notify } from '@/lib/notify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const tasks = await prisma.task.findMany({ where: { householdId: hid }, orderBy: { id: 'desc' } })
  return Response.json(tasks)
}

export async function POST(req: Request) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const body = await req.json()
  const title = String(body?.title ?? '').trim()
  if (!title) return Response.json({ error: 'title is verplicht' }, { status: 400 })
  const assignedTo = body?.assignedTo ? String(body.assignedTo) : null
  const points = Number(body?.points ?? 0) || 0
  const task = await prisma.task.create({
    data: {
      householdId: hid,
      title,
      description: body?.description ? String(body.description) : null,
      assignedTo,
      points,
      dueDate: body?.dueDate ? String(body.dueDate) : null,
      // Toegewezen taak wacht op acceptatie; een gezins-taak staat meteen op "te doen".
      status: assignedTo ? 'open' : 'todo',
    },
  })

  await notify({
    householdId: hid,
    type: 'system',
    title: 'Nieuwe taak',
    body: `${title}${assignedTo ? ` — voor ${assignedTo}` : ''}${points ? ` (${points} punten)` : ''}.`,
    targetMember: assignedTo,
  }).catch(() => {})

  return Response.json(task, { status: 201 })
}
