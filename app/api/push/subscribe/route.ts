import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const endpoint = String(body?.endpoint ?? '')
  const p256dh = String(body?.keys?.p256dh ?? '')
  const auth = String(body?.keys?.auth ?? '')
  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: 'Ongeldige push-subscription.' }, { status: 400 })
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh, auth },
    create: { userId: user.id, endpoint, p256dh, auth },
  })
  return Response.json({ ok: true })
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const endpoint = String(body?.endpoint ?? '')
  if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } })
  return new Response(null, { status: 204 })
}
