import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.label !== undefined) data.label = String(body.label)
  if (body.amount !== undefined) data.amount = Number(body.amount) || 0
  if (body.category !== undefined) data.category = String(body.category)
  if (body.interval !== undefined) data.interval = String(body.interval)
  await prisma.income.updateMany({ where: { id, householdId: hid }, data })
  const income = await prisma.income.findFirst({ where: { id, householdId: hid } })
  return Response.json(income)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.income.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
