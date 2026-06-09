import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.target !== undefined) data.target = Number(body.target)
  // saved kan absoluut (saved) of relatief (deposit) worden meegegeven
  if (body.saved !== undefined) data.saved = Number(body.saved)
  if (body.deposit !== undefined) data.saved = { increment: Number(body.deposit) }
  const goal = await prisma.savingsGoal.update({ where: { id: Number(params.id) }, data })
  return Response.json(goal)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.savingsGoal.delete({ where: { id: Number(params.id) } })
  return new Response(null, { status: 204 })
}
