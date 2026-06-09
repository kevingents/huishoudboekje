import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  const rewards = await prisma.reward.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  return Response.json(rewards)
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  const body = await req.json()
  const title = String(body?.title ?? '').trim()
  const partner = String(body?.partner ?? '').trim()
  if (!title || !partner) {
    return Response.json({ error: 'partner en title zijn verplicht' }, { status: 400 })
  }
  const reward = await prisma.reward.create({
    data: {
      partner,
      title,
      description: String(body?.description ?? ''),
      imageUrl: body?.imageUrl ? String(body.imageUrl) : null,
      conditions: body?.conditions ? String(body.conditions) : null,
      category: String(body?.category ?? 'uitje'),
      active: body?.active !== false,
      sortOrder: Number(body?.sortOrder ?? 0),
    },
  })
  return Response.json(reward, { status: 201 })
}
