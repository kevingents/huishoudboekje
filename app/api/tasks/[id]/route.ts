import { prisma } from '@/lib/db'
import { requireHousehold, notFound, unauthorized } from '@/lib/guard'
import { getCurrentUser } from '@/lib/auth'
import { notify } from '@/lib/notify'
import { taskAssignees, serializeNames } from '@/lib/assignees'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUS_LABEL: Record<string, string> = {
  todo: 'geaccepteerd',
  geweigerd: 'geweigerd',
  ingeleverd: 'klaar gemeld',
  klaar: 'goedgekeurd',
}

/** Volgende deadline voor een herhalende taak (op basis van de vorige of vandaag). */
function nextDue(current: string | null, recurrence: string): string | null {
  const base = current && /^\d{4}-\d{2}-\d{2}/.test(current) ? new Date(current) : new Date()
  if (isNaN(base.getTime())) return null
  if (recurrence === 'dagelijks') base.setDate(base.getDate() + 1)
  else if (recurrence === 'wekelijks') base.setDate(base.getDate() + 7)
  else if (recurrence === 'maandelijks') base.setMonth(base.getMonth() + 1)
  else return null
  const p = (n: number) => String(n).padStart(2, '0')
  return `${base.getFullYear()}-${p(base.getMonth() + 1)}-${p(base.getDate())}`
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const actor = await getCurrentUser()
  if (!actor) return unauthorized()
  const id = Number(params.id)
  const body = await req.json()

  // De taak eerst laden, zodat we de toewijzing kennen vóór we iets wijzigen.
  const task = await prisma.task.findFirst({ where: { id, householdId: hid } })
  if (!task) return notFound()

  // Wie is de actor (gezinslid-naam) en is het een ouder (geen kind-rol)?
  let actorName = actor.name
  if (actor.memberId) {
    const m = await prisma.familyMember.findFirst({
      where: { id: actor.memberId, householdId: hid },
      select: { name: true },
    })
    if (m?.name) actorName = m.name
  }
  const isParent = actor.role !== 'child'
  const assignees = taskAssignees(task)
  const isAssignee = !!actorName && assignees.includes(actorName)
  const canAct = isParent || isAssignee || assignees.length === 0 // gezins-taak = iedereen

  const data: Record<string, unknown> = {}

  if (body.status !== undefined) {
    const target = String(body.status)
    if (target === 'klaar') {
      // Goedkeuren (= punten toekennen) mag alleen een ouder.
      if (!isParent) {
        return Response.json({ error: 'Alleen een ouder mag taken goedkeuren.' }, { status: 403 })
      }
      data.status = 'klaar'
      data.approvedBy = actorName
      data.approvedAt = new Date()
    } else if (target === 'ingeleverd' || target === 'todo' || target === 'geweigerd' || target === 'open') {
      if (!canAct) {
        return Response.json({ error: 'Je kunt deze taak niet wijzigen.' }, { status: 403 })
      }
      data.status = target
      // Afkeuren (terug naar te doen) wist de eerdere goedkeuring.
      if (target === 'todo') {
        data.approvedBy = null
        data.approvedAt = null
      }
    }
  }

  // Inhoudelijke bewerkingen (titel, toewijzing, punten…) alleen door een ouder.
  if (isParent) {
    if (body.title !== undefined) data.title = String(body.title)
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null
    if (body.assignees !== undefined || body.assignedTo !== undefined) {
      const names = Array.isArray(body.assignees)
        ? body.assignees.map((n: unknown) => String(n))
        : body.assignedTo
          ? [String(body.assignedTo)]
          : []
      const ser = serializeNames(names)
      data.assignees = ser
      data.assignedTo = ser ? (JSON.parse(ser) as string[])[0] : null
    }
    if (body.points !== undefined) data.points = Number(body.points) || 0
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? String(body.dueDate) : null
    if (body.recurrence !== undefined) data.recurrence = String(body.recurrence)
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: 'Geen wijziging toegestaan.' }, { status: 403 })
  }

  await prisma.task.update({ where: { id }, data })
  const updated = await prisma.task.findUnique({ where: { id } })

  // Herhalende taak goedgekeurd → meteen de volgende inplannen (zelfde toewijzing).
  if (updated && data.status === 'klaar' && task.recurrence && task.recurrence !== 'geen') {
    await prisma.task
      .create({
        data: {
          householdId: hid,
          title: task.title,
          description: task.description,
          assignedTo: task.assignedTo,
          assignees: task.assignees,
          points: task.points,
          dueDate: nextDue(task.dueDate, task.recurrence),
          recurrence: task.recurrence,
          // Zelfde flow als bij aanmaken: toegewezen → wacht op acceptatie.
          status: assignees.length ? 'open' : 'todo',
        },
      })
      .catch(() => {})
  }

  if (updated && data.status && STATUS_LABEL[String(data.status)]) {
    const label = STATUS_LABEL[String(data.status)]
    const forWhom = assignees.length ? ` (${assignees.join(', ')})` : ''
    // "Klaar gemeld" gaat naar de ouders (om goed te keuren); de rest naar elke
    // toegewezen persoon afzonderlijk.
    const targets = data.status === 'ingeleverd' ? [null] : assignees.length ? assignees : [null]
    await Promise.all(
      targets.map((t) =>
        notify({
          householdId: hid,
          type: 'system',
          title: `Taak ${label}`,
          body: `${task.title}${forWhom} is ${label}.`,
          targetMember: t,
          excludeUserId: actor.id,
        }).catch(() => {}),
      ),
    )
  }

  return Response.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const actor = await getCurrentUser()
  if (!actor) return unauthorized()
  // Taken verwijderen mag alleen een ouder (geen kind).
  if (actor.role === 'child') {
    return Response.json({ error: 'Alleen een ouder mag taken verwijderen.' }, { status: 403 })
  }
  await prisma.task.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
