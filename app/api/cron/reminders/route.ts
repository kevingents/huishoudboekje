import { runDueAgendaReminders } from '@/lib/agendaReminders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Lichte, snelle cron voor tijd-gebonden agenda-herinneringen. Bedoeld om elke
 * paar minuten aangeroepen te worden (externe pinger, bijv. cron-job.org), zodat
 * "10 min / 1 uur van tevoren" precies genoeg afgaat. Doet bewust alleen de
 * herinneringen — niet het zware dagelijkse werk (zie /api/cron/expiry).
 *
 * Beveiligd met dezelfde CRON_SECRET als de dagelijkse cron. Ontdubbeling zit in
 * runDueAgendaReminders (once()), dus vaak aanroepen is veilig.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 })
  }
  const sent = await runDueAgendaReminders(Date.now())
  return Response.json({ ok: true, agendaNotified: sent })
}

export async function GET(req: Request) {
  return handle(req)
}

// Sommige pingers gebruiken POST; sta beide toe.
export async function POST(req: Request) {
  return handle(req)
}
