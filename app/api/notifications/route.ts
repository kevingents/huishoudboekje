import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })
  const hid = user.householdId

  // Ouders/owner zien alles; een kind ziet alleen algemene + op zichzelf gerichte meldingen.
  let where: Record<string, unknown> = { householdId: hid }
  if (user.role === 'child') {
    let memberName: string | null = null
    if (user.memberId) {
      const m = await prisma.familyMember.findUnique({ where: { id: user.memberId }, select: { name: true } })
      memberName = m?.name ?? null
    }
    where = memberName
      ? { householdId: hid, OR: [{ targetMember: null }, { targetMember: memberName }] }
      : { householdId: hid, targetMember: null }
  }

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { id: 'desc' }, take: 30 }),
    prisma.notification.count({ where: { ...where, read: false } }),
  ])
  return Response.json({ items, unread })
}
