import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

// Publieke (per ingelogd gezin leesbare) beloningen-catalogus. Beloningen zijn
// platform-breed (geen householdId); requireHousehold dient enkel als ingelogd-check.
export async function GET() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  const rewards = await prisma.reward.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  return Response.json(rewards)
}
