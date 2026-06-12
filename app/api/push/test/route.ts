import { getCurrentUser } from '@/lib/auth'
import { sendPushToUsers } from '@/lib/push'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Stuurt een testmelding naar de pushabonnementen van de ingelogde gebruiker,
 *  zodat je meteen kunt controleren of push werkt (VAPID-keys + abonnement). */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return Response.json(
      { error: 'Push is nog niet geconfigureerd (VAPID-keys ontbreken op de server).' },
      { status: 503 },
    )
  }
  const count = await prisma.pushSubscription.count({ where: { userId: user.id } })
  if (count === 0) {
    return Response.json(
      { error: 'Geen pushabonnement gevonden op dit account — zet meldingen eerst aan.' },
      { status: 404 },
    )
  }

  await sendPushToUsers([user.id], {
    title: 'Testmelding van Fam',
    body: 'Pushmeldingen werken — je bent klaar voor seintjes van het gezin.',
    url: '/instellingen',
  })
  return Response.json({ ok: true, subscriptions: count })
}
