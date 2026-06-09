import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.label !== undefined) data.label = String(body.label)
  if (body.category !== undefined) data.category = String(body.category)
  if (body.qty !== undefined) data.qty = body.qty ? String(body.qty) : null
  if (body.checked !== undefined) data.checked = Boolean(body.checked)
  const item = await prisma.shoppingItem.update({ where: { id }, data })
  return Response.json(item)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.shoppingItem.delete({ where: { id: Number(params.id) } })
  return new Response(null, { status: 204 })
}
