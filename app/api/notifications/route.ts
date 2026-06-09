import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ orderBy: { id: 'desc' }, take: 30 }),
    prisma.notification.count({ where: { read: false } }),
  ])
  return Response.json({ items, unread })
}
