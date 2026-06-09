import { prisma } from '@/lib/db'
import { requireModule } from '@/lib/guard'
import { ensureInboundToken, inboundAddress } from '@/lib/inbound'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Inbox + het inbound-adres van dit huishouden (premium: module 'gezinsmail'). */
export async function GET() {
  const hid = await requireModule('gezinsmail')
  if (hid instanceof Response) return hid
  const token = await ensureInboundToken(hid)
  const items = await prisma.mailItem.findMany({
    where: { householdId: hid },
    orderBy: { id: 'desc' },
    take: 100,
  })
  return Response.json({ address: inboundAddress(token), items })
}
