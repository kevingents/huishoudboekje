import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  const ads = await prisma.ad.findMany({ orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] })
  return Response.json(ads)
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (admin instanceof Response) return admin
  const body = await req.json()
  const title = String(body?.title ?? '').trim()
  const sponsor = String(body?.sponsor ?? '').trim()
  if (!title || !sponsor) return Response.json({ error: 'sponsor en title zijn verplicht' }, { status: 400 })
  const ad = await prisma.ad.create({
    data: {
      sponsor,
      title,
      body: body?.body ? String(body.body) : null,
      imageUrl: body?.imageUrl ? String(body.imageUrl) : null,
      linkUrl: body?.linkUrl ? String(body.linkUrl) : null,
      active: body?.active !== false,
      sortOrder: Number(body?.sortOrder ?? 0),
    },
  })
  return Response.json(ad, { status: 201 })
}
