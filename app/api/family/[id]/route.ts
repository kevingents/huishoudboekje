import { prisma } from '@/lib/db'
import { requireHousehold, notFound } from '@/lib/guard'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.initials !== undefined) data.initials = String(body.initials)
  if (body.color !== undefined) data.color = String(body.color)
  if (body.role !== undefined) data.role = body.role ? String(body.role) : null
  if (body.birthday !== undefined) data.birthday = body.birthday ? String(body.birthday) : null
  const result = await prisma.familyMember.updateMany({ where: { id, householdId: hid }, data })
  if (result.count === 0) return notFound()
  const member = await prisma.familyMember.findUnique({ where: { id } })
  return Response.json(member)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.familyMember.deleteMany({ where: { id: Number(params.id), householdId: hid } })
  return new Response(null, { status: 204 })
}
