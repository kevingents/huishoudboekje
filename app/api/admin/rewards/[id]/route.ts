import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  const id = Number(params.id)
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.partner !== undefined) data.partner = String(body.partner)
  if (body.title !== undefined) data.title = String(body.title)
  if (body.description !== undefined) data.description = String(body.description)
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl ? String(body.imageUrl) : null
  if (body.conditions !== undefined) data.conditions = body.conditions ? String(body.conditions) : null
  if (body.category !== undefined) data.category = String(body.category)
  if (body.active !== undefined) data.active = Boolean(body.active)
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)
  const reward = await prisma.reward.update({ where: { id }, data })
  return Response.json(reward)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  await prisma.reward.delete({ where: { id: Number(params.id) } }).catch(() => {})
  return new Response(null, { status: 204 })
}
