import { prisma } from '@/lib/db'
import { notify } from '@/lib/notify'
import { eventWho } from '@/lib/assignees'
import { syncHouseholdIcal } from '@/lib/icalSync'
import { daysUntil, reminderThresholds, expiryPhrase, expiryAction, isIdDocument } from '@/lib/documents'
import {
  bandFor,
  dueOccasionReminders,
  occasionMessage,
  dueBirthdayReminder,
  birthdayMessage,
  type OccasionConfig,
} from '@/lib/occasions'
import { periodKeyOf, shiftPeriodKey, spendablePerMonth, isSpendingCategory } from '@/lib/budget'
import { reviewPeriod } from '@/lib/periodReview'
import { generateOutings } from '@/lib/outings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // de zaterdagse AI-generatie kost tijd

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
      // Bij meerdere toegewezen personen: ieder apart herinneren (niet de join-naam,
      // die matcht geen gezinslid). Leeg = hele gezin.
      const names = eventWho(ev)
      const targets = names.length ? names : [null]
      await Promise.all(
        targets.map((t) =>
          notify({
            householdId: ev.householdId,
            type: 'agenda',
            title: `Herinnering: ${ev.title}`,
            body: `${ev.title} is ${when}${at} (${ev.weekday} ${ev.day} ${ev.month})${ev.who && ev.who !== 'Gezin' ? ` — voor ${ev.who}` : ''}.`,
            targetMember: t,
          }),
        ),
      )
    })
    if (sent) agendaNotified++
  }

  // Feestdagen & gelegenheden (Vaderdag, Moederdag, Sinterklaas, …): gelden voor
  // elk huishouden, met ruime aanlooptijd voor cadeaudagen.
  const households = await prisma.household.findMany({ select: { id: true } })
  // Per huishouden de eigen gelegenheden-config (verborgen standaarddagen + eigen dagen).
  const occSettings = await prisma.setting.findMany({ where: { key: 'occasions' } })
  const occByHh = new Map<number, OccasionConfig>()
  for (const s of occSettings) {
    try {
      occByHh.set(s.householdId, JSON.parse(s.value) as OccasionConfig)
    } catch {
      /* ongeldige config → standaard */
    }
  }
  let occasionNotified = 0
  for (const { id } of households) {
    for (const r of dueOccasionReminders(now, occByHh.get(id))) {
      const msg = occasionMessage(r)
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
  let potjesSaved = 0
  // Alleen de huishoudens waarvoor vandaag (NL) de startdag is; default = de 1e.
  const startToday = households.map((h) => h.id).filter((id) => (startDayByHh.get(id) ?? 1) === nlDayOfMonth)
  if (startToday.length > 0) {
    // Eén query per tabel voor álle relevante huishoudens (geen N+1 op de 1e).
    const inIds = { householdId: { in: startToday } }
    const [incomesAll, costsAll, subsAll, loansAll, txnsAll, catsAll, potjesAll] = await Promise.all([
      prisma.income.findMany({ where: inIds, select: { householdId: true, amount: true, interval: true } }),
      prisma.fixedCost.findMany({
        where: inIds,
        select: { householdId: true, amount: true, isSubscription: true, subscriptionInterval: true },
      }),
      prisma.subscription.findMany({ where: inIds, select: { householdId: true, amount: true, interval: true, status: true } }),
      prisma.loan.findMany({ where: inIds, select: { householdId: true, termAmount: true } }),
      prisma.transaction.findMany({ where: inIds, select: { householdId: true, category: true, amount: true, date: true, createdAt: true } }),
      prisma.budgetCategory.findMany({ where: inIds, select: { householdId: true, name: true, limit: true } }),
      prisma.familyBudget.findMany({ where: inIds, select: { id: true, householdId: true, savings: true } }),
    ])
    const group = <T extends { householdId: number }>(rows: T[]) => {
      const m = new Map<number, T[]>()
      for (const r of rows) {
        const arr = m.get(r.householdId)
        if (arr) arr.push(r)
        else m.set(r.householdId, [r])
      }
      return m
    }
    const incByHh = group(incomesAll)
    const costByHh = group(costsAll)
    const subByHh = group(subsAll)
    const loanByHh = group(loansAll)
    const txByHh = group(txnsAll)
    const catByHh = group(catsAll)
    const potByHh = group(potjesAll)

    for (const id of startToday) {
      const startDay = startDayByHh.get(id) ?? 1
      const prevKey = shiftPeriodKey(periodKeyOf(nlDateStr, startDay) ?? '', -1)

      // Spaarpotjes: incasseer het maandbedrag (savings) één keer per periode in
      // het lopende spaarsaldo. Claim + bijschrijven gebeuren in één transactie:
      // de unieke reminderLog-sleutel maakt het exact één keer per periode (geen
      // dubbeltelling bij een herhaalde cron-run), en faalt het bijschrijven, dan
      // rolt de claim mee terug zodat de volgende periode het opnieuw probeert
      // (in tegenstelling tot once(), waar een fout ná de claim een maand zou
      // kunnen kosten). Staat los van de terugblik hieronder, dus ook potjes
      // zonder uitgaven blijven netjes doorsparen.
      if (prevKey) {
        const potjes = (potByHh.get(id) ?? []).filter((p) => (p.savings || 0) > 0)
        for (const p of potjes) {
          try {
            await prisma.$transaction([
              prisma.reminderLog.create({ data: { householdId: id, key: `potjesaving:${prevKey}:${p.id}` } }),
              prisma.familyBudget.update({ where: { id: p.id }, data: { savedTotal: { increment: p.savings } } }),
            ])
            potjesSaved++
          } catch {
            // al bijgeschreven (unieke sleutel) of tijdelijke fout → volgende periode opnieuw
          }
        }
      }

      const spendable = spendablePerMonth({
        incomes: incByHh.get(id) ?? [],
        costs: costByHh.get(id) ?? [],
        subscriptions: subByHh.get(id) ?? [],
        loans: loanByHh.get(id) ?? [],
      })
      const review = reviewPeriod({
        transactions: txByHh.get(id) ?? [],
        spendingCategories: (catByHh.get(id) ?? []).filter((c) => isSpendingCategory(c.name)),
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
  }

  // Weekend-uitjes: elke zaterdag (NL) 10 verse AI-ideeën voor gezinnen die Uitjes
  // gebruiken (minstens één uitje toegevoegd). Best-effort + gededupliceerd per week.
  let outingsGenerated = 0
  const nlWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Amsterdam', weekday: 'short' }).format(now)
  if (process.env.ANTHROPIC_API_KEY && nlWeekday === 'Sat') {
    // Begrens het aantal huishoudens per run (AI-tijd/kosten); de rest valt onder
    // de week-dedup en komt een volgende keer aan bod.
    const engaged = (await prisma.outing.findMany({ distinct: ['householdId'], select: { householdId: true } })).slice(0, 40)
    for (const { householdId } of engaged) {
      const sent = await once(householdId, `weekenduitjes:${nlDateStr}`, async () => {
        const { created } = await generateOutings(householdId, 10)
        if (created > 0) {
          await notify({
            householdId,
            type: 'system',
            title: 'Nieuwe weekend-uitjes',
            body: `${created} verse ideeën om dit weekend met het gezin te doen staan klaar bij Uitjes.`,
          }).catch(() => {})
        }
      })
      if (sent) outingsGenerated++
    }
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
    potjesSaved,
    outingsGenerated,
    icalSynced: synced,
    cleaned: { chats: chatDeleted.count, notifications: notifDeleted.count },
  })
}
