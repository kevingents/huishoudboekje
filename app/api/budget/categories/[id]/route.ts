import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.icon !== undefined) data.icon = String(body.icon)
  if (body.color !== undefined) data.color = String(body.color)
  if (body.spent !== undefined) data.spent = Number(body.spent)
  if (body.limit !== undefined) data.limit = Number(body.limit)
  const category = await prisma.budgetCategory.update({ where: { id }, data })
  return Response.json(category)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.budgetCategory.delete({ where: { id: Number(params.id) } })
  return new Response(null, { status: 204 })
}
