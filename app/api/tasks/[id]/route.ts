import { prisma } from '@/lib/db'
import { requireHousehold, notFound } from '@/lib/guard'
import { notify } from '@/lib/notify'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STATUS_LABEL: Record<string, string> = {
  todo: 'geaccepteerd',
  geweigerd: 'geweigerd',
  klaar: 'afgerond',
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
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = String(body.status)
  if (body.title !== undefined) data.title = String(body.title)
  if (body.description !== undefined) data.description = body.description ? String(body.description) : null
  if (body.assignedTo !== undefined) data.assignedTo = body.assignedTo ? String(body.assignedTo) : null
  if (body.points !== undefined) data.points = Number(body.points) || 0
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? String(body.dueDate) : null
  if (body.recurrence !== undefined) data.recurrence = String(body.recurrence)

  const result = await prisma.task.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const task = await prisma.task.findUnique({ where: { id } })

  // Herhalende taak afgerond → meteen de volgende inplannen.
  if (task && String(body.status) === 'klaar' && task.recurrence && task.recurrence !== 'geen') {
    await prisma.task
      .create({
        data: {
          householdId: hid,
          title: task.title,
          description: task.description,
          assignedTo: task.assignedTo,
          points: task.points,
          dueDate: nextDue(task.dueDate, task.recurrence),
          recurrence: task.recurrence,
          status: 'todo',
        },
      })
      .catch(() => {})
  }

  if (task && body.status && STATUS_LABEL[String(body.status)]) {
    const label = STATUS_LABEL[String(body.status)]
    await notify({
      householdId: hid,
      type: 'system',
      title: `Taak ${label}`,
      body: `${task.title}${task.assignedTo ? ` (${task.assignedTo})` : ''} is ${label}.`,
      targetMember: task.assignedTo,
    }).catch(() => {})
  }

  return Response.json(task)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.task.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
