import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { householdId: hid }, orderBy: { id: 'desc' }, take: 30 }),
    prisma.notification.count({ where: { householdId: hid, read: false } }),
  ])
  return Response.json({ items, unread })
}
