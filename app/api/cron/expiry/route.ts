import { prisma } from '@/lib/db'
import { notify } from '@/lib/notify'
import { syncHouseholdIcal } from '@/lib/icalSync'
import { daysUntil, reminderThresholds, expiryPhrase, expiryAction, isIdDocument } from '@/lib/documents'
import {
  bandFor,
  dueOccasionReminders,
  occasionMessage,
  dueBirthdayReminder,
  birthdayMessage,
} from '@/lib/occasions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 })
  }
  const now = new Date()

  // Idempotentie: stuur een reminder (huishouden + key) maar één keer. We claimen
  // eerst de slot via een unieke insert; lukt dat niet, dan is 'ie al verstuurd.
  // Zo verliest een gemiste cron-dag de reminder niet en ontstaat er geen spam.
  const once = async (householdId: number, key: string, send: () => Promise<void>): Promise<boolean> => {
    try {
      await prisma.reminderLog.create({ data: { householdId, key } })
    } catch {
      return false
    }
    await send().catch(() => {})
    return true
  }

  const docs = await prisma.document.findMany({ where: { expiresAt: { not: null } } })
  let notified = 0
  for (const doc of docs) {
    if (!doc.expiresAt) continue
    const d = daysUntil(doc.expiresAt)
    if (d === null || d < 0) continue // verlopen documenten niet meer aanstippen
    // Type-bewuste drempels: een paspoort/ID/rijbewijs seint al 6 maanden vooruit,
    // een garantie pas vlak van tevoren. Band-gebaseerd zodat een gemiste cron-dag
    // de eerstvolgende dag alsnog vuurt (zie once()).
    const band = bandFor(reminderThresholds(doc.type), d)
    if (band === null) continue
    const sent = await once(doc.householdId, `doc:${doc.id}:${doc.expiresAt}:b${band}`, async () => {
      const phrase = expiryPhrase(d)
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
      })
    })
    if (sent) notified++
  }

  // Agenda-herinneringen: afspraken waar de gebruiker "herinner mij" heeft
  // aangevinkt. Seint op de gekozen aanlooptijd (remindDays vóór de afspraak),
  // gericht aan de betrokkene ('Gezin' → hele huishouden).
  const agendaEvents = await prisma.agendaEvent.findMany({ where: { remindDays: { not: null } } })
  let agendaNotified = 0
  for (const ev of agendaEvents) {
    if (ev.remindDays === null) continue
    const d = daysUntil(ev.dateKey)
    if (d === null || d < 0) continue // afspraak is geweest
    if (bandFor([ev.remindDays], d) === null) continue // nog te vroeg (d > remindDays)
    const sent = await once(ev.householdId, `agenda:${ev.id}:${ev.dateKey}:b${ev.remindDays}`, async () => {
      const when = d === 0 ? 'vandaag' : d === 1 ? 'morgen' : `over ${d} dagen`
      const at = ev.time ? ` om ${ev.time}` : ''
      await notify({
        householdId: ev.householdId,
        type: 'agenda',
        title: `Herinnering: ${ev.title}`,
        body: `${ev.title} is ${when}${at} (${ev.weekday} ${ev.day} ${ev.month})${ev.who && ev.who !== 'Gezin' ? ` — voor ${ev.who}` : ''}.`,
        targetMember: ev.who && ev.who !== 'Gezin' ? ev.who : null,
      })
    })
    if (sent) agendaNotified++
  }

  // Feestdagen & gelegenheden (Vaderdag, Moederdag, Sinterklaas, …): gelden voor
  // elk huishouden, met ruime aanlooptijd voor cadeaudagen.
  const households = await prisma.household.findMany({ select: { id: true } })
  const occReminders = dueOccasionReminders(now)
  let occasionNotified = 0
  for (const r of occReminders) {
    const msg = occasionMessage(r)
    for (const { id } of households) {
      const sent = await once(id, `occ:${r.name}:${r.year}:b${r.band}`, () =>
        notify({ householdId: id, type: 'gelegenheden', title: msg.title, body: msg.body }),
      )
      if (sent) occasionNotified++
    }
  }

  // Verjaardagen van gezinsleden (jaarlijks terugkerend; vrije tekst geparset).
  const membersWithBday = await prisma.familyMember.findMany({ where: { birthday: { not: null } } })
  let birthdayNotified = 0
  for (const m of membersWithBday) {
    if (!m.birthday) continue
    const r = dueBirthdayReminder(now, m.name, m.birthday)
    if (!r) continue
    const msg = birthdayMessage(r)
    const sent = await once(m.householdId, `bday:${m.id}:${r.year}:b${r.band}`, () =>
      notify({ householdId: m.householdId, type: 'gelegenheden', title: msg.title, body: msg.body }),
    )
    if (sent) birthdayNotified++
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
  const cutoffRemind = new Date(Date.now() - 400 * day) // reminder-dedup > ~13 maanden (na de jaarcyclus)
  const [chatDeleted, notifDeleted] = await Promise.all([
    prisma.chatMessage.deleteMany({ where: { createdAt: { lt: cutoffChat } } }),
    prisma.notification.deleteMany({ where: { read: true, createdAt: { lt: cutoffNotif } } }),
    prisma.reminderLog.deleteMany({ where: { createdAt: { lt: cutoffRemind } } }),
  ])

  return Response.json({
    ok: true,
    checked: docs.length,
    notified,
    agendaNotified,
    occasionNotified,
    birthdayNotified,
    icalSynced: synced,
    cleaned: { chats: chatDeleted.count, notifications: notifDeleted.count },
  })
}
