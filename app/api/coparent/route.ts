import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { signCoParentLink, verifyCoParentLink } from '@/lib/coparentlink'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })
  const hh = await prisma.household.findUnique({
    where: { id: user.householdId },
    select: { coParentHouseholdId: true },
  })
  let linkedName: string | null = null
  if (hh?.coParentHouseholdId) {
    const other = await prisma.household.findUnique({
      where: { id: hh.coParentHouseholdId },
      select: { name: true },
    })
    linkedName = other?.name ?? null
  }
  const token = await signCoParentLink(user.householdId, Date.now())
  const origin = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin
  const link = `${origin}/co-ouder?token=${encodeURIComponent(token)}`
  return Response.json({ linked: !!hh?.coParentHouseholdId, linkedName, link })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const payload = await verifyCoParentLink(String(body?.token ?? ''), Date.now())
  if (!payload) return Response.json({ error: 'Deze koppel-link is ongeldig of verlopen.' }, { status: 400 })
  const otherId = payload.householdId
  if (otherId === user.householdId) {
    return Response.json({ error: 'Je kunt niet aan je eigen huishouden koppelen.' }, { status: 400 })
  }
  const other = await prisma.household.findUnique({ where: { id: otherId }, select: { name: true } })
  if (!other) return Response.json({ error: 'Het andere huishouden bestaat niet meer.' }, { status: 400 })

  // Eventuele bestaande koppelingen losmaken, daarna A <-> B koppelen.
  await prisma.household.updateMany({
    where: { coParentHouseholdId: { in: [user.householdId, otherId] } },
    data: { coParentHouseholdId: null },
  })
  await prisma.household.update({ where: { id: user.householdId }, data: { coParentHouseholdId: otherId } })
  await prisma.household.update({ where: { id: otherId }, data: { coParentHouseholdId: user.householdId } })
  return Response.json({ ok: true, linkedName: other.name })
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })
  const hh = await prisma.household.findUnique({
    where: { id: user.householdId },
    select: { coParentHouseholdId: true },
  })
  if (hh?.coParentHouseholdId) {
    await prisma.household
      .update({ where: { id: hh.coParentHouseholdId }, data: { coParentHouseholdId: null } })
      .catch(() => {})
  }
  await prisma.household.update({ where: { id: user.householdId }, data: { coParentHouseholdId: null } })
  return new Response(null, { status: 204 })
}
