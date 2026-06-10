import { prisma } from '@/lib/db'
import { requireModule, notFound } from '@/lib/guard'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.amount !== undefined) data.amount = Number(body.amount)
  if (body.category !== undefined) data.category = body.category ? String(body.category) : 'Overig'
  if (body.dueDay !== undefined) data.dueDay = body.dueDay ? Number(body.dueDay) : null
  if (body.isSubscription !== undefined) data.isSubscription = Boolean(body.isSubscription)
  if (body.subscriptionInterval !== undefined)
    data.subscriptionInterval = body.subscriptionInterval ? String(body.subscriptionInterval) : null
  if (body.subscriptionCancelable !== undefined) data.subscriptionCancelable = Boolean(body.subscriptionCancelable)
  if (body.subscriptionEndDate !== undefined)
    data.subscriptionEndDate = body.subscriptionEndDate ? String(body.subscriptionEndDate) : null
  const result = await prisma.fixedCost.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const cost = await prisma.fixedCost.findUnique({ where: { id } })
  return Response.json(cost)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  await prisma.fixedCost.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
