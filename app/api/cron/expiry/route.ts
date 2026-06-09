import { prisma } from '@/lib/db'
import { notify } from '@/lib/notify'
import { syncHouseholdIcal } from '@/lib/icalSync'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Dagen tot een yyyy-mm-dd-datum (in UTC, hele dagen). */
function daysUntil(iso: string): number | null {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const target = Date.UTC(y, m - 1, d)
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((target - today) / 86_400_000)
}

// Reminder op vaste drempels, zodat het niet dagelijks spamt.
const THRESHOLDS = new Set([30, 14, 7, 1, 0])

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 })
  }

  const docs = await prisma.document.findMany({ where: { expiresAt: { not: null } } })
  let notified = 0
  for (const doc of docs) {
    if (!doc.expiresAt) continue
    const d = daysUntil(doc.expiresAt)
    if (d === null || !THRESHOLDS.has(d)) continue
    const when = d === 0 ? 'verloopt vandaag' : `verloopt over ${d} ${d === 1 ? 'dag' : 'dagen'}`
    await notify({
      householdId: doc.householdId,
      type: 'system',
      title: `Document ${when}`,
      body: `${doc.title}${doc.owner ? ` (${doc.owner})` : ''} ${when}. Vraag op tijd een nieuwe aan.`,
    }).catch(() => {})
    notified++
  }

  // Dagelijks de gekoppelde agenda's (Google/Outlook/Apple/Parro via iCal)
  // verversen, zodat nieuwe en terugkerende afspraken vanzelf binnenkomen.
  const icalHouseholds = await prisma.integration.findMany({
    where: { key: 'ical', status: 'connected' },
    select: { householdId: true },
  })
  let synced = 0
  for (const { householdId } of icalHouseholds) {
    try {
      await syncHouseholdIcal(householdId)
      synced++
    } catch {
      /* sync best-effort */
    }
  }

  // Bewaartermijnen (AVG-dataminimalisatie): ruim oude data op die niet meer nodig is.
  const day = 24 * 60 * 60 * 1000
  const cutoffChat = new Date(Date.now() - 365 * day) // AI-chats > 12 maanden
  const cutoffNotif = new Date(Date.now() - 90 * day) // gelezen meldingen > 3 maanden
  const [chatDeleted, notifDeleted] = await Promise.all([
    prisma.chatMessage.deleteMany({ where: { createdAt: { lt: cutoffChat } } }),
    prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: cutoffNotif } } }),
  ])

  return Response.json({
    ok: true,
    checked: docs.length,
    notified,
    icalSynced: synced,
    cleaned: { chats: chatDeleted.count, notifications: notifDeleted.count },
  })
}
