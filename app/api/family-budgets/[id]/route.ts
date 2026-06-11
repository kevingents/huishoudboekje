import { prisma } from '@/lib/db'
import { requireModule, notFound } from '@/lib/guard'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.limit !== undefined) data.limit = Number(body.limit)
  if (body.spent !== undefined) data.spent = Number(body.spent)
  if (body.spend !== undefined) data.spent = { increment: Number(body.spend) }
  if (body.member !== undefined) data.member = body.member ? String(body.member) : null
  if (body.color !== undefined) data.color = String(body.color)
  const result = await prisma.familyBudget.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const item = await prisma.familyBudget.findUnique({ where: { id } })
  return Response.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireModule('budgetplanner')
  if (hid instanceof Response) return hid
  await prisma.familyBudget.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
