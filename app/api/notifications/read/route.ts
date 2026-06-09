import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/** Markeer alle meldingen als gelezen. */
export async function POST() {
  await prisma.notification.updateMany({ where: { read: false }, data: { read: true } })
  return Response.json({ ok: true })
}
