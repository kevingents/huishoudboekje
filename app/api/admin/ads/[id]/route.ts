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
  if (body.sponsor !== undefined) data.sponsor = String(body.sponsor)
  if (body.title !== undefined) data.title = String(body.title)
  if (body.body !== undefined) data.body = body.body ? String(body.body) : null
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl ? String(body.imageUrl) : null
  if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl ? String(body.linkUrl) : null
  if (body.active !== undefined) data.active = Boolean(body.active)
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)
  const ad = await prisma.ad.update({ where: { id }, data })
  return Response.json(ad)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  await prisma.ad.delete({ where: { id: Number(params.id) } }).catch(() => {})
  return new Response(null, { status: 204 })
}
