import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const household = await prisma.household.findUnique({
    where: { id: hid },
    select: { id: true, name: true, tier: true },
  })
  return Response.json(household)
}
