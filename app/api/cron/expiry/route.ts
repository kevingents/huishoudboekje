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
import { periodKeyOf, shiftPeriodKey, spendablePerMonth, isSpendingCategory } from '@/lib/budget'
import { reviewPeriod } from '@/lib/periodReview'

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
      await prisma.reminderLog.create({ data: { householdId, key } }) // claim de slot
    } catch {
      return false // al verstuurd (unieke index)
    }
    try {
      await send()
    } catch {
      // Verzenden faalde: claim weer vrijgeven zodat de volgende cron-run het
      // opnieuw probeert (anders zou de reminder die dag definitief verloren zijn).
      await prisma.reminderLog.deleteMany({ where: { householdId, key } }).catch(() => {})
      return false
    }
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

  // Nieuwe budgetperiode: als vandaag de startdag van een huishouden is (1 =
  // kalendermaand, of bijv. de 15e), één seintje met wat er te besteden is.
  // Reken in NL-tijd (niet UTC), zodat de startdag-match niet een dag verschuift.
  const nlDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now) // "2026-06-13"
  const nlDayOfMonth = Number(nlDateStr.slice(8, 10))
  const periodStartSettings = await prisma.setting.findMany({ where: { key: 'budgetPeriodStart' } })
  const startDayByHh = new Map<number, number>()
  for (const s of periodStartSettings) {
    let v = 1
    try {
      v = Math.min(28, Math.max(1, Math.floor(Number(JSON.parse(s.value))) || 1))
    } catch {
      v = 1
    }
    startDayByHh.set(s.householdId, v)
  }
  let periodNotified = 0
  for (const { id } of households) {
    const startDay = startDayByHh.get(id) ?? 1
    if (nlDayOfMonth !== startDay) continue // vandaag (NL) is niet de startdag

    // Terugblik op de zojuist afgesloten periode: hoeveel uitgegeven en wat over
    // (om te sparen). Zware queries alleen voor de huishoudens die vandaag wisselen.
    const [incomes, costs, subscriptions, loans, txns, spendingCats] = await Promise.all([
      prisma.income.findMany({ where: { householdId: id }, select: { amount: true, interval: true } }),
      prisma.fixedCost.findMany({
        where: { householdId: id },
        select: { amount: true, isSubscription: true, subscriptionInterval: true },
      }),
      prisma.subscription.findMany({ where: { householdId: id }, select: { amount: true, interval: true, status: true } }),
      prisma.loan.findMany({ where: { householdId: id }, select: { termAmount: true } }),
      prisma.transaction.findMany({ where: { householdId: id }, select: { category: true, amount: true, date: true } }),
      prisma.budgetCategory.findMany({ where: { householdId: id }, select: { name: true, limit: true } }),
    ])
    const spendable = spendablePerMonth({ incomes, costs, subscriptions, loans })
    const prevKey = shiftPeriodKey(periodKeyOf(nlDateStr, startDay) ?? '', -1)
    const review = reviewPeriod({
      transactions: txns,
      spendingCategories: spendingCats.filter((c) => isSpendingCategory(c.name)),
      spendable,
      periodKey: prevKey,
      periodStart: startDay,
    })
    if (review.spent <= 0 && spendable <= 0) continue // niks te melden

    const word = startDay > 1 ? 'periode' : 'maand'
    const body =
      review.surplus > 0
        ? `Vorige ${word}: €${Math.round(review.spent)} van €${Math.round(spendable)} uitgegeven. Je hield €${Math.round(review.surplus)} over — mooi om naar je spaarrekening over te maken.`
        : review.overspend > 0
          ? `Vorige ${word}: €${Math.round(review.spent)} uitgegeven — €${Math.round(review.overspend)} boven je budget van €${Math.round(spendable)}. Deze ${word} wat strakker?`
          : `Vorige ${word}: €${Math.round(review.spent)} van €${Math.round(spendable)} uitgegeven.`
    const sent = await once(id, `periodreview:${prevKey}`, () =>
      notify({ householdId: id, type: 'budget', title: `Terugblik vorige ${word}`, body }),
    )
    if (sent) periodNotified++
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
    periodNotified,
    icalSynced: synced,
    cleaned: { chats: chatDeleted.count, notifications: notifDeleted.count },
  })
}
