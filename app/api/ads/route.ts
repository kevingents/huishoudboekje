import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

// Publieke (per ingelogd gezin leesbare) aanbiedingen. Platform-breed.
export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const ads = await prisma.ad.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    take: 12,
  })
  return Response.json(ads)
}
