import { prisma } from '@/lib/db'
import { requireHousehold, notFound } from '@/lib/guard'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.label !== undefined) data.label = String(body.label)
  if (body.category !== undefined) data.category = String(body.category)
  if (body.qty !== undefined) data.qty = body.qty ? String(body.qty) : null
  if (body.checked !== undefined) data.checked = Boolean(body.checked)
  const result = await prisma.shoppingItem.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const item = await prisma.shoppingItem.findUnique({ where: { id } })
  return Response.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.shoppingItem.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
