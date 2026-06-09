import { prisma } from '@/lib/db'
import { requireHousehold, notFound } from '@/lib/guard'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.icon !== undefined) data.icon = String(body.icon)
  if (body.color !== undefined) data.color = String(body.color)
  if (body.spent !== undefined) data.spent = Number(body.spent)
  if (body.limit !== undefined) data.limit = Number(body.limit)
  const result = await prisma.budgetCategory.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const category = await prisma.budgetCategory.findUnique({ where: { id } })
  return Response.json(category)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.budgetCategory.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
