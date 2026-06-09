import { prisma } from '@/lib/db'
import { requireHousehold, notFound } from '@/lib/guard'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.target !== undefined) data.target = Number(body.target)
  if (body.saved !== undefined) data.saved = Number(body.saved)
  if (body.deposit !== undefined) data.saved = { increment: Number(body.deposit) }
  const result = await prisma.savingsGoal.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const goal = await prisma.savingsGoal.findUnique({ where: { id } })
  return Response.json(goal)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.savingsGoal.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
