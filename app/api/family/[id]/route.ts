import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name)
  if (body.initials !== undefined) data.initials = String(body.initials)
  if (body.color !== undefined) data.color = String(body.color)
  if (body.role !== undefined) data.role = body.role ? String(body.role) : null
  if (body.birthday !== undefined) data.birthday = body.birthday ? String(body.birthday) : null
  const member = await prisma.familyMember.update({ where: { id }, data })
  return Response.json(member)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.familyMember.delete({ where: { id: Number(params.id) } })
  return new Response(null, { status: 204 })
}
