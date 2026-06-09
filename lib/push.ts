import webpush from 'web-push'
import { prisma } from './db'

let configured = false

function ensureConfigured(): boolean {
  if (configured) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:noreply@fam.app', pub, priv)
  configured = true
  return true
}

/** Stuurt een pushbericht naar de opgegeven gebruikers. Ruimt dode subscriptions op. */
export async function sendPushToUsers(
  userIds: number[],
  payload: { title: string; body?: string; url?: string },
): Promise<void> {
  if (!ensureConfigured() || userIds.length === 0) return
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } })
  if (subs.length === 0) return
  const data = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    url: payload.url ?? '/vandaag',
  })
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data)
      } catch (e) {
        const status =
          e && typeof e === 'object' && 'statusCode' in e ? (e as { statusCode?: number }).statusCode : undefined
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {})
        }
      }
    }),
  )
}
