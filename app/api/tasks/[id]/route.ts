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

  const result = await prisma.task.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const task = await prisma.task.findUnique({ where: { id } })

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
