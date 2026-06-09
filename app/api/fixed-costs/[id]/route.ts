import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.amount !== undefined) data.amount = Number(body.amount)
  if (body.dueDay !== undefined) data.dueDay = body.dueDay ? Number(body.dueDay) : null
  const cost = await prisma.fixedCost.update({ where: { id: Number(params.id) }, data })
  return Response.json(cost)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.fixedCost.delete({ where: { id: Number(params.id) } })
  return new Response(null, { status: 204 })
}
