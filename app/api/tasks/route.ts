import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'
import { getCurrentUser } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { serializeNames } from '@/lib/assignees'

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
  // Toewijzing kan een lijst zijn (meerdere personen) of het legacy enkele veld.
  const names: string[] = Array.isArray(body?.assignees)
    ? body.assignees.map((n: unknown) => String(n))
    : body?.assignedTo
      ? [String(body.assignedTo)]
      : []
  const assignees = serializeNames(names)
  const list: string[] = assignees ? (JSON.parse(assignees) as string[]) : []
  const assignedTo = list[0] ?? null
  const points = Number(body?.points ?? 0) || 0
  const task = await prisma.task.create({
    data: {
      householdId: hid,
      title,
      description: body?.description ? String(body.description) : null,
      assignedTo,
      assignees,
      points,
      dueDate: body?.dueDate ? String(body.dueDate) : null,
      recurrence: body?.recurrence ? String(body.recurrence) : 'geen',
      // Toegewezen taak wacht op acceptatie; een gezins-taak staat meteen op "te doen".
      status: list.length ? 'open' : 'todo',
    },
  })

  const actor = await getCurrentUser()
  const forWhom = list.length ? ` — voor ${list.join(', ')}` : ''
  // Elke toegewezen persoon krijgt een melding; bij een gezins-taak het hele gezin.
  if (list.length) {
    await Promise.all(
      list.map((name) =>
        notify({
          householdId: hid,
          type: 'system',
          title: 'Nieuwe taak',
          body: `${title}${forWhom}${points ? ` (${points} punten)` : ''}.`,
          targetMember: name,
          excludeUserId: actor?.id ?? null,
        }).catch(() => {}),
      ),
    )
  } else {
    await notify({
      householdId: hid,
      type: 'system',
      title: 'Nieuwe taak',
      body: `${title}${points ? ` (${points} punten)` : ''}.`,
      targetMember: null,
      excludeUserId: actor?.id ?? null,
    }).catch(() => {})
  }

  return Response.json(task, { status: 201 })
}
