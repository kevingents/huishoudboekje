import { prisma } from '@/lib/db'
import { requireHousehold } from '@/lib/guard'

export const dynamic = 'force-dynamic'

/** Markeer alle meldingen van dit huishouden als gelezen. */
export async function POST() {
  const hid = await requireHousehold()
  if (hid instanceof Response) return hid
  await prisma.notification.updateMany({ where: { householdId: hid, read: false }, data: { read: true } })
  return Response.json({ ok: true })
}
