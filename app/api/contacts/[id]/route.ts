import { prisma } from '@/lib/db'
import { requireHousehold, notFound } from '@/lib/guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.category !== undefined) data.category = String(body.category)
  if (body.phone !== undefined) data.phone = body.phone ? String(body.phone) : null
  if (body.address !== undefined) data.address = body.address ? String(body.address) : null
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null
  const result = await prisma.contact.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const contact = await prisma.contact.findUnique({ where: { id } })
  return Response.json(contact)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.contact.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
