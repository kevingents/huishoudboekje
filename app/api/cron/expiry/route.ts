import { prisma } from '@/lib/db'
import { notify } from '@/lib/notify'
import { syncHouseholdIcal } from '@/lib/icalSync'
import { daysUntil, reminderThresholds, expiryPhrase, expiryAction, isIdDocument } from '@/lib/documents'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    // Type-bewuste drempels: een paspoort/ID/rijbewijs seint al 6 maanden vooruit,
    // een garantie pas vlak van tevoren. Alleen op de exacte drempeldag melden.
    if (d === null || !reminderThresholds(doc.type).includes(d)) continue
    const phrase = expiryPhrase(d) // "verloopt over 6 maanden" / "… 3 weken" / "… vandaag"
    const action = expiryAction(doc.type)
    const owner = doc.owner ? ` van ${doc.owner}` : ''
    await notify({
      householdId: doc.householdId,
      type: 'system',
      title: isIdDocument(doc.type) ? `${doc.title} ${phrase}` : `Document ${phrase}`,
      body: `${doc.title}${owner} ${phrase}.${action ? ` ${action}` : ''}`,
      // Persoonlijk seintje aan de eigenaar; heeft die geen account (bijv. een
      // kind), dan vangt notify() het op naar de volwassenen van het huishouden.
      targetMember: doc.owner ?? null,
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
